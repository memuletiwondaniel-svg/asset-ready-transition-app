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
    L("Auth OK");

    const searchUrl = assaiBase + "/search.aweb?subclass_type=DES_DOC";

    // Full cycle helper
    const fullCycle = async (label: string, extraFields: Record<string, string>, numResults?: string) => {
      await fetch(assaiBase + "/label.aweb?subclass_type=DES_DOC", {
        headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA }, redirect: "follow",
      }).then(r => r.text());

      const searchResp = await fetch(searchUrl, {
        headers: { Cookie: cookieHeader, Accept: "text/html", "User-Agent": ASSAI_UA }, redirect: "follow",
      });
      const searchHtml = await searchResp.text();
      const fields = extractHiddenFields(searchHtml);
      const hidden = fields.filter(f => f.type === "hidden" && f.name && f.value);
      const text = fields.filter(f => f.type === "text" || f.type === "");

      const fd = new URLSearchParams();
      for (const f of hidden) fd.set(f.name, f.value);
      for (const f of text) fd.set(f.name, "");
      fd.set("subclass_type", "DES_DOC");
      fd.set("number", "6529%");
      if (numResults) fd.set("number_of_results", numResults);
      for (const [k, v] of Object.entries(extraFields)) fd.set(k, v);

      const resp = await fetch(assaiBase + "/result.aweb", {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html",
          Referer: searchUrl,
          "User-Agent": ASSAI_UA,
        },
        body: fd.toString(),
        redirect: "follow",
      });
      const html = await resp.text();
      const match = html.match(/var\s+myCells\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function|\/\/|$)/m);
      let rowCount = 0;
      let docNums: string[] = [];
      if (match) {
        try {
          const cells = JSON.parse(match[1]);
          rowCount = cells.length;
          docNums = cells.map((r: any) => String(r[3] || '').replace(/<[^>]*>/g, '').trim());
        } catch { rowCount = -1; }
      }
      L(`${label}: rows=${rowCount}`);
      return { rowCount, docNums };
    };

    // ========== TEST A: number_of_results=500 ==========
    L("=== TEST A: number_of_results=500 ===");
    const big = await fullCycle("BigPage", {}, "500");
    await new Promise(r => setTimeout(r, 300));

    // ========== TEST B: number_of_results=1000 ==========
    L("=== TEST B: number_of_results=1000 ===");
    const bigger = await fullCycle("BiggerPage", {}, "1000");
    await new Promise(r => setTimeout(r, 300));

    // ========== TEST C: Status filter with CORRECT native codes ==========
    const statusResults: Record<string, number> = {};
    let totalFromStatus = 0;
    const allDocNumsFromStatus = new Set<string>();

    for (const sc of ["AFU", "AFC", "CAN", "IFC", "IFA", "IFB", "IFI"]) {
      L(`=== TEST C: Status=${sc} (native code) ===`);
      const result = await fullCycle(`Status_${sc}`, { status_code: sc });
      statusResults[sc] = result.rowCount;
      totalFromStatus += result.rowCount;
      result.docNums.forEach(n => allDocNumsFromStatus.add(n));
      await new Promise(r => setTimeout(r, 300));
    }

    // ========== SUMMARY ==========
    L("=== SUMMARY ===");
    L("number_of_results=500: " + big.rowCount + " rows");
    L("number_of_results=1000: " + bigger.rowCount + " rows");
    L("Status splits (native codes): " + JSON.stringify(statusResults));
    L("Total from status splits: " + totalFromStatus);
    L("Unique docs from status splits: " + allDocNumsFromStatus.size);

    return new Response(JSON.stringify({
      success: true,
      big_page_500: big.rowCount,
      big_page_1000: bigger.rowCount,
      status_splits: statusResults,
      status_total: totalFromStatus,
      unique_from_status: allDocNumsFromStatus.size,
      log,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    L("FATAL: " + err.message);
    return new Response(JSON.stringify({ error: err.message, log }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
