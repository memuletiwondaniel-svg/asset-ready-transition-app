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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load Assai credentials
    const { data: creds, error: credsError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "assai")
      .limit(1)
      .maybeSingle();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ success: false, error: "No Assai credentials configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = (creds.base_url || "").replace(/\/+$/, "");
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");
    const dbName = creds.db_name || "";

    // Normalize base URL
    const normalizedBase = baseUrl.replace(/\/AW[^/]+\/login\.aweb.*$/i, "").replace(/\/+$/, "");
    let resolvedBase: string;
    try {
      const u = new URL(normalizedBase);
      resolvedBase = `${u.origin}`;
    } catch {
      resolvedBase = normalizedBase;
    }
    const resolvedDb = dbName || (() => {
      const m = baseUrl.match(/\/AW([^/]+?)(?:\/|$)/i);
      return m?.[1]?.toLowerCase() ?? "";
    })();

    console.log(`[test-route2] Login: base=${resolvedBase}, db=${resolvedDb}, user=${username}`);

    // Step 1: Login
    const loginResult = await loginAssai(resolvedBase, username, password, resolvedDb);

    if (!loginResult.success || !loginResult.cookies?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "login",
          error: loginResult.error || "No session cookies returned",
          response_time_ms: loginResult.response_time_ms,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sessionCookies = loginResult.cookies;
    console.log(`[test-route2] Login OK. ${sessionCookies.length} cookies.`);

    // Step 2: Try multiple document listing URLs
    const resultUrls = [
      `${resolvedBase}/AW${resolvedDb}/result.aweb`,
      `${resolvedBase}/AW${resolvedDb}/forward.aweb?page=root/body&subclass_type=DES_DOC`,
      `${resolvedBase}/AW${resolvedDb}/forward.aweb?page=root/body/documentregister`,
    ];

    let html = "";
    let hitUrl = "";

    for (const url of resultUrls) {
      try {
        const resp = await fetch(url, {
          headers: { "Cookie": sessionCookies.join("; "), "Accept": "text/html" },
          redirect: "follow",
        });
        const text = await resp.text();
        console.log(`[test-route2] GET ${url} => status=${resp.status}, length=${text.length}`);
        if (resp.status === 200 && text.length > 2000 && !text.includes('action="login.aweb"')) {
          html = text;
          hitUrl = url;
          break;
        }
      } catch (e) {
        console.log(`[test-route2] GET ${url} failed: ${e}`);
      }
    }

    // Fallback: POST with wildcard search
    if (!html) {
      try {
        const postUrl = `${resolvedBase}/AW${resolvedDb}/result.aweb`;
        const postResp = await fetch(postUrl, {
          method: "POST",
          headers: {
            "Cookie": sessionCookies.join("; "),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "documentNumber=%&title=%",
          redirect: "follow",
        });
        html = await postResp.text();
        hitUrl = `POST ${postUrl}`;
        console.log(`[test-route2] POST result.aweb => status=${postResp.status}, length=${html.length}`);
      } catch (e) {
        console.log(`[test-route2] POST fallback failed: ${e}`);
      }
    }

    if (!html) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "fetch_document_page",
          error: "No document listing page returned from any URL",
          urls_tried: resultUrls,
          login_ok: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 3: Parse HTML table rows
    const stripTags = (s: string) =>
      s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

    const seen = new Set<string>();
    const documents: Array<{
      document_number: string;
      document_title: string;
      revision: string;
      status_code: string;
    }> = [];

    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let totalRows = 0;

    while ((rowMatch = rowPattern.exec(html)) !== null) {
      totalRows++;
      const cells: string[] = [];
      const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
        cells.push(stripTags(cellMatch[1]));
      }
      if (cells.length < 3) continue;

      const docNum = cells.find(
        (c) => /\d{3,}-[A-Z]/.test(c) || /^[A-Z]{2,}\d{3,}/.test(c),
      );
      if (!docNum || seen.has(docNum)) continue;
      seen.add(docNum);

      const i = cells.indexOf(docNum);
      documents.push({
        document_number: docNum,
        document_title: cells[i + 4] || cells[cells.length - 1] || "",
        revision: cells[i + 1] || "",
        status_code:
          cells.find((c) =>
            /^(AFU|IFR|IFA|IFC|AFC|IDC|AP|FOR|VOID)/i.test(c),
          ) ||
          cells[i + 3] ||
          "",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        login_ok: true,
        hit_url: hitUrl,
        html_length: html.length,
        total_table_rows: totalRows,
        parsed_document_count: documents.length,
        first_5_documents: documents.slice(0, 5),
        html_preview: html.substring(0, 3000),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[test-route2] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
