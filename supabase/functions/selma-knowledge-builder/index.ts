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
    // Handle reset request
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body OK */ }
    
    if (body.reset_type_code) {
      await supabase
        .from("selma_training_queue")
        .update({ status: "pending", error_details: null })
        .eq("type_code", body.reset_type_code);
      return new Response(JSON.stringify({ action: "reset", type_code: body.reset_type_code }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Pick next pending types from queue (up to 5 per run)
    const { data: queueItems, error: queueErr } = await supabase
      .from("selma_training_queue")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .limit(5);

    if (queueErr) throw new Error(`Queue read error: ${queueErr.message}`);

    if (!queueItems || queueItems.length === 0) {
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
          const priorityMap: Record<string, number> = {
            "5507": 1, "5501": 2, "5502": 3, "5515": 4, "5520": 5,
            "5511": 6, "5513": 7, "5760": 8, "6611": 9,
          };
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
          if (seedErr) console.error("[KnowledgeBuilder] Seed error:", seedErr.message);
          return new Response(JSON.stringify({
            action: "seeded_queue", types_queued: queueRows.length,
            message: seedErr ? `Seeding failed: ${seedErr.message}` : "Training queue seeded. Run again to start processing.",
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      return new Response(JSON.stringify({
        action: "nothing_to_process",
        message: "No pending document types in training queue.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[KnowledgeBuilder] Processing batch of ${queueItems.length} types: ${queueItems.map((q: any) => q.type_code).join(", ")}`);

    // Build Assai session once for the entire batch
    let selmaSession;
    try {
      selmaSession = await buildSelmaSessionManager(supabase);
    } catch (authErr: any) {
      console.error("[KnowledgeBuilder] Assai auth failed:", authErr.message);
      // Mark all items as failed
      for (const item of queueItems) {
        await supabase.from("selma_training_queue")
          .update({ status: "failed", error_details: `Auth failed: ${authErr.message}` })
          .eq("id", item.id);
      }
      return new Response(JSON.stringify({ error: "Assai auth failed", details: authErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionManager, assaiBase } = selmaSession;

    const FALLBACK_CABINETS = ["BGC_PROJ", "BGC_OPS", "ISG"];
    const { data: cabinetRows } = await supabase
      .from("dms_projects")
      .select("cabinet")
      .eq("is_active", true);
    const cabinets = cabinetRows
      ? [...new Set(cabinetRows.map((r: any) => r.cabinet).filter(Boolean))]
      : FALLBACK_CABINETS;

    const batchResults: any[] = [];

    // Process each queue item sequentially
    for (const queueItem of queueItems) {
      const typeCode = queueItem.type_code;
      const typeName = queueItem.type_name || typeCode;
      const itemStart = Date.now();

      try {
        console.log(`[KnowledgeBuilder] Processing type: ${typeCode} (${typeName})`);

        // Mark in_progress
        await supabase.from("selma_training_queue")
          .update({ status: "in_progress", last_attempt: new Date().toISOString() })
          .eq("id", queueItem.id);

        // Search Assai for documents of this type
        const sampleDocs: Array<{ doc_number: string; project: string; title: string; status: string }> = [];

        try {
          const searchOpts: SearchOptions = {
            documentType: typeCode,
            maxResults: 20,
            username: selmaSession.username,
            password: selmaSession.password,
            assaiBase,
          };
          const results = await executeSearch(searchOpts, sessionManager, supabase);
          const candidates = (results.results || [])
            .filter((d: any) => d.status && ["AFU", "AFC", "IFA"].includes(d.status.toUpperCase()));
          const seen = new Set<string>();
          for (const doc of candidates) {
            if (seen.has(doc.document_number)) continue;
            seen.add(doc.document_number);
            sampleDocs.push({ doc_number: doc.document_number, project: doc.project || "unknown", title: doc.title || "", status: doc.status || "" });
            if (sampleDocs.length >= 3) break;
          }
          if (sampleDocs.length === 0) {
            for (const doc of (results.results || [])) {
              if (seen.has(doc.document_number)) continue;
              seen.add(doc.document_number);
              sampleDocs.push({ doc_number: doc.document_number, project: doc.project || "unknown", title: doc.title || "", status: doc.status || "" });
              if (sampleDocs.length >= 3) break;
            }
          }
        } catch (searchErr: any) {
          console.warn(`[KnowledgeBuilder] Search failed for ${typeCode}: ${searchErr.message}`);
        }

        if (sampleDocs.length === 0) {
          await supabase.from("selma_training_queue")
            .update({ status: "skipped", error_details: "No documents found in Assai" })
            .eq("id", queueItem.id);
          batchResults.push({ type_code: typeCode, action: "skipped", reason: "No documents found" });
          continue;
        }

        // Download and analyse each document
        const analysisResults: any[] = [];
        for (const doc of sampleDocs) {
          try {
            let fileBytes: Uint8Array | null = null;
            const cookies = await sessionManager.getSession();
            for (const cabinet of cabinets as string[]) {
              try {
                const url = `${assaiBase}/get/download/${cabinet}/DOCS/${doc.doc_number}`;
                const controller = new AbortController();
                const tid = setTimeout(() => controller.abort(), 20000);
                const res = await fetch(url, { headers: { Cookie: cookies, "User-Agent": "Mozilla/5.0" }, signal: controller.signal, redirect: "manual" });
                clearTimeout(tid);
                if (res.status === 301 || res.status === 302) continue;
                if (!res.ok) { await res.text(); continue; }
                const bytes = new Uint8Array(await res.arrayBuffer());
                const ct = res.headers.get("content-type") || "";
                if (ct.includes("text/html") || bytes.length < 500) continue;
                if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) { fileBytes = bytes; break; }
              } catch { continue; }
            }
            if (!fileBytes) continue;

            let binary = "";
            for (let i = 0; i < fileBytes.length; i++) binary += String.fromCharCode(fileBytes[i]);
            const b64 = btoa(binary);

            const docBlock: any = { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } };
            const makeRequest = async (pages?: number[]) => {
              const block = { ...docBlock };
              if (pages) block.pages = pages;
              return fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
                body: JSON.stringify({
                  model: "claude-sonnet-4-5-20250929",
                  max_tokens: 2000,
                  messages: [{ role: "user", content: [block, { type: "text", text: KNOWLEDGE_EXTRACTION_PROMPT }] }],
                }),
              });
            };

            let claudeRes = await makeRequest();
            if (!claudeRes.ok) {
              const errText = await claudeRes.text();
              if (errText.includes("100 PDF pages") || errText.includes("maximum")) {
                claudeRes = await makeRequest(Array.from({ length: 100 }, (_, i) => i + 1));
                if (!claudeRes.ok) continue;
              } else continue;
            }

            const result = await claudeRes.json();
            const textContent = (result.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
            const jsonMatch = textContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                analysisResults.push({ doc_number: doc.doc_number, project: doc.project, ...parsed });
              } catch { /* skip */ }
            }
          } catch { continue; }
        }

        if (analysisResults.length === 0) {
          await supabase.from("selma_training_queue")
            .update({ status: "failed", error_details: "Claude analysis produced no results" })
            .eq("id", queueItem.id);
          batchResults.push({ type_code: typeCode, action: "failed", reason: "No analysis results" });
          continue;
        }

        // Merge insights
        const mergeArrays = (key: string): string[] => [...new Set(analysisResults.flatMap(r => r[key] || []))];
        const merged = {
          type_code: typeCode,
          type_name: typeName,
          purpose: analysisResults[0]?.purpose || null,
          typical_structure: mergeArrays("typical_structure"),
          key_themes: mergeArrays("key_themes"),
          handover_relevance: analysisResults[0]?.handover_relevance || null,
          cross_references: mergeArrays("cross_references"),
          selma_tips: analysisResults[0]?.selma_tips || null,
          avg_page_count: Math.round(analysisResults.reduce((sum, r) => sum + (r.avg_page_count || 0), 0) / analysisResults.length),
          sample_projects: sampleDocs.map(d => d.project),
          confidence: Math.min(0.95, 0.5 + analysisResults.length * 0.15),
          documents_analyzed: sampleDocs.length,
          last_trained_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase.from("selma_document_type_knowledge").upsert(merged, { onConflict: "type_code" });
        if (upsertErr) {
          await supabase.from("selma_training_queue").update({ status: "failed", error_details: `DB upsert: ${upsertErr.message}` }).eq("id", queueItem.id);
          batchResults.push({ type_code: typeCode, action: "failed", reason: upsertErr.message });
          continue;
        }

        await supabase.from("selma_training_queue").update({ status: "completed", documents_sampled: sampleDocs, error_details: null }).eq("id", queueItem.id);
        const elapsed = Date.now() - itemStart;
        console.log(`[KnowledgeBuilder] ✅ ${typeCode} completed in ${elapsed}ms`);
        batchResults.push({ type_code: typeCode, action: "completed", documents_analyzed: analysisResults.length, confidence: merged.confidence, elapsed_ms: elapsed });

      } catch (itemErr: any) {
        console.error(`[KnowledgeBuilder] Error processing ${typeCode}:`, itemErr.message);
        await supabase.from("selma_training_queue").update({ status: "failed", error_details: itemErr.message }).eq("id", queueItem.id);
        batchResults.push({ type_code: typeCode, action: "failed", reason: itemErr.message });
      }
    }

    const totalElapsed = Date.now() - startTime;
    console.log(`[KnowledgeBuilder] Batch complete: ${batchResults.length} types in ${totalElapsed}ms`);

    return new Response(JSON.stringify({
      action: "batch_completed",
      types_processed: batchResults.length,
      results: batchResults,
      elapsed_ms: totalElapsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[KnowledgeBuilder] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
