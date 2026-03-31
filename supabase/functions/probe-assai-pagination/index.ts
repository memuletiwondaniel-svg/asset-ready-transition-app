import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateAssai, ASSAI_UA } from "../_shared/assai-auth.ts";
import { extractHiddenFields } from "../_shared/selma/search-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log: string[] = [];
  const L = (msg: string) => { console.log(msg); log.push(msg); };

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: creds } = await supabase.from("dms_sync_credentials")
      .select("base_url, username_encrypted, password_encrypted, db_name")
      .eq("dms_platform", "assai").single();
    if (!creds) return new Response(JSON.stringify({ error: "No creds" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const baseUrl = (creds.base_url || "https://eu.assaicloud.com").replace(/\/+$/, "");
    const dbName = creds.db_name || "eu578";
    const assaiBase = baseUrl + `/AW${dbName}`;
    let username = creds.username_encrypted || "";
    let password = creds.password_encrypted || "";
    try {
      const { isEncrypted, decrypt } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch (e) { L("Decrypt err: " + e); }

    const origin = baseUrl.match(/^(https?:\/\/[^/]+)/)?.[1] || baseUrl;
    const auth = await authenticateAssai(origin, username, password, dbName);
    if (!auth.success || !auth.cookies) return new Response(JSON.stringify({ error: "Auth failed" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const cookieHeader = auth.cookies;

    // label warmup
    await fetch(assaiBase + "/label.aweb?subclass_type=DES_DOC", {
      headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA }, redirect: "follow",
    }).then(r => r.text());

    // search.aweb GET - dump ALL form fields
    const searchResp = await fetch(assaiBase + "/search.aweb?subclass_type=DES_DOC", {
      headers: { Cookie: cookieHeader, Accept: "text/html", "User-Agent": ASSAI_UA }, redirect: "follow",
    });
    const searchHtml = await searchResp.text();
    
    // Extract ALL input fields (not just hidden)
    const allFields = extractHiddenFields(searchHtml);
    
    L("=== ALL FORM FIELDS ===");
    for (const f of allFields) {
      L(`  name="${f.name}" type="${f.type}" value="${f.value}"`);
    }
    
    // Also extract select elements
    const selectRegex = /<select[^>]*name=["']([^"']+)["'][^>]*>/gi;
    let selMatch;
    L("=== SELECT FIELDS ===");
    while ((selMatch = selectRegex.exec(searchHtml)) !== null) {
      L(`  select name="${selMatch[1]}"`);
    }

    // Look for any field containing "status" or "stat" in the HTML
    const statusFieldsInHtml = searchHtml.match(/name=["'][^"']*stat[^"']*["']/gi) || [];
    L("=== Fields containing 'stat' ===");
    for (const sf of statusFieldsInHtml) L("  " + sf);

    // Also check for revision/rev fields
    const revFieldsInHtml = searchHtml.match(/name=["'][^"']*rev[^"']*["']/gi) || [];
    L("=== Fields containing 'rev' ===");
    for (const rf of revFieldsInHtml) L("  " + rf);

    // Extract a snippet around "status" in the HTML for context
    const statusIdx = searchHtml.toLowerCase().indexOf('status');
    if (statusIdx >= 0) {
      L("=== HTML around 'status' ===");
      L(searchHtml.substring(Math.max(0, statusIdx - 200), statusIdx + 200).replace(/\n/g, ' '));
    }

    // Now test: use the CORRECT field names for a type-code sweep
    // First get the status values from baseline results
    L("=== BASELINE RESULT (checking status values) ===");
    const fd = new URLSearchParams();
    for (const f of allFields.filter(f => f.type === "hidden" && f.name && f.value)) fd.set(f.name, f.value);
    for (const f of allFields.filter(f => f.type === "text" || f.type === "")) fd.set(f.name, "");
    fd.set("subclass_type", "DES_DOC");
    fd.set("number", "6529%");

    const resultResp = await fetch(assaiBase + "/result.aweb", {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
        Referer: assaiBase + "/search.aweb?subclass_type=DES_DOC",
        "User-Agent": ASSAI_UA,
      },
      body: fd.toString(),
      redirect: "follow",
    });
    const resultHtml = await resultResp.text();
    const match = resultHtml.match(/var\s+myCells\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function|\/\/|$)/m);
    if (match) {
      const cells = JSON.parse(match[1]);
      L("Baseline rows: " + cells.length);
      // Show unique status values from column 6
      const statuses = [...new Set(cells.map((r: any) => String(r[6] || '').replace(/<[^>]*>/g, '').trim()))];
      L("Unique statuses in results: " + JSON.stringify(statuses));
      // Show unique type codes from column 14
      const types = [...new Set(cells.map((r: any) => String(r[14] || '').replace(/<[^>]*>/g, '').trim()))];
      L("Unique type codes in results: " + JSON.stringify(types));
      // Show column headers if first row has them
      L("Row 0 all cols: " + JSON.stringify(cells[0].map((c: any, i: number) => `[${i}]=${String(c||'').replace(/<[^>]*>/g, '').trim().substring(0, 30)}`)));
    }

    // Log all form field names that the search engine uses
    L("=== FORM PARAMS SENT ===");
    for (const [k, v] of fd.entries()) {
      if (v) L(`  ${k}=${v.substring(0, 50)}`);
    }

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    L("FATAL: " + err.message);
    return new Response(JSON.stringify({ error: err.message, log }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
