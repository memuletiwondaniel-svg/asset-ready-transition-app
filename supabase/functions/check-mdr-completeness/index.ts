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
    const { project_id, discipline_filter, tier_filter, tenant_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Step 1: Fetch all MDR register rows for this project
    let query = supabase
      .from("mdr_register")
      .select("*")
      .eq("project_id", project_id);

    if (discipline_filter) {
      query = query.eq("discipline_code", discipline_filter);
    }
    if (tier_filter === "tier1") {
      query = query.eq("is_tier1", true);
    } else if (tier_filter === "tier2") {
      query = query.eq("is_tier2", true);
    }

    const { data: mdrRows, error: fetchErr } = await query;

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch MDR register: " + fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mdrRows || mdrRows.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No MDR data found for this project. Please parse an MDR document first using parse_mdr_document.",
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

        // Authenticate
        const loginUrl = `${assaiBase}/login.aweb`;
        const loginBody = new URLSearchParams({
          user_name: username,
          user_pass: password,
          client_type: "web",
        });

        try {
          const loginRes = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: loginBody.toString(),
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
          console.error("check-mdr-completeness: Assai auth failed:", authErr);
        }
      }
    }

    // Step 3: Check each document against Assai (if available) or use cached data
    // Group documents by project code prefix for efficient batch searching
    const projectCodes = new Set(mdrRows.map((r: any) => r.document_number.split("-")[0]));
    const assaiResults = new Map<string, { status: string; revision: string }>();

    if (assaiAvailable && projectCodes.size > 0) {
      // Initialize search session
      const initUrl = `${assaiBase}/search.aweb?subclass_type=DES_DOC&clas_seq_nr=1&suty_seq_nr=1`;
      await fetch(initUrl, { headers: { Cookie: cookieHeader }, redirect: "follow" });

      // Search per project code prefix to find all documents
      for (const projCode of projectCodes) {
        try {
          const searchUrl = `${assaiBase}/searchresult.aweb`;
          const searchBody = new URLSearchParams({
            subclass_type: "DES_DOC",
            clas_seq_nr: "1",
            suty_seq_nr: "1",
            number: `${projCode}-%`,
            action: "search",
          });

          const searchRes = await fetch(searchUrl, {
            method: "POST",
            headers: {
              Cookie: cookieHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: searchBody.toString(),
            redirect: "follow",
          });

          const searchHtml = await searchRes.text();
          const cellsMatch = searchHtml.match(/var myCells\s*=\s*(\[[\s\S]*?\]);/);

          if (cellsMatch) {
            const cells = JSON.parse(cellsMatch[1]);
            for (const row of cells) {
              // Extract document number (col 0), status (col 7), revision (col 4)
              const docNum = String(row[0] || "").replace(/<[^>]*>/g, "").trim();
              const status = String(row[7] || "").replace(/<[^>]*>/g, "").trim();
              const revision = String(row[4] || "").replace(/<[^>]*>/g, "").trim();

              if (docNum) {
                assaiResults.set(docNum, { status, revision });
              }
            }
          }
        } catch (searchErr) {
          console.error(`check-mdr-completeness: search error for ${projCode}:`, searchErr);
        }

        // Rate limiting between searches
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Step 4: Update MDR register rows with live Assai data
    const now = new Date().toISOString();
    let totalFound = 0;
    let totalAtFinalStatus = 0;
    let tier1Expected = 0;
    let tier1Complete = 0;
    let tier2Expected = 0;
    let tier2Complete = 0;

    const missingDocs: Array<{ document_number: string; discipline: string; type: string; is_tier1: boolean; is_tier2: boolean }> = [];
    const maturityGaps: Array<{ document_number: string; current_status: string; required_status: string; discipline: string }> = [];
    const disciplineStats: Record<string, { expected: number; found: number; at_final: number }> = {};

    for (const row of mdrRows) {
      const disc = row.discipline_code || "Unknown";
      if (!disciplineStats[disc]) {
        disciplineStats[disc] = { expected: 0, found: 0, at_final: 0 };
      }
      disciplineStats[disc].expected++;

      const assaiDoc = assaiResults.get(row.document_number);
      const isFound = !!assaiDoc;
      const currentStatus = assaiDoc?.status || row.current_status || "";
      const currentRevision = assaiDoc?.revision || row.current_revision || "";

      // Check if document meets its final revision requirement
      const meetsRequirement = row.final_rev_requirement
        ? currentStatus.toUpperCase() === row.final_rev_requirement.toUpperCase()
        : isFound; // If no requirement specified, being found is enough

      if (isFound) {
        totalFound++;
        disciplineStats[disc].found++;
      } else {
        missingDocs.push({
          document_number: row.document_number,
          discipline: disc,
          type: row.document_type_code || "",
          is_tier1: row.is_tier1,
          is_tier2: row.is_tier2,
        });
      }

      if (meetsRequirement && isFound) {
        totalAtFinalStatus++;
        disciplineStats[disc].at_final++;
      } else if (isFound && row.final_rev_requirement && currentStatus !== row.final_rev_requirement) {
        maturityGaps.push({
          document_number: row.document_number,
          current_status: currentStatus,
          required_status: row.final_rev_requirement,
          discipline: disc,
        });
      }

      // Tier tracking
      if (row.is_tier1) {
        tier1Expected++;
        if (isFound && meetsRequirement) tier1Complete++;
      }
      if (row.is_tier2) {
        tier2Expected++;
        if (isFound && meetsRequirement) tier2Complete++;
      }

      // Update the register row with latest data (if Assai was available)
      if (assaiAvailable) {
        await supabase
          .from("mdr_register")
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
    const totalExpected = mdrRows.length;
    const completenessPercent = totalExpected > 0 ? Math.round((totalFound / totalExpected) * 100) : 0;
    const maturityPercent = totalExpected > 0 ? Math.round((totalAtFinalStatus / totalExpected) * 100) : 0;

    const gapSummary = {
      discipline_breakdown: disciplineStats,
      missing_documents: missingDocs.slice(0, 50), // Top 50 for snapshot
      maturity_gaps: maturityGaps.slice(0, 50),
      completeness_percent: completenessPercent,
      maturity_percent: maturityPercent,
    };

    const { error: snapshotErr } = await supabase
      .from("mdr_completeness_snapshots")
      .insert({
        project_id,
        snapshot_date: new Date().toISOString().split("T")[0],
        total_expected: totalExpected,
        total_found: totalFound,
        total_at_final_status: totalAtFinalStatus,
        tier1_expected: tier1Expected,
        tier1_complete: tier1Complete,
        tier2_expected: tier2Expected,
        tier2_complete: tier2Complete,
        gap_summary: gapSummary,
        tenant_id: tenant_id || null,
      });

    if (snapshotErr) {
      console.error("check-mdr-completeness: snapshot insert error:", snapshotErr);
    }

    // Step 6: Build response
    const tier1MissingDocs = missingDocs.filter((d) => d.is_tier1);
    const tier2MissingDocs = missingDocs.filter((d) => d.is_tier2);

    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        assai_live_check: assaiAvailable,
        summary: {
          total_expected: totalExpected,
          total_found: totalFound,
          total_missing: totalExpected - totalFound,
          completeness_percent: completenessPercent,
          total_at_final_status: totalAtFinalStatus,
          maturity_percent: maturityPercent,
          tier1: {
            expected: tier1Expected,
            complete: tier1Complete,
            missing: tier1Expected - tier1Complete,
            percent: tier1Expected > 0 ? Math.round((tier1Complete / tier1Expected) * 100) : 100,
          },
          tier2: {
            expected: tier2Expected,
            complete: tier2Complete,
            missing: tier2Expected - tier2Complete,
            percent: tier2Expected > 0 ? Math.round((tier2Complete / tier2Expected) * 100) : 100,
          },
        },
        discipline_breakdown: disciplineStats,
        critical_gaps: {
          tier1_missing: tier1MissingDocs,
          tier2_missing: tier2MissingDocs,
          maturity_shortfalls: maturityGaps.slice(0, 20),
        },
        message: `MDR Completeness: ${completenessPercent}% (${totalFound}/${totalExpected} documents found). Maturity: ${maturityPercent}%. ` +
          `Tier 1: ${tier1Complete}/${tier1Expected} complete. Tier 2: ${tier2Complete}/${tier2Expected} complete. ` +
          `${tier1MissingDocs.length > 0 ? `⚠️ ${tier1MissingDocs.length} Tier 1 (safety-critical) documents missing!` : "✅ All Tier 1 documents accounted for."}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-mdr-completeness error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to check MDR completeness",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
