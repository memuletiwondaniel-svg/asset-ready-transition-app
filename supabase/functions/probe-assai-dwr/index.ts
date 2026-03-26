import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: creds } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "assai")
      .limit(1)
      .maybeSingle();

    if (!creds) {
      return new Response(JSON.stringify({ success: false, error: "No Assai credentials" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = (creds.base_url || "").replace(/\/+$/, "");
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");
    const dbName = creds.db_name || "";

    const normalizedBase = baseUrl.replace(/\/AW[^/]+\/login\.aweb.*$/i, "").replace(/\/+$/, "");
    let resolvedBase: string;
    try { resolvedBase = new URL(normalizedBase).origin; } catch { resolvedBase = normalizedBase; }
    const resolvedDb = dbName || (() => { const m = baseUrl.match(/\/AW([^/]+?)(?:\/|$)/i); return m?.[1]?.toLowerCase() ?? ""; })();

    // Step 1: Login
    const loginResult = await loginAssai(resolvedBase, username, password, resolvedDb);
    if (!loginResult.success || !loginResult.cookies?.length) {
      return new Response(JSON.stringify({ success: false, step: "login", error: loginResult.error }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cookies = loginResult.cookies;
    const cookieHeader = cookies.join("; ");
    const awBase = `${resolvedBase}/AW${resolvedDb}`;
    const results: Record<string, any> = { login: "ok", probes: {} };

    // Step 2: Fetch DWRBean.js to discover available methods
    try {
      const dwrJsUrl = `${awBase}/dwr/interface/DWRBean.js`;
      const dwrJsResp = await fetch(dwrJsUrl, {
        headers: { Cookie: cookieHeader, Accept: "*/*" },
      });
      const dwrJs = await dwrJsResp.text();
      results.probes["DWRBean.js"] = {
        status: dwrJsResp.status,
        length: dwrJs.length,
        content: dwrJs.substring(0, 5000),
      };

      // Extract method names
      const methods = [...dwrJs.matchAll(/DWRBean\.(\w+)\s*=/g)].map(m => m[1]);
      results.dwr_methods = methods;
    } catch (e) {
      results.probes["DWRBean.js"] = { error: String(e) };
    }

    // Step 3: Check for other DWR interfaces
    const otherInterfaces = [
      "DocumentBean", "SearchBean", "GridBean", "TableBean",
      "ResultBean", "NavigationBean", "TreeBean", "MenuBean",
      "ProjectBean", "CabinetBean", "ExportBean", "ReportBean",
    ];

    for (const bean of otherInterfaces) {
      try {
        const url = `${awBase}/dwr/interface/${bean}.js`;
        const resp = await fetch(url, {
          headers: { Cookie: cookieHeader, Accept: "*/*" },
        });
        const text = await resp.text();
        if (resp.status === 200 && text.length > 100 && !text.includes("404")) {
          const methods = [...text.matchAll(new RegExp(`${bean}\\.(\\w+)\\s*=`, "g"))].map(m => m[1]);
          results.probes[`${bean}.js`] = {
            status: resp.status,
            length: text.length,
            methods,
            preview: text.substring(0, 2000),
          };
        } else {
          results.probes[`${bean}.js`] = { status: resp.status, exists: false };
        }
      } catch (e) {
        results.probes[`${bean}.js`] = { error: String(e) };
      }
    }

    // Step 4: Try a DWR call to get document data (common patterns)
    const dwrCalls = [
      { name: "getDocuments", method: "getDocuments", params: "" },
      { name: "search", method: "search", params: 'c0-param0=string:%25\n' },
      { name: "getGrid", method: "getGrid", params: "" },
      { name: "getTable", method: "getTable", params: "" },
      { name: "getResult", method: "getResult", params: "" },
    ];

    for (const call of dwrCalls) {
      try {
        const dwrUrl = `${awBase}/dwr/call/plaincall/DWRBean.${call.method}.dwr`;
        const body = [
          "callCount=1",
          "windowName=",
          "c0-scriptName=DWRBean",
          `c0-methodName=${call.method}`,
          "c0-id=0",
          call.params,
          "batchId=1",
          "instanceId=0",
          `page=${encodeURIComponent(`/AW${resolvedDb}/forward.aweb?page=root/body`)}`,
          `scriptSessionId=${Date.now()}`,
          "",
        ].join("\n");

        const resp = await fetch(dwrUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain", Cookie: cookieHeader },
          body,
          redirect: "manual",
        });
        const text = await resp.text();
        results.probes[`DWR_call_${call.name}`] = {
          status: resp.status,
          length: text.length,
          preview: text.substring(0, 2000),
        };
      } catch (e) {
        results.probes[`DWR_call_${call.name}`] = { error: String(e) };
      }
    }

    // Step 5: Fetch the main navigation/menu page to understand the frame structure
    const navUrls = [
      `${awBase}/forward.aweb?page=root`,
      `${awBase}/forward.aweb?page=root/menu`,
      `${awBase}/forward.aweb?page=root/body/result`,
      `${awBase}/search.aweb`,
      `${awBase}/result.aweb?documentNumber=%25`,
    ];

    for (const url of navUrls) {
      const key = url.replace(awBase, "");
      try {
        const resp = await fetch(url, {
          headers: { Cookie: cookieHeader, Accept: "text/html" },
          redirect: "follow",
        });
        const text = await resp.text();
        results.probes[key] = {
          status: resp.status,
          length: text.length,
          preview: text.substring(0, 2000),
        };
      } catch (e) {
        results.probes[key] = { error: String(e) };
      }
    }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
