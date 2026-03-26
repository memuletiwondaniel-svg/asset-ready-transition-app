import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractFormFields(html: string): Array<{ name: string; type: string; value: string; id: string }> {
  const fields: Array<{ name: string; type: string; value: string; id: string }> = [];
  const inputRegex = /<input[^>]*>/gi;
  let m;
  while ((m = inputRegex.exec(html)) !== null) {
    const tag = m[0];
    const name = tag.match(/name=["']([^"']+)["']/i)?.[1] ?? "";
    if (!name) continue;
    const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "text";
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? "";
    const id = tag.match(/id=["']([^"']+)["']/i)?.[1] ?? "";
    fields.push({ name, type, value, id });
  }
  const selectRegex = /<select[^>]*name=["']([^"']+)["'][^>]*>/gi;
  while ((m = selectRegex.exec(html)) !== null) {
    fields.push({ name: m[1], type: "select", value: "", id: "" });
  }
  return fields;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#\d+;/g, "").trim();
}

function parseTableRows(html: string, maxRows = 30): Array<{ row: number; cells: string[] }> {
  const rows: Array<{ row: number; cells: string[] }> = [];
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let ri = 0;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    ri++;
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
      cells.push(stripTags(cellMatch[1]));
    }
    if (cells.length >= 2 && ri <= maxRows) {
      rows.push({ row: ri, cells });
    }
  }
  return rows;
}

async function dwrCall(
  baseUrl: string, dbName: string, cookies: string,
  methodName: string, params: string[], page?: string
): Promise<string> {
  const paramLines = params.map((p, i) => `c0-param${i}=${p}`).join("\n");
  const body = [
    "callCount=1", "windowName=",
    "c0-scriptName=DWRBean", `c0-methodName=${methodName}`, "c0-id=0",
    paramLines, "batchId=0", "instanceId=0",
    `page=${encodeURIComponent(page || `/AW${dbName}/forward.aweb?page=root/body`)}`,
    `scriptSessionId=${Date.now()}`, "",
  ].join("\n");

  const resp = await fetch(`${baseUrl}/AW${dbName}/dwr/call/plaincall/DWRBean.${methodName}.dwr`, {
    method: "POST",
    headers: { "Content-Type": "text/plain", Cookie: cookies },
    body,
    redirect: "manual",
  });
  return await resp.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: creds } = await supabase.from("dms_sync_credentials").select("*")
      .eq("dms_platform", "assai").limit(1).maybeSingle();
    if (!creds) return new Response(JSON.stringify({ error: "No creds" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const baseUrl = (creds.base_url || "").replace(/\/+$/, "");
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");
    const dbName = creds.db_name || "";
    let resolvedBase: string;
    try { resolvedBase = new URL(baseUrl.replace(/\/AW[^/]+\/login\.aweb.*$/i, "").replace(/\/+$/, "")).origin; }
    catch { resolvedBase = baseUrl; }
    const resolvedDb = dbName || (() => { const m = baseUrl.match(/\/AW([^/]+?)(?:\/|$)/i); return m?.[1]?.toLowerCase() ?? ""; })();
    const awBase = `${resolvedBase}/AW${resolvedDb}`;

    // Login
    const loginResult = await loginAssai(resolvedBase, username, password, resolvedDb);
    if (!loginResult.success || !loginResult.cookies?.length) {
      return new Response(JSON.stringify({ step: "login", error: loginResult.error }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cookieHeader = loginResult.cookies.join("; ");
    const results: Record<string, any> = { login: "ok" };

    // Step 1: Switch project context first (from probe3 we know proj 53322 = BGC)
    console.log(`[probe5] Switching project context...`);
    const switchResult = await dwrCall(resolvedBase, resolvedDb, cookieHeader, "switchProject", ["string:53322"]);
    results.switchProject = switchResult.includes("_remoteHandleCallback") ? "ok" : switchResult.substring(0, 500);

    // Step 2: Navigate to main page first to establish session context
    console.log(`[probe5] Establishing session context via main page...`);
    const mainResp = await fetch(`${awBase}/forward.aweb?page=root/body`, {
      headers: { Cookie: cookieHeader, Accept: "text/html" },
      redirect: "follow",
    });
    await mainResp.text();
    results.main_page = { status: mainResp.status };

    // Step 3: Fetch the search form
    const searchUrl = `${awBase}/search.aweb?subclass_type=DES_DOC`;
    console.log(`[probe5] Fetching search form...`);
    const searchResp = await fetch(searchUrl, {
      headers: { Cookie: cookieHeader, Accept: "text/html" },
      redirect: "follow",
    });
    const searchHtml = await searchResp.text();
    const fields = extractFormFields(searchHtml);
    const hiddenFields = fields.filter(f => f.type === "hidden");
    const textFields = fields.filter(f => f.type === "text" || f.type === "");
    results.form_fields = {
      hidden: hiddenFields.map(f => ({ name: f.name, value: f.value?.substring(0, 100) })),
      text: textFields.map(f => ({ name: f.name, id: f.id })),
    };

    // Step 4: Try DWR-based search execution
    // The Assai JS typically calls something like doSearch or executeSearch via DWR
    console.log(`[probe5] Trying DWR search methods...`);
    const searchPage = `/AW${resolvedDb}/search.aweb?subclass_type=DES_DOC`;

    // Try executeSearch via DWR
    const dwrMethods = ["doSearch", "executeSearch", "search", "getSearchResults", "getResultData"];
    const dwrResults: Record<string, string> = {};
    for (const method of dwrMethods) {
      try {
        const r = await dwrCall(resolvedBase, resolvedDb, cookieHeader, method, [], searchPage);
        dwrResults[method] = r.substring(0, 500);
      } catch (e: any) {
        dwrResults[method] = `error: ${e.message}`;
      }
    }
    results.dwr_search_methods = dwrResults;

    // Step 5: POST directly to result.aweb with hidden fields from the form
    const attempts = [
      { label: "result.aweb_wildcard_star", url: `${awBase}/result.aweb`, wildcard: "*" },
      { label: "result.aweb_wildcard_percent", url: `${awBase}/result.aweb`, wildcard: "%" },
      { label: "result.aweb_empty", url: `${awBase}/result.aweb`, wildcard: "" },
      { label: "search.aweb_post_star", url: searchUrl, wildcard: "*" },
    ];

    for (const attempt of attempts) {
      console.log(`[probe5] Attempting: ${attempt.label}`);
      const formData = new URLSearchParams();

      // Add all hidden fields
      for (const f of hiddenFields) {
        if (f.name && f.value) formData.set(f.name, f.value);
      }

      // Set text fields to wildcard
      for (const f of textFields) {
        formData.set(f.name, attempt.wildcard);
      }

      // Ensure critical params
      formData.set("subclass_type", "DES_DOC");
      if (!formData.has("action")) formData.set("action", "search");

      const resp = await fetch(attempt.url, {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html",
          Referer: searchUrl,
        },
        body: formData.toString(),
        redirect: "follow",
      });
      const html = await resp.text();
      const rows = parseTableRows(html);

      results[attempt.label] = {
        status: resp.status,
        length: html.length,
        has_table: /<table/i.test(html),
        row_count: rows.length,
        first_5_rows: rows.slice(0, 5),
        title_match: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()?.substring(0, 200) || "",
        preview: html.substring(0, 2000),
      };
    }

    // Step 6: Try GET request to result.aweb (some systems auto-show results after search form)
    console.log(`[probe5] Trying GET result.aweb...`);
    const getResultResp = await fetch(`${awBase}/result.aweb?subclass_type=DES_DOC`, {
      headers: { Cookie: cookieHeader, Accept: "text/html" },
      redirect: "follow",
    });
    const getResultHtml = await getResultResp.text();
    const getRows = parseTableRows(getResultHtml);
    results.get_result = {
      status: getResultResp.status,
      length: getResultHtml.length,
      row_count: getRows.length,
      first_5_rows: getRows.slice(0, 5),
      preview: getResultHtml.substring(0, 2000),
    };

    // Step 7: Try the JavaScript-style URL that the Assai UI might use
    console.log(`[probe5] Trying forward.aweb result page...`);
    const forwardResultResp = await fetch(`${awBase}/forward.aweb?page=root/body/result&subclass_type=DES_DOC`, {
      headers: { Cookie: cookieHeader, Accept: "text/html" },
      redirect: "follow",
    });
    const forwardHtml = await forwardResultResp.text();
    const forwardRows = parseTableRows(forwardHtml);
    results.forward_result = {
      status: forwardResultResp.status,
      length: forwardHtml.length,
      row_count: forwardRows.length,
      first_5_rows: forwardRows.slice(0, 5),
      preview: forwardHtml.substring(0, 2000),
    };

    return new Response(JSON.stringify(results, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[probe5] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
