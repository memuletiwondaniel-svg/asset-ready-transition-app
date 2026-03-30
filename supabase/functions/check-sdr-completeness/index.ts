import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, vendor_code, po_number, tenant_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Step 1: Fetch SDR register rows for this project
    let query = supabase
      .from("sdr_register")
      .select("*")
      .eq("project_id", project_id);

    if (vendor_code) {
      query = query.eq("vendor_code", vendor_code);
    }
    if (po_number) {
      query = query.eq("po_number", po_number);
    }

    const { data: sdrRows, error: fetchErr } = await query;

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch SDR register: " + fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sdrRows || sdrRows.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No SDR data found for this project. Please parse an SDR document first using parse_sdr_document.",
          project_id,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get Assai credentials for live checking
    const { data: creds } = await supabase
      .from("dms_sync_credentials")
      .select("base_url, username_encrypted, password_encrypted, db_name")
      .eq("dms_platform", "assai")
      .maybeSingle();

    let assaiAvailable = false;
    let cookieHeader = "";
    let assaiBase = "";

    if (creds) {
      let username = creds.username_encrypted || "";
      let password = creds.password_encrypted || "";

      try {
        const { isEncrypted, decrypt } = await import("../_shared/crypto.ts");
        if (username && isEncrypted(username)) username = await decrypt(username);
        if (password && isEncrypted(password)) password = await decrypt(password);
      } catch (_) {
        // Ignore decryption errors
      }

      if (username && password) {
        const baseUrl = (creds.base_url || "https://eu.assaicloud.com").replace(/\/+$/, "");
        const dbName = creds.db_name || "eu578";
        assaiBase = baseUrl + "/AW" + dbName;

        try {
          const loginRes = await fetch(`${assaiBase}/login.aweb`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              user_name: username,
              user_pass: password,
              client_type: "web",
            }).toString(),
            redirect: "follow",
          });

          if (loginRes.ok) {
            const setCookies = loginRes.headers.getSetCookie?.() || [];
            cookieHeader = setCookies
              .map((c: string) => c.split(";")[0])
              .filter(Boolean)
              .join("; ");
            assaiAvailable = !!cookieHeader;
          }
        } catch (authErr) {
          console.error("check-sdr-completeness: Assai auth failed:", authErr);
        }
      }
    }

    // Step 3: Check each document against Assai SUP_DOC module
    const projectCodes = new Set(sdrRows.map((r: any) => r.document_number.split("-")[0]));
    const assaiResults = new Map<string, { status: string; revision: string }>();

    if (assaiAvailable && projectCodes.size > 0) {
      // Warmup SUP_DOC session
      await fetch(`${assaiBase}/label.aweb?subclass_type=SUP_DOC`, {
        headers: { Cookie: cookieHeader },
        redirect: "follow",
      });

      const initUrl = `${assaiBase}/search.aweb?subclass_type=SUP_DOC&clas_seq_nr=1&suty_seq_nr=1`;
      await fetch(initUrl, { headers: { Cookie: cookieHeader }, redirect: "follow" });

      for (const projCode of projectCodes) {
        try {
          const searchRes = await fetch(`${assaiBase}/searchresult.aweb`, {
            method: "POST",
            headers: {
              Cookie: cookieHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              subclass_type: "SUP_DOC",
              clas_seq_nr: "1",
              suty_seq_nr: "1",
              number: `${projCode}-%`,
              action: "search",
            }).toString(),
            redirect: "follow",
          });

          const searchHtml = await searchRes.text();
          const cellsMatch = searchHtml.match(/var myCells\s*=\s*(\[[\s\S]*?\]);/);

          if (cellsMatch) {
            const cells = JSON.parse(cellsMatch[1]);
            for (const row of cells) {
              const docNum = String(row[0] || "").replace(/<[^>]*>/g, "").trim();
              const status = String(row[7] || "").replace(/<[^>]*>/g, "").trim();
              const revision = String(row[4] || "").replace(/<[^>]*>/g, "").trim();

              if (docNum) {
                assaiResults.set(docNum, { status, revision });
              }
            }
          }
        } catch (searchErr) {
          console.error(`check-sdr-completeness: search error for ${projCode}:`, searchErr);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Step 4: Analyze completeness
    const now = new Date().toISOString();
    const today = new Date();
    let totalFound = 0;
    let totalAtRequiredStatus = 0;
    let overdueCount = 0;

    const missingDocs: Array<{ document_number: string; sdrl_code: string; vendor_code: string; po_number: string }> = [];
    const overdueDocs: Array<{ document_number: string; planned_date: string; vendor_code: string }> = [];
    const vendorStats: Record<string, { expected: number; found: number; overdue: number }> = {};
    const sdrlStats: Record<string, { expected: number; found: number }> = {};

    for (const row of sdrRows) {
      const vendor = row.vendor_code || "Unassigned";
      const sdrl = row.sdrl_code || "Unknown";

      if (!vendorStats[vendor]) vendorStats[vendor] = { expected: 0, found: 0, overdue: 0 };
      if (!sdrlStats[sdrl]) sdrlStats[sdrl] = { expected: 0, found: 0 };

      vendorStats[vendor].expected++;
      sdrlStats[sdrl].expected++;

      const assaiDoc = assaiResults.get(row.document_number);
      const isFound = !!assaiDoc;
      const currentStatus = assaiDoc?.status || row.current_status || "";
      const currentRevision = assaiDoc?.revision || row.current_revision || "";

      if (isFound) {
        totalFound++;
        vendorStats[vendor].found++;
        sdrlStats[sdrl].found++;
      } else {
        missingDocs.push({
          document_number: row.document_number,
          sdrl_code: sdrl,
          vendor_code: vendor,
          po_number: row.po_number || "",
        });

        // Check if overdue
        if (row.planned_submission_date) {
          const plannedDate = new Date(row.planned_submission_date);
          if (plannedDate < today) {
            overdueCount++;
            vendorStats[vendor].overdue++;
            overdueDocs.push({
              document_number: row.document_number,
              planned_date: row.planned_submission_date,
              vendor_code: vendor,
            });
          }
        }
      }

      // Status check (vendor docs focus on document status, not review codes)
      if (isFound && currentStatus) {
        totalAtRequiredStatus++;
      }

      // Update register with live data
      if (assaiAvailable) {
        await supabase
          .from("sdr_register")
          .update({
            is_found_in_dms: isFound,
            current_status: currentStatus || null,
            current_revision: currentRevision || null,
            last_checked_at: now,
            updated_at: now,
          })
          .eq("id", row.id);
      }
    }

    // Step 5: Create completeness snapshot
    const totalExpected = sdrRows.length;
    const completenessPercent = totalExpected > 0 ? Math.round((totalFound / totalExpected) * 100) : 0;

    const gapSummary = {
      vendor_breakdown: vendorStats,
      sdrl_breakdown: sdrlStats,
      missing_documents: missingDocs.slice(0, 50),
      overdue_documents: overdueDocs.slice(0, 50),
      completeness_percent: completenessPercent,
    };

    const { error: snapshotErr } = await supabase
      .from("sdr_completeness_snapshots")
      .insert({
        project_id,
        vendor_code: vendor_code || null,
        po_number: po_number || null,
        snapshot_date: new Date().toISOString().split("T")[0],
        total_expected: totalExpected,
        total_found: totalFound,
        total_at_required_status: totalAtRequiredStatus,
        overdue_count: overdueCount,
        gap_summary: gapSummary,
        tenant_id: tenant_id || null,
      });

    if (snapshotErr) {
      console.error("check-sdr-completeness: snapshot insert error:", snapshotErr);
    }

    // Step 6: Build response
    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        assai_live_check: assaiAvailable,
        filters: { vendor_code: vendor_code || null, po_number: po_number || null },
        summary: {
          total_expected: totalExpected,
          total_found: totalFound,
          total_missing: totalExpected - totalFound,
          completeness_percent: completenessPercent,
          total_at_required_status: totalAtRequiredStatus,
          overdue_count: overdueCount,
        },
        vendor_breakdown: vendorStats,
        sdrl_breakdown: sdrlStats,
        critical_gaps: {
          missing_documents: missingDocs.slice(0, 30),
          overdue_submissions: overdueDocs.slice(0, 20),
        },
        message: `SDR Completeness: ${completenessPercent}% (${totalFound}/${totalExpected} vendor documents found). ` +
          `${overdueCount > 0 ? `⚠️ ${overdueCount} overdue submissions! ` : ""}` +
          `${missingDocs.length > 0 ? `${missingDocs.length} documents missing.` : "✅ All vendor documents accounted for."}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-sdr-completeness error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to check SDR completeness",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
