import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateAssai, ASSAI_UA } from "../_shared/assai-auth.ts";
import { extractHiddenFields } from "../_shared/selma/search-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Diagnostic probe: replays the exact sync-assai-projects pagination pattern
 * against a specific project to verify start_row pagination and re-auth recovery.
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

    // Get credentials (same as sync-assai-projects)
    const { data: creds, error: credErr } = await supabase
      .from("dms_sync_credentials")
      .select("base_url, username_encrypted, password_encrypted, db_name")
      .eq("dms_platform", "assai")
      .single();

    if (credErr || !creds) {
      return new Response(JSON.stringify({ error: "No Assai credentials", log }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = (creds.base_url || "https://eu.assaicloud.com").replace(/\/+$/, "");
    const dbName = creds.db_name || "eu578";
    const assaiBase = baseUrl + `/AW${dbName}`;

    let username = creds.username_encrypted || "";
    let password = creds.password_encrypted || "";
    try {
      const { isEncrypted, decrypt } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch (e) {
      L("Decryption failed: " + e);
    }

    // ========== TEST 1: Authenticate ==========
    L("=== TEST 1: Initial Authentication ===");
    const authResult = await authenticateAssai(
      baseUrl.match(/^(https?:\/\/[^/]+)/)?.[1] || baseUrl,
      username, password, dbName
    );
    if (!authResult.success || !authResult.cookies) {
      return new Response(JSON.stringify({ error: "Auth failed", detail: authResult.error, log }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let cookieHeader = authResult.cookies;
    L("Auth OK, cookie length: " + cookieHeader.length);

    // ========== TEST 2: label.aweb warmup ==========
    L("=== TEST 2: label.aweb warmup ===");
    const labelResp = await fetch(assaiBase + "/label.aweb?subclass_type=DES_DOC", {
      headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA },
      redirect: "follow",
    });
    await labelResp.text();
    L("label.aweb status: " + labelResp.status);

    // ========== TEST 3: search.aweb GET (like sync-assai-projects) ==========
    L("=== TEST 3: search.aweb GET ===");
    const searchUrl = assaiBase + "/search.aweb?subclass_type=DES_DOC";
    const searchResp = await fetch(searchUrl, {
      headers: { Cookie: cookieHeader, Accept: "text/html", "User-Agent": ASSAI_UA },
      redirect: "follow",
    });
    const searchHtml = await searchResp.text();
    const allFields = extractHiddenFields(searchHtml);
    const hiddenFields = allFields.filter(f => f.type === "hidden" && f.name && f.value);
    const textFields = allFields.filter(f => f.type === "text" || f.type === "");
    L("search.aweb: status=" + searchResp.status + ", html=" + searchHtml.length + ", hidden=" + hiddenFields.length + ", text=" + textFields.length);

    // Helper: build form data (replicates sync-assai-projects exactly)
    const buildForm = (startRow?: number) => {
      const fd = new URLSearchParams();
      for (const f of hiddenFields) fd.set(f.name, f.value);
      for (const f of textFields) fd.set(f.name, "");
      fd.set("subclass_type", "DES_DOC");
      fd.set("number", "6529%"); // DP164 project pattern
      fd.set("proj_seq_nr", "");
      fd.set("selected_project_codes", "");
      if (startRow && startRow > 1) fd.set("start_row", String(startRow));
      return fd;
    };

    // Helper: POST to result.aweb and count myCells
    const postResult = async (label: string, startRow?: number) => {
      const fd = buildForm(startRow);
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
      let hasLoginPage = html.includes('type="password"') || html.includes('loginForm');
      let hasAppFrame = html.includes('applet:') || html.includes('.aweb');
      let totalMatch = html.match(/(?:showing|results?)\s+\d+\s*(?:[-–]|to)\s+\d+\s+of\s+(\d+)/i);
      let parsedTotal = totalMatch ? parseInt(totalMatch[1], 10) : null;
      if (match) {
        try { rowCount = JSON.parse(match[1]).length; } catch { rowCount = -1; }
      }
      L(`${label}: status=${resp.status}, html=${html.length}, myCells=${rowCount}, loginPage=${hasLoginPage}, parsedTotal=${parsedTotal}`);
      
      // Log first 500 chars if no myCells found
      if (rowCount === 0 && !hasLoginPage) {
        L(`${label} HTML preview: ${html.substring(0, 500).replace(/\n/g, ' ')}`);
      }
      
      return { rowCount, hasLoginPage, parsedTotal, html };
    };

    // ========== TEST 4: Page 1 (no start_row) ==========
    L("=== TEST 4: result.aweb Page 1 (sync-assai-projects style) ===");
    const page1 = await postResult("Page1", undefined);

    // ========== TEST 5: Page 2 (start_row=101) ==========
    L("=== TEST 5: result.aweb Page 2 (start_row=101) ===");
    await new Promise(r => setTimeout(r, 300));
    const page2 = await postResult("Page2", 101);

    // ========== TEST 6: Page 3 (start_row=201) ==========
    L("=== TEST 6: result.aweb Page 3 (start_row=201) ===");
    await new Promise(r => setTimeout(r, 300));
    const page3 = await postResult("Page3", 201);

    // ========== TEST 7: Re-auth then retry ==========
    L("=== TEST 7: Re-authenticate and retry ===");
    const authResult2 = await authenticateAssai(
      baseUrl.match(/^(https?:\/\/[^/]+)/)?.[1] || baseUrl,
      username, password, dbName
    );
    if (authResult2.success && authResult2.cookies) {
      cookieHeader = authResult2.cookies;
      L("Re-auth OK");

      // label.aweb warmup
      await fetch(assaiBase + "/label.aweb?subclass_type=DES_DOC", {
        headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA },
        redirect: "follow",
      }).then(r => r.text());
      L("Post-reauth label.aweb done");

      // search.aweb GET (must re-establish search context)
      const searchResp2 = await fetch(searchUrl, {
        headers: { Cookie: cookieHeader, Accept: "text/html", "User-Agent": ASSAI_UA },
        redirect: "follow",
      });
      const searchHtml2 = await searchResp2.text();
      const fields2 = extractHiddenFields(searchHtml2);
      const hidden2 = fields2.filter(f => f.type === "hidden" && f.name && f.value);
      const text2 = fields2.filter(f => f.type === "text" || f.type === "");
      L("Post-reauth search.aweb: hidden=" + hidden2.length + ", text=" + text2.length);

      // Update helpers to use new fields
      const buildForm2 = (startRow?: number) => {
        const fd = new URLSearchParams();
        for (const f of hidden2) fd.set(f.name, f.value);
        for (const f of text2) fd.set(f.name, "");
        fd.set("subclass_type", "DES_DOC");
        fd.set("number", "6529%");
        fd.set("proj_seq_nr", "");
        fd.set("selected_project_codes", "");
        if (startRow && startRow > 1) fd.set("start_row", String(startRow));
        return fd;
      };

      const postResult2 = async (label: string, startRow?: number) => {
        const fd = buildForm2(startRow);
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
        let hasLoginPage = html.includes('type="password"') || html.includes('loginForm');
        let totalMatch = html.match(/(?:showing|results?)\s+\d+\s*(?:[-–]|to)\s+\d+\s+of\s+(\d+)/i);
        let parsedTotal = totalMatch ? parseInt(totalMatch[1], 10) : null;
        if (match) {
          try { rowCount = JSON.parse(match[1]).length; } catch { rowCount = -1; }
        }
        L(`${label}: status=${resp.status}, html=${html.length}, myCells=${rowCount}, loginPage=${hasLoginPage}, parsedTotal=${parsedTotal}`);
        if (rowCount === 0 && !hasLoginPage) {
          L(`${label} HTML preview: ${html.substring(0, 500).replace(/\n/g, ' ')}`);
        }
        return { rowCount, hasLoginPage, parsedTotal };
      };

      L("=== TEST 7a: Post-reauth Page 1 ===");
      const reauth_page1 = await postResult2("ReauthPage1", undefined);

      L("=== TEST 7b: Post-reauth Page 2 ===");
      await new Promise(r => setTimeout(r, 300));
      const reauth_page2 = await postResult2("ReauthPage2", 101);
    } else {
      L("Re-auth FAILED: " + authResult2.error);
    }

    // ========== TEST 8: Filtered search (status_code) ==========
    L("=== TEST 8: Filtered search by status_code ===");
    // Re-init for filtered search
    await fetch(assaiBase + "/label.aweb?subclass_type=DES_DOC", {
      headers: { Cookie: cookieHeader, "User-Agent": ASSAI_UA },
      redirect: "follow",
    }).then(r => r.text());
    
    const searchResp3 = await fetch(searchUrl, {
      headers: { Cookie: cookieHeader, Accept: "text/html", "User-Agent": ASSAI_UA },
      redirect: "follow",
    });
    const searchHtml3 = await searchResp3.text();
    const fields3 = extractHiddenFields(searchHtml3);
    const hidden3 = fields3.filter(f => f.type === "hidden" && f.name && f.value);
    const text3 = fields3.filter(f => f.type === "text" || f.type === "");
    
    // Search with status_code filter
    for (const sc of ["C01", "C02", "C04"]) {
      const fd = new URLSearchParams();
      for (const f of hidden3) fd.set(f.name, f.value);
      for (const f of text3) fd.set(f.name, "");
      fd.set("subclass_type", "DES_DOC");
      fd.set("number", "6529%");
      fd.set("status_code", sc);
      fd.set("proj_seq_nr", "");
      fd.set("selected_project_codes", "");
      
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
      if (match) { try { rowCount = JSON.parse(match[1]).length; } catch { rowCount = -1; } }
      L(`Status=${sc}: myCells=${rowCount}, html=${html.length}`);
      
      await new Promise(r => setTimeout(r, 300));
    }

    // Summary
    L("=== SUMMARY ===");
    L("Page1: " + page1.rowCount + " rows, total=" + page1.parsedTotal);
    L("Page2: " + page2.rowCount + " rows");
    L("Page3: " + page3.rowCount + " rows");
    L("Pagination works: " + (page2.rowCount > 0 ? "YES" : "NO"));

    return new Response(JSON.stringify({
      success: true,
      pagination_works: page2.rowCount > 0,
      page1_rows: page1.rowCount,
      page1_total: page1.parsedTotal,
      page2_rows: page2.rowCount,
      page3_rows: page3.rowCount,
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
