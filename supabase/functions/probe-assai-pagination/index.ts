import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateAssai, ASSAI_UA } from "../_shared/assai-auth.ts";
import { extractHiddenFields } from "../_shared/selma/search-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Probe v2: Tests whether a fresh search.aweb GET before EACH result.aweb POST
 * allows filtered and paginated searches to work.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const log: string[] = [];
  const L = (msg: string) => { console.log(msg); log.push(msg); };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creds } = await supabase
      .from("dms_sync_credentials")
      .select("base_url, username_encrypted, password_encrypted, db_name")
      .eq("dms_platform", "assai")
      .single();

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

    // Auth
    const origin = baseUrl.match(/^(https?:\/\/[^/]+)/)?.[1] || baseUrl;
    const auth = await authenticateAssai(origin, username, password, dbName);
    if (!auth.success || !auth.cookies) {
      return new Response(JSON.stringify({ error: "Auth failed", log }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const cookieHeader = auth.cookies;
    L("Auth OK");

    const searchUrl = assaiBase + "/search.aweb?subclass_type=DES_DOC";

    // Helper: full cycle = label + search.aweb GET + result.aweb POST
    const fullCycle = async (label: string, extraFields: Record<string, string>) => {
      // 1. label.aweb warmup
      await fetch(assaiBase + "/label.aweb?subclass_type=DES_DOC", {
        headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA },
        redirect: "follow",
      }).then(r => r.text());

      // 2. search.aweb GET
      const searchResp = await fetch(searchUrl, {
        headers: { Cookie: cookieHeader, Accept: "text/html", "User-Agent": ASSAI_UA },
        redirect: "follow",
      });
      const searchHtml = await searchResp.text();
      const fields = extractHiddenFields(searchHtml);
      const hidden = fields.filter(f => f.type === "hidden" && f.name && f.value);
      const text = fields.filter(f => f.type === "text" || f.type === "");

      // 3. result.aweb POST
      const fd = new URLSearchParams();
      for (const f of hidden) fd.set(f.name, f.value);
      for (const f of text) fd.set(f.name, "");
      fd.set("subclass_type", "DES_DOC");
      fd.set("number", "6529%");
      fd.set("proj_seq_nr", "");
      fd.set("selected_project_codes", "");
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
      let firstDocNums: string[] = [];
      if (match) {
        try {
          const cells = JSON.parse(match[1]);
          rowCount = cells.length;
          firstDocNums = cells.slice(0, 3).map((r: any) => String(r[3] || '').replace(/<[^>]*>/g, '').trim());
        } catch { rowCount = -1; }
      }
      const hasLogin = html.includes('type="password"');
      L(`${label}: rows=${rowCount}, login=${hasLogin}, samples=${firstDocNums.join(', ')}`);
      return { rowCount, firstDocNums };
    };

    // ========== TEST A: Unfiltered (baseline) ==========
    L("=== TEST A: Unfiltered baseline ===");
    const baseline = await fullCycle("Baseline", {});
    await new Promise(r => setTimeout(r, 300));

    // ========== TEST B: Filtered by status (fresh cycle each) ==========
    const statusResults: Record<string, number> = {};
    const allDocNums = new Set<string>();

    for (const sc of ["C01", "C02", "C04", "C06", "C07", "C09"]) {
      L(`=== TEST B: Status=${sc} (fresh cycle) ===`);
      const result = await fullCycle(`Status_${sc}`, { status_code: sc });
      statusResults[sc] = result.rowCount;
      // Collect doc numbers for uniqueness check
      result.firstDocNums.forEach(n => allDocNums.add(n));
      await new Promise(r => setTimeout(r, 300));
    }

    // ========== TEST C: Filtered by document_type (fresh cycle each) ==========
    L("=== TEST C: Type-code filter ===");
    const typeResults: Record<string, number> = {};
    for (const tc of ["2365", "C017", "C001"]) {
      const result = await fullCycle(`Type_${tc}`, { document_type: tc });
      typeResults[tc] = result.rowCount;
      await new Promise(r => setTimeout(r, 300));
    }

    // ========== TEST D: Combined status + type (fresh cycle) ==========
    L("=== TEST D: Combined filters ===");
    const combo = await fullCycle("Combo_C01_2365", { status_code: "C01", document_type: "2365" });

    // Summary
    L("=== SUMMARY ===");
    L("Baseline (unfiltered): " + baseline.rowCount + " rows");
    const statusTotal = Object.values(statusResults).reduce((a, b) => a + b, 0);
    L("Status splits: " + JSON.stringify(statusResults) + " = " + statusTotal + " total");
    L("Type splits: " + JSON.stringify(typeResults));
    L("Combo (C01+2365): " + combo.rowCount);
    L("Fresh-cycle-per-query approach works: " + (statusTotal > baseline.rowCount ? "YES — found " + statusTotal + " vs " + baseline.rowCount : "PARTIALLY"));

    return new Response(JSON.stringify({
      success: true,
      baseline_rows: baseline.rowCount,
      status_splits: statusResults,
      status_total: statusTotal,
      type_splits: typeResults,
      combo_rows: combo.rowCount,
      fresh_cycle_works: statusTotal > 0,
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
