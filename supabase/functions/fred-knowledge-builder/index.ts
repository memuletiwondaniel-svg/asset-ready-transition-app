import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Category-specific extraction prompts */
const CATEGORY_PROMPTS: Record<string, string> = {
  losh_drawings: `Extract from this LOSH (Limit of System Handover) drawing:
1. SYSTEM_BOUNDARIES: What systems/subsystems are shown and their boundary points?
2. TAG_MAPPINGS: What equipment tags are shown and which subsystem do they belong to?
3. INTERFACE_POINTS: Where do systems interface with each other?
4. DISCIPLINES_INVOLVED: Which engineering disciplines are represented?
Return JSON with keys: system_boundaries, tag_mappings, interface_points, disciplines_involved`,

  completions_procedure: `Extract from this Completions Management Procedure:
1. PHASE_GATES: What are the formal gate/milestone stages?
2. ROLES_RESPONSIBILITIES: Who is responsible for what at each stage?
3. APPROVAL_WORKFLOWS: What approval chains exist?
4. EXCEPTION_PROCESSES: How are exceptions/deviations handled?
5. KEY_DEFINITIONS: Important terms and their definitions
Return JSON with keys: phase_gates, roles_responsibilities, approval_workflows, exception_processes, key_definitions`,

  logic_way: `Extract from this completions philosophy/logic document:
1. SEQUENCING_LOGIC: What is the prescribed sequence for completions activities?
2. DECISION_TREES: What decision points exist and their criteria?
3. PRINCIPLES: Core completions philosophy principles
4. PREREQUISITES: What must be true before each stage?
Return JSON with keys: sequencing_logic, decision_trees, principles, prerequisites`,

  csu_masterclass: `Extract from this CSU (Commissioning & Startup) training material:
1. PRE_COMM_PROCEDURES: Pre-commissioning procedures and steps
2. COMM_SEQUENCE: Commissioning sequence and phasing
3. BEST_PRACTICES: Key best practices highlighted
4. COMMON_PITFALLS: Common mistakes and how to avoid them
5. SAFETY_REQUIREMENTS: Safety requirements during commissioning
Return JSON with keys: pre_comm_procedures, comm_sequence, best_practices, common_pitfalls, safety_requirements`,

  blank_itrs: `Extract from this blank ITR (Inspection Test Record) template:
1. ITR_CODE: The ITR code (e.g. I01A, M02B)
2. ITR_TITLE: Full title of the ITR
3. DISCIPLINE: Engineering discipline (I/M/E/P/X)
4. PHASE: A (construction) or B (pre-commissioning)
5. CHECKPOINTS: List of inspection/test checkpoints with acceptance criteria
6. SIGN_OFF_FIELDS: Who must sign off and in what order
7. EQUIPMENT_TYPES: What equipment types this ITR applies to
Return JSON with keys: itr_code, itr_title, discipline, phase, checkpoints, sign_off_fields, equipment_types`,

  repetitive_failure: `Extract from this Repetitive Failure management material:
1. FAILURE_PATTERNS: Types of repetitive failures identified
2. ROOT_CAUSES: Root cause categories and analysis methods
3. PREVENTION_STRATEGIES: Strategies to prevent recurrence
4. TRACKING_METHODS: How failures are tracked and trended
5. ESCALATION_TRIGGERS: When does a failure pattern require escalation?
Return JSON with keys: failure_patterns, root_causes, prevention_strategies, tracking_methods, escalation_triggers`,

  lessons_learnt: `Extract from this Commissioning Lessons Learnt document:
1. LESSON: What was learned?
2. CONTEXT: During which phase/activity did this occur?
3. DISCIPLINE: Which engineering discipline?
4. ROOT_CAUSE: What was the root cause?
5. RECOMMENDATION: What is the recommended action?
6. EQUIPMENT_TYPE: What equipment was involved?
Return JSON array where each item has keys: lesson, context, discipline, root_cause, recommendation, equipment_type`,

  flaws_database: `Extract from this Flaws Database:
1. FLAW_TYPES: Types of flaws identified
2. SEVERITY_CLASSIFICATION: How are flaws classified by severity?
3. REMEDIATION: Remediation approaches for each flaw type
4. DETECTION_METHODS: How are these flaws typically detected?
Return JSON with keys: flaw_types, severity_classification, remediation, detection_methods`,

  csi_database: `Extract from this CSI (Commissioning Startup Incidents) database:
1. INCIDENT_CATEGORIES: Types of incidents
2. CONTRIBUTING_FACTORS: Common contributing factors
3. PREVENTIVE_MEASURES: Measures to prevent recurrence
4. SEVERITY_LEVELS: How incidents are classified
5. RESPONSE_PROTOCOLS: Response procedures
Return JSON with keys: incident_categories, contributing_factors, preventive_measures, severity_levels, response_protocols`,

  ctps: `Extract from this CTP (Commissioning Test Procedure):
1. TEST_OBJECTIVE: What is being tested and why?
2. EQUIPMENT_SCOPE: What equipment is covered?
3. ACCEPTANCE_CRITERIA: What constitutes pass/fail?
4. SAFETY_PRECAUTIONS: Safety requirements during testing
5. PROCEDURE_STEPS: Step-by-step test procedure
6. INSTRUMENTS_REQUIRED: What test instruments/tools are needed?
Return JSON with keys: test_objective, equipment_scope, acceptance_criteria, safety_precautions, procedure_steps, instruments_required`,

  sat_fat_sit: `Extract from this acceptance test document (SAT/FAT/SIT):
1. TEST_TYPE: Is this SAT, FAT, or SIT?
2. TEST_SCOPE: What is being tested?
3. PASS_FAIL_CRITERIA: Acceptance criteria
4. COMMON_FINDINGS: Typical findings/non-conformances
5. PREREQUISITE_DOCS: What documents are needed before testing?
6. WITNESS_REQUIREMENTS: Who must witness the test?
Return JSON with keys: test_type, test_scope, pass_fail_criteria, common_findings, prerequisite_docs, witness_requirements`,

  csu_plans: `Extract from this CSU Plan document:
1. PLAN_STRUCTURE: Overall plan structure and sections
2. PHASING: How is commissioning phased?
3. RESOURCE_PLANNING: Resource and personnel requirements
4. SCHEDULE_MILESTONES: Key schedule milestones
5. RISK_MANAGEMENT: How are commissioning risks managed?
6. INTERFACE_MANAGEMENT: How are interfaces between disciplines managed?
Return JSON with keys: plan_structure, phasing, resource_planning, schedule_milestones, risk_management, interface_management`,

  hazop_omar: `Extract from this HAZOP/OMAR report:
1. RISK_CATEGORIES: Types of risks identified
2. HAZARD_SCENARIOS: Key hazard scenarios
3. SAFEGUARDS: Existing and recommended safeguards
4. ACTION_ITEMS: Actions required and their status
5. RISK_RANKINGS: How are risks ranked (likelihood × consequence)?
Return JSON with keys: risk_categories, hazard_scenarios, safeguards, action_items, risk_rankings`,
};

/** Knowledge type mapping per category */
const CATEGORY_TO_KNOWLEDGE_TYPE: Record<string, string> = {
  losh_drawings: 'procedure',
  completions_procedure: 'procedure',
  logic_way: 'procedure',
  csu_masterclass: 'procedure',
  blank_itrs: 'itr_template',
  repetitive_failure: 'failure_pattern',
  lessons_learnt: 'lesson',
  flaws_database: 'failure_pattern',
  csi_database: 'incident',
  ctps: 'test_criteria',
  sat_fat_sit: 'acceptance_criteria',
  csu_plans: 'plan_template',
  hazop_omar: 'risk_pattern',
};

/** Neutrality sanitization — remove company-specific names */
function sanitizeContent(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\bBasrah\s+Gas\s+Company\b/gi, 'the Company')
    .replace(/\bBGC\b/g, 'the Company')
    .replace(/\bShell\b/gi, 'the Operator')
    .replace(/\bIraq\s+Southern\s+Gas\b/gi, 'the Project Entity')
    .replace(/\bBP\b/g, 'the JV Partner')
    .replace(/\bMitsubishi\b/gi, 'the Contractor');
}

function sanitizeDeep(obj: any): any {
  if (typeof obj === 'string') return sanitizeContent(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeDeep);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = sanitizeDeep(v);
    }
    return result;
  }
  return obj;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body OK */ }

    // Handle reset request
    if (body.reset_id) {
      await supabase
        .from("fred_training_queue")
        .update({ status: "pending", error_details: null })
        .eq("id", body.reset_id);
      return new Response(JSON.stringify({ action: "reset", id: body.reset_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Pick next pending items (up to 3 per run)
    const { data: queueItems, error: queueErr } = await supabase
      .from("fred_training_queue")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .limit(3);

    if (queueErr) throw new Error(`Queue read error: ${queueErr.message}`);

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({
        message: "No pending items in fred_training_queue",
        processed: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: any[] = [];

    for (const item of queueItems) {
      console.log(`[FredKB] Processing: ${item.file_path} (${item.category})`);

      // Mark in_progress
      await supabase
        .from("fred_training_queue")
        .update({ status: "in_progress" })
        .eq("id", item.id);

      try {
        // Step 2: Download file from storage
        const { data: fileData, error: downloadErr } = await supabase.storage
          .from("fred_training_docs")
          .download(item.file_path);

        if (downloadErr || !fileData) {
          throw new Error(`Download failed: ${downloadErr?.message || 'No data'}`);
        }

        // Convert to base64 for Claude
        const bytes = new Uint8Array(await fileData.arrayBuffer());
        const base64 = btoa(String.fromCharCode(...bytes));

        // Determine media type
        const ext = item.file_path.split('.').pop()?.toLowerCase();
        const mediaTypes: Record<string, string> = {
          pdf: 'application/pdf',
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          webp: 'image/webp',
        };
        const mediaType = mediaTypes[ext || ''] || 'application/pdf';

        // Step 3: Extract knowledge via Claude
        const extractionPrompt = CATEGORY_PROMPTS[item.category] || 
          `Extract structured knowledge from this document. Return JSON with key findings, procedures, lessons, and recommendations.`;

        const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '');
        const isPdf = ext === 'pdf';

        const content: any[] = [];
        if (isPdf || isImage) {
          content.push({
            type: isPdf ? "document" : "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          });
        }
        content.push({ type: "text", text: extractionPrompt });

        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2024-01-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5-20250514",
            max_tokens: 4096,
            messages: [{ role: "user", content }],
          }),
        });

        if (!claudeResponse.ok) {
          const errText = await claudeResponse.text();
          throw new Error(`Claude API error ${claudeResponse.status}: ${errText}`);
        }

        const claudeResult = await claudeResponse.json();
        const responseText = claudeResult.content?.[0]?.text || '';

        // Step 4: Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/) || responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No JSON found in Claude response");

        let extracted = JSON.parse(jsonMatch[0]);

        // Step 5: Sanitize company names
        extracted = sanitizeDeep(extracted);

        // Step 6: Determine title and persist
        const knowledgeType = CATEGORY_TO_KNOWLEDGE_TYPE[item.category] || 'procedure';
        const title = extracted.itr_code
          ? `ITR ${extracted.itr_code} — ${extracted.itr_title || item.category}`
          : `${item.category} — ${item.file_path.split('/').pop()}`;

        // Handle lessons learnt which may return an array
        const entries = Array.isArray(extracted) ? extracted : [extracted];

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const entryTitle = entries.length > 1 
            ? `${title} #${i + 1}` 
            : title;

          const { error: upsertErr } = await supabase
            .from("fred_domain_knowledge")
            .upsert({
              category: item.category,
              knowledge_type: knowledgeType,
              title: entryTitle,
              content: entry,
              source_file: item.file_path,
              confidence: 0.75,
              tags: extractTags(entry, item.category),
            }, { onConflict: 'category,title,source_file' });

          if (upsertErr) {
            console.error(`[FredKB] Upsert error: ${upsertErr.message}`);
          }
        }

        // Mark completed
        await supabase
          .from("fred_training_queue")
          .update({ status: "completed" })
          .eq("id", item.id);

        results.push({ id: item.id, status: "completed", entries: entries.length });
        console.log(`[FredKB] Completed: ${item.file_path} (${entries.length} entries)`);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[FredKB] Failed: ${item.file_path} — ${errorMsg}`);

        await supabase
          .from("fred_training_queue")
          .update({ status: "failed", error_details: errorMsg })
          .eq("id", item.id);

        results.push({ id: item.id, status: "failed", error: errorMsg });
      }
    }

    return new Response(JSON.stringify({
      processed: results.length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[FredKB] Fatal error: ${errorMsg}`);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Extract searchable tags from knowledge content */
function extractTags(content: any, category: string): string[] {
  const tags: string[] = [category];
  const text = JSON.stringify(content).toLowerCase();

  const disciplineMap: Record<string, string> = {
    piping: 'piping', electrical: 'electrical', instrument: 'instrument',
    mechanical: 'mechanical', painting: 'painting', coating: 'coating',
  };
  for (const [keyword, tag] of Object.entries(disciplineMap)) {
    if (text.includes(keyword)) tags.push(tag);
  }

  const phaseKeywords = ['mcc', 'pcc', 'rfc', 'rfsu', 'fac', 'pre-commissioning', 'commissioning', 'construction'];
  for (const kw of phaseKeywords) {
    if (text.includes(kw)) tags.push(kw);
  }

  if (content.itr_code) tags.push(`itr-${content.itr_code}`.toLowerCase());
  if (content.test_type) tags.push(content.test_type.toLowerCase());

  return [...new Set(tags)];
}
