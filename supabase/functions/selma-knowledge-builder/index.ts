import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildSelmaSessionManager } from "../_shared/selma/handlers.ts";
import { executeSearch, type SearchOptions } from "../_shared/selma/search-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Knowledge extraction prompt — NOT user-facing analysis
const KNOWLEDGE_EXTRACTION_PROMPT = `You are a technical document analyst building a knowledge base about document types used in oil & gas engineering projects.

Analyse this document and extract STRUCTURED KNOWLEDGE about the document TYPE (not this specific document). Answer these questions:

1. PURPOSE: What is the general purpose of this type of document? (2-3 sentences)
2. TYPICAL_STRUCTURE: What sections/chapters does this type of document typically contain? (JSON array of section names)
3. KEY_THEMES: What key engineering themes/topics appear in this type of document? (JSON array of theme keywords)
4. HANDOVER_RELEVANCE: How does this document type relate to project handover/commissioning readiness? (1-2 sentences)
5. CROSS_REFERENCES: What other document types does this type typically reference or depend on? (JSON array of type names like "P&ID", "PFD", "HAZOP")
6. SELMA_TIPS: When a user asks about this document type, what should an AI assistant focus on? (1-2 sentences of guidance)
7. AVG_PAGE_COUNT: Estimated typical page count for this document type (number)

Return your response as valid JSON with these exact keys: purpose, typical_structure, key_themes, handover_relevance, cross_references, selma_tips, avg_page_count`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Step 1: Pick next pending type from queue
    const { data: queueItem, error: queueErr } = await supabase
      .from("selma_training_queue")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (queueErr) throw new Error(`Queue read error: ${queueErr.message}`);

    if (!queueItem) {
      // Check if queue is empty — seed it from dms_document_types
      const { count } = await supabase
        .from("selma_training_queue")
        .select("id", { count: "exact", head: true });

      if (count === 0) {
        console.log("[KnowledgeBuilder] Queue empty — seeding from dms_document_types");
        const { data: types } = await supabase
          .from("dms_document_types")
          .select("code, document_name")
          .eq("is_active", true);

        if (types && types.length > 0) {
          // Priority map — lower number = higher priority
          const priorityMap: Record<string, number> = {
            "5507": 1,   // Basis for Design
            "5501": 2,   // Process Flow Diagram
            "5502": 3,   // P&ID
            "5515": 4,   // Equipment Data Sheet
            "5520": 5,   // ITP
            "5511": 6,   // GA / Layout
            "5513": 7,   // Single Line Diagram
            "5760": 8,   // Project Execution Plan
            "6611": 9,   // Master Document Register
          };

          // Deduplicate by type_code
          const seen = new Set<string>();
          const queueRows = types
            .filter((t: any) => { if (seen.has(t.code)) return false; seen.add(t.code); return true; })
            .map((t: any) => ({
              type_code: t.code,
              type_name: t.document_name,
              status: "pending",
              priority: priorityMap[t.code] || 50 + Math.floor(Math.random() * 50),
            }));

          const { error: seedErr } = await supabase.from("selma_training_queue").upsert(queueRows, { onConflict: "type_code" });
          if (seedErr) {
            console.error("[KnowledgeBuilder] Seed error:", seedErr.message, seedErr.details);
          }
          return new Response(JSON.stringify({
            action: "seeded_queue",
            types_queued: queueRows.length,
            seed_error: seedErr?.message || null,
            message: seedErr ? `Seeding failed: ${seedErr.message}` : "Training queue seeded. Run again to start processing.",
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      return new Response(JSON.stringify({
        action: "nothing_to_process",
        message: "No pending document types in training queue.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const typeCode = queueItem.type_code;
    const typeName = queueItem.type_name || typeCode;
    console.log(`[KnowledgeBuilder] Processing type: ${typeCode} (${typeName})`);

    // Step 2: Mark in_progress
    await supabase
      .from("selma_training_queue")
      .update({ status: "in_progress", last_attempt: new Date().toISOString() })
      .eq("id", queueItem.id);

    // Step 3: Build Assai session
    let selmaSession;
    try {
      selmaSession = await buildSelmaSessionManager(supabase);
    } catch (authErr: any) {
      console.error("[KnowledgeBuilder] Assai auth failed:", authErr.message);
      await supabase
        .from("selma_training_queue")
        .update({ status: "failed", error_details: `Auth failed: ${authErr.message}` })
        .eq("id", queueItem.id);
      return new Response(JSON.stringify({ error: "Assai auth failed", details: authErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionManager, assaiBase } = selmaSession;

    // Step 4: Search Assai for documents of this type across projects
    // Get a few active projects to sample from
    const { data: projects } = await supabase
      .from("dms_projects")
      .select("code, project_name, proj_seq_nr, cabinet")
      .eq("is_active", true)
      .order("project_name")
      .limit(5);

    const sampleDocs: Array<{ doc_number: string; project: string; title: string; status: string }> = [];

    for (const proj of (projects || []).slice(0, 3)) {
      if (sampleDocs.length >= 3) break;

      try {
        const searchOpts: SearchOptions = {
          document_type: typeCode,
          document_number_pattern: `${proj.code}-%`,
          max_results: 10,
        };

        const cookies = await sessionManager.getSession();
        const results = await executeSearch(searchOpts, cookies, assaiBase);

        // Pick docs with mature status (AFU/AFC preferred)
        const sorted = results.documents
          .filter((d: any) => d.status && ["AFU", "AFC", "IFA"].includes(d.status.toUpperCase()))
          .slice(0, 2);

        for (const doc of sorted) {
          if (sampleDocs.length < 3) {
            sampleDocs.push({
              doc_number: doc.document_number,
              project: proj.project_name,
              title: doc.title || "",
              status: doc.status || "",
            });
          }
        }
      } catch (searchErr: any) {
        console.warn(`[KnowledgeBuilder] Search failed for ${proj.code}: ${searchErr.message}`);
      }
    }

    if (sampleDocs.length === 0) {
      console.log(`[KnowledgeBuilder] No documents found for type ${typeCode} — marking skipped`);
      await supabase
        .from("selma_training_queue")
        .update({
          status: "skipped",
          error_details: "No documents found in Assai for this type code across sampled projects",
        })
        .eq("id", queueItem.id);

      return new Response(JSON.stringify({
        action: "skipped",
        type_code: typeCode,
        reason: "No documents found",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[KnowledgeBuilder] Found ${sampleDocs.length} sample docs for ${typeCode}: ${sampleDocs.map(d => d.doc_number).join(", ")}`);

    // Step 5: Download and analyse each document
    const FALLBACK_CABINETS = ["BGC_PROJ", "BGC_OPS", "ISG"];
    const { data: cabinetRows } = await supabase
      .from("dms_projects")
      .select("cabinet")
      .eq("is_active", true);
    const cabinets = cabinetRows
      ? [...new Set(cabinetRows.map((r: any) => r.cabinet).filter(Boolean))]
      : FALLBACK_CABINETS;

    const analysisResults: any[] = [];

    for (const doc of sampleDocs) {
      try {
        // Download via REST
        let fileBytes: Uint8Array | null = null;
        const cookies = await sessionManager.getSession();

        for (const cabinet of cabinets as string[]) {
          try {
            const url = `${assaiBase}/get/download/${cabinet}/DOCS/${doc.doc_number}`;
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 20000);
            const res = await fetch(url, {
              headers: { Cookie: cookies, "User-Agent": "Mozilla/5.0" },
              signal: controller.signal,
              redirect: "manual",
            });
            clearTimeout(tid);

            if (res.status === 301 || res.status === 302) continue;
            if (!res.ok) { await res.text(); continue; }

            const bytes = new Uint8Array(await res.arrayBuffer());
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("text/html") || bytes.length < 500) continue;

            // Check it's a PDF
            if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
              fileBytes = bytes;
              break;
            }
          } catch { continue; }
        }

        if (!fileBytes) {
          console.warn(`[KnowledgeBuilder] Could not download ${doc.doc_number}`);
          continue;
        }

        // Base64 encode
        let binary = "";
        for (let i = 0; i < fileBytes.length; i++) {
          binary += String.fromCharCode(fileBytes[i]);
        }
        const b64 = btoa(binary);

        // Send to Claude for knowledge extraction
        const docBlock: any = { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } };
        // Limit to 100 pages
        const makeRequest = async (pages?: number[]) => {
          const block = { ...docBlock };
          if (pages) block.pages = pages;
          return fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_KEY,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 2000,
              messages: [{
                role: "user",
                content: [block, { type: "text", text: KNOWLEDGE_EXTRACTION_PROMPT }],
              }],
            }),
          });
        };

        let claudeRes = await makeRequest();
        if (!claudeRes.ok) {
          const errText = await claudeRes.text();
          if (errText.includes("100 PDF pages") || errText.includes("maximum")) {
            claudeRes = await makeRequest(Array.from({ length: 100 }, (_, i) => i + 1));
            if (!claudeRes.ok) { console.warn(`[KnowledgeBuilder] Claude retry failed for ${doc.doc_number}`); continue; }
          } else {
            console.warn(`[KnowledgeBuilder] Claude error for ${doc.doc_number}: ${errText.substring(0, 200)}`);
            continue;
          }
        }

        const result = await claudeRes.json();
        const textContent = (result.content || [])
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n");

        // Parse JSON from Claude response
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            analysisResults.push({ doc_number: doc.doc_number, project: doc.project, ...parsed });
          } catch {
            console.warn(`[KnowledgeBuilder] JSON parse failed for ${doc.doc_number}`);
          }
        }
      } catch (docErr: any) {
        console.warn(`[KnowledgeBuilder] Error processing ${doc.doc_number}: ${docErr.message}`);
      }
    }

    if (analysisResults.length === 0) {
      await supabase
        .from("selma_training_queue")
        .update({ status: "failed", error_details: "Downloaded docs but Claude analysis produced no results" })
        .eq("id", queueItem.id);

      return new Response(JSON.stringify({
        action: "failed",
        type_code: typeCode,
        reason: "Analysis produced no results",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 6: Merge insights across documents
    const mergeArrays = (key: string): string[] => {
      const all = analysisResults.flatMap(r => r[key] || []);
      return [...new Set(all)];
    };

    const merged = {
      type_code: typeCode,
      type_name: typeName,
      purpose: analysisResults[0]?.purpose || null,
      typical_structure: mergeArrays("typical_structure"),
      key_themes: mergeArrays("key_themes"),
      handover_relevance: analysisResults[0]?.handover_relevance || null,
      cross_references: mergeArrays("cross_references"),
      selma_tips: analysisResults[0]?.selma_tips || null,
      avg_page_count: Math.round(
        analysisResults.reduce((sum, r) => sum + (r.avg_page_count || 0), 0) / analysisResults.length
      ),
      sample_projects: sampleDocs.map(d => d.project),
      confidence: Math.min(0.95, 0.5 + analysisResults.length * 0.15),
      documents_analyzed: sampleDocs.length,
      last_trained_at: new Date().toISOString(),
    };

    // Step 7: Upsert knowledge
    const { error: upsertErr } = await supabase
      .from("selma_document_type_knowledge")
      .upsert(merged, { onConflict: "type_code" });

    if (upsertErr) {
      console.error("[KnowledgeBuilder] Upsert error:", upsertErr.message);
      await supabase
        .from("selma_training_queue")
        .update({ status: "failed", error_details: `DB upsert failed: ${upsertErr.message}` })
        .eq("id", queueItem.id);
      throw new Error(`Upsert failed: ${upsertErr.message}`);
    }

    // Step 8: Mark completed
    await supabase
      .from("selma_training_queue")
      .update({
        status: "completed",
        documents_sampled: sampleDocs,
        error_details: null,
      })
      .eq("id", queueItem.id);

    const elapsed = Date.now() - startTime;
    console.log(`[KnowledgeBuilder] ✅ ${typeCode} completed in ${elapsed}ms — ${analysisResults.length} docs analysed`);

    return new Response(JSON.stringify({
      action: "completed",
      type_code: typeCode,
      type_name: typeName,
      documents_analyzed: analysisResults.length,
      documents_sampled: sampleDocs.map(d => d.doc_number),
      knowledge_keys: Object.keys(merged),
      confidence: merged.confidence,
      elapsed_ms: elapsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[KnowledgeBuilder] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
