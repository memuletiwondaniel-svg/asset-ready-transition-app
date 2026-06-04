/**
 * Fred's GoCompletions Tool Handlers
 * Each handler authenticates, navigates, and parses GoCompletions data.
 * All handlers log to fred_interaction_metrics (fire-and-forget).
 */

import {
  GocSessionManager,
  getGoCompletionsCredentials,
  parseRadGridTable,
  postWithViewState,
  postRadAjaxAsync,
  extractPaginationInfo,
  navigateToPage,
} from "../gocompletions-auth.ts";

import { lookupITRForEquipment } from "./itr-matrix.ts";
import { getHandoverCertSpec, HANDOVER_CERTS } from "../gohub-contract.ts";

// ─── HandoverSearch postback helpers ─────────────────────────
//
// HandoverSearch.aspx is the same WebForms RadButton/RadAjax pattern as
// TagSearch/PunchlistItemSearch: query-string TypeID/HandoverGate/GroupBy
// configure the form, but the grid is empty until a Search postback fires.
// The page renders an inner <input name="..._input"> for the RadButton; the
// real server-side postback target is the OUTER UniqueID (strip "_input").
// Posting the "_input" name is treated as a plain reload → empty grid.
function findHandoverPostbackTarget(html: string): string | null {
  const targets: string[] = [];
  const re = /<input[^>]*name=["']([^"']+SearchButton)_input["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) targets.push(m[1]);
  if (!targets.length) return null;
  const scoped = targets.find((t) => /PrimarySearchCriteria/i.test(t))
    || targets.find((t) => /MasterRadPanelBar/i.test(t));
  return scoped || targets[0];
}

function findHandoverSubsystemField(html: string): { field: string | null; clientState: string | null } {
  const cands: string[] = [];
  const re = /<input[^>]*name=["']([^"']*[Ss]ub[Ss]ystem[^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) cands.push(m[1]);
  const primary = cands.filter((c) => /PrimarySearchCriteria/i.test(c));
  const pool = primary.length ? primary : cands;
  const field = pool.find((c) => /SubSystemTextBox$/i.test(c))
    || pool.find((c) => /\$SubSystem$/.test(c))
    || pool.find((c) => /SubSystem_Input$/i.test(c))
    || null;
  const clientState = pool.find((c) => /SubSystem_ClientState$/i.test(c)) || null;
  return { field, clientState };
}

// Certificate TypeIDs + gate/groupBy contract lives in
// _shared/gohub-contract.ts (HANDOVER_CERTS). Do not redeclare maps here —
// import via getHandoverCertSpec(certType).

// ─── Metrics Logger (fire-and-forget) ────────────────────────

async function logFredMetric(
  supabaseClient: any,
  data: {
    user_id?: string;
    query_text?: string;
    tool_used: string;
    project_code?: string;
    subsystem_code?: string;
    outcome: string;
    result_count?: number;
    latency_ms?: number;
    error_details?: string;
  }
) {
  try {
    await supabaseClient.from("fred_interaction_metrics").insert({
      user_id: data.user_id || null,
      query_text: data.query_text || null,
      tool_used: data.tool_used,
      project_code: data.project_code || null,
      subsystem_code: data.subsystem_code || null,
      outcome: data.outcome,
      result_count: data.result_count || 0,
      latency_ms: data.latency_ms || 0,
      error_details: data.error_details || null,
    });
  } catch (e) {
    console.warn("[Fred] Metric log failed (non-fatal):", e);
  }
}

async function logFredResolutionFailure(
  supabaseClient: any,
  queryText: string,
  cleanedQuery: string,
  closestMatches: any[] = []
) {
  try {
    // Upsert: increment occurrence_count if exists
    const { data: existing } = await supabaseClient
      .from("fred_resolution_failures")
      .select("id, occurrence_count")
      .eq("cleaned_query", cleanedQuery)
      .maybeSingle();

    if (existing) {
      await supabaseClient
        .from("fred_resolution_failures")
        .update({
          occurrence_count: existing.occurrence_count + 1,
          last_seen: new Date().toISOString(),
          closest_matches: closestMatches,
        })
        .eq("id", existing.id);
    } else {
      await supabaseClient.from("fred_resolution_failures").insert({
        query_text: queryText,
        cleaned_query: cleanedQuery,
        closest_matches: closestMatches,
        occurrence_count: 1,
      });
    }
  } catch (e) {
    console.warn("[Fred] Resolution failure log failed (non-fatal):", e);
  }
}

// ─── Session Factory ─────────────────────────────────────────

async function getSession(supabaseClient: any, projectCode = "BNGL"): Promise<GocSessionManager> {
  const creds = await getGoCompletionsCredentials(supabaseClient);
  return new GocSessionManager(creds.portalUrl, creds.username, creds.password, projectCode);
}

// ─── Tool: search_completions_tags ───────────────────────────

export async function handleSearchCompletionsTags(
  args: any,
  supabaseClient: any,
  userId?: string
): Promise<any> {
  const start = Date.now();
  const projectCode = args.project_code || "BNGL";

  try {
    const session = await getSession(supabaseClient, projectCode);
    const { html, url, cookies } = await session.navigateTo(
      "GoCompletions/Completions/TagSearch.aspx"
    );

    // Build search parameters
    const searchParams: Record<string, string> = {};
    const prefix = "ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i0$TagSearch_PrimarySearchCriteria$";

    if (args.tag_number) searchParams[`${prefix}TagNumber`] = args.tag_number;
    if (args.sub_system) searchParams[`${prefix}SubSystem`] = args.sub_system;
    if (args.system) searchParams[`${prefix}System`] = args.system;
    if (args.discipline) searchParams[`${prefix}Discipline`] = args.discipline;
    searchParams["ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i7$SearchButton_input"] = "Search";

    const { html: resultHtml } = await postWithViewState(cookies, url, html, searchParams);

    // Parse results from RadGrid
    const rows = parseRadGridTable(resultHtml);
    const pagination = extractPaginationInfo(resultHtml);
    const maxResults = args.max_results || 50;
    const truncated = rows.length > maxResults;
    const results = rows.slice(0, maxResults);

    await logFredMetric(supabaseClient, {
      user_id: userId,
      query_text: JSON.stringify(args),
      tool_used: "search_completions_tags",
      project_code: projectCode,
      subsystem_code: args.sub_system,
      outcome: results.length > 0 ? "success" : "no_results",
      result_count: results.length,
      latency_ms: Date.now() - start,
    });

    return {
      found: results.length > 0,
      total_available: pagination.total,
      returned: results.length,
      truncated,
      project: projectCode,
      tags: results,
    };
  } catch (err: any) {
    await logFredMetric(supabaseClient, {
      user_id: userId,
      tool_used: "search_completions_tags",
      project_code: projectCode,
      outcome: "error",
      latency_ms: Date.now() - start,
      error_details: err.message,
    });
    return { found: false, error: err.message, project: projectCode };
  }
}

// ─── Tool: get_completion_status ─────────────────────────────

export async function handleGetCompletionStatus(
  args: any,
  supabaseClient: any,
  userId?: string
): Promise<any> {
  const start = Date.now();
  const projectCode = args.project_code || "BNGL";
  const itrClass = args.itr_class || "All";

  try {
    const session = await getSession(supabaseClient, projectCode);
    const data = await session.callMethod("GetSystems", { itrClass });

    if (!data || (Array.isArray(data) && data.length === 0)) {
      await logFredMetric(supabaseClient, {
        user_id: userId,
        tool_used: "get_completion_status",
        project_code: projectCode,
        outcome: "no_results",
        latency_ms: Date.now() - start,
      });
      return { found: false, message: "No system data returned from GoCompletions", project: projectCode };
    }

    let systems = Array.isArray(data) ? data : (data.Items || data.data || data.results || data.Systems || [data]);

    // Filter by system if specified
    if (args.system) {
      systems = systems.filter((s: any) => {
        const sysId = String(s.Number || s.SystemNumber || s.Name || s.Id || "");
        return sysId.includes(args.system);
      });
    }

    await logFredMetric(supabaseClient, {
      user_id: userId,
      tool_used: "get_completion_status",
      project_code: projectCode,
      outcome: "success",
      result_count: systems.length,
      latency_ms: Date.now() - start,
    });

    return {
      found: true,
      project: projectCode,
      itr_class: itrClass,
      system_count: systems.length,
      systems: systems.slice(0, 50).map((s: any) => ({
        system_id: s.Number || s.SystemNumber || s.Name || s.Id,
        description: s.Description || s.SystemDescription || s.Title || "",
        progress: s.Complete ?? s.Progress ?? s.OverallProgress ?? null,
        fields: Object.keys(s).slice(0, 20),
        raw: s,
      })),
    };
  } catch (err: any) {
    await logFredMetric(supabaseClient, {
      user_id: userId,
      tool_used: "get_completion_status",
      project_code: projectCode,
      outcome: "error",
      latency_ms: Date.now() - start,
      error_details: err.message,
    });
    return { found: false, error: err.message, project: projectCode };
  }
}

// ─── Tool: get_punchlist_details ─────────────────────────────

export async function handleGetPunchlistDetails(
  args: any,
  supabaseClient: any,
  userId?: string
): Promise<any> {
  const start = Date.now();
  const projectCode = args.project_code || "BNGL";

  try {
    const session = await getSession(supabaseClient, projectCode);
    const { html, url, cookies } = await session.navigateTo(
      "GoCompletions/Completions/Punchlists.aspx"
    );

    // Build search params
    const searchParams: Record<string, string> = {};
    if (args.sub_system) {
      // Try common field name patterns for punchlist search
      const prefix = "ctl00$ContentPlaceHolder1$";
      searchParams[`${prefix}SubSystem`] = args.sub_system;
      searchParams[`${prefix}SearchButton`] = "Search";
    }
    if (args.tag_number) {
      const prefix = "ctl00$ContentPlaceHolder1$";
      searchParams[`${prefix}TagNumber`] = args.tag_number;
    }

    const { html: resultHtml } = await postWithViewState(cookies, url, html, searchParams);
    const rows = parseRadGridTable(resultHtml);

    // Filter by category if specified
    let filteredRows = rows;
    if (args.category && args.category !== "both") {
      filteredRows = rows.filter(r => {
        const cat = (r.Category || r.PunchCategory || r.Type || "").toUpperCase();
        return cat.includes(args.category.toUpperCase());
      });
    }

    // Filter by status if specified
    if (args.status === "open") {
      filteredRows = filteredRows.filter(r => {
        const status = (r.Status || r.PunchStatus || "").toLowerCase();
        return !status.includes("closed") && !status.includes("cleared");
      });
    } else if (args.status === "closed") {
      filteredRows = filteredRows.filter(r => {
        const status = (r.Status || r.PunchStatus || "").toLowerCase();
        return status.includes("closed") || status.includes("cleared");
      });
    }

    await logFredMetric(supabaseClient, {
      user_id: userId,
      tool_used: "get_punchlist_details",
      project_code: projectCode,
      subsystem_code: args.sub_system,
      outcome: filteredRows.length > 0 ? "success" : "no_results",
      result_count: filteredRows.length,
      latency_ms: Date.now() - start,
    });

    return {
      found: filteredRows.length > 0,
      project: projectCode,
      total_items: filteredRows.length,
      filter: { category: args.category || "both", status: args.status || "all" },
      punch_items: filteredRows.slice(0, 100),
    };
  } catch (err: any) {
    await logFredMetric(supabaseClient, {
      user_id: userId,
      tool_used: "get_punchlist_details",
      project_code: projectCode,
      outcome: "error",
      latency_ms: Date.now() - start,
      error_details: err.message,
    });
    return { found: false, error: err.message, project: projectCode };
  }
}

// ─── Tool: get_handover_certificate_status ───────────────────

export async function handleGetHandoverCertificateStatus(
  args: any,
  supabaseClient: any,
  userId?: string
): Promise<any> {
  const start = Date.now();
  const projectCode = args.project_code || "BNGL";
  const certType = args.certificate_type || "MCC";

  try {
    const spec = getHandoverCertSpec(certType);
    const typeId = spec?.typeId;
    const gate = spec?.gate ?? null;
    const groupBy = spec?.groupBy ?? "SubSystem";

    if (!typeId) {
      // TypeID not in contract — use search page approach
      const session = await getSession(supabaseClient, projectCode);
      const { html, url, cookies } = await session.navigateTo(
        "GoCompletions/Handovers/HandoverSearch.aspx"
      );

      // Try to find the certificate type in the page
      const rows = parseRadGridTable(html);

      await logFredMetric(supabaseClient, {
        user_id: userId,
        tool_used: "get_handover_certificate_status",
        project_code: projectCode,
        outcome: rows.length > 0 ? "partial" : "no_results",
        result_count: rows.length,
        latency_ms: Date.now() - start,
      });

      return {
        found: rows.length > 0,
        project: projectCode,
        certificate_type: certType,
        note: `TypeID GUID for ${certType} not in HANDOVER_CERTS contract. Using generic handover search.`,
        certificates: rows.slice(0, 50),
      };
    }

    // Build URL from contract. Terminal certs (RFSU/RFOC/FAC) have gate=null
    // and must NOT include &HandoverGate (no numbered gate exists for them).
    const session = await getSession(supabaseClient, projectCode);
    const gateParam = gate !== null ? `&HandoverGate=${gate}` : "";
    const pagePath = `GoCompletions/Handovers/HandoverSearch.aspx?TypeID=${typeId}${gateParam}&GroupBy=${encodeURIComponent(groupBy)}&IsPartialHandover=False&IsMultiHandover=False&IsProcedure=False&HasInterimDate=False&AdditionalFilters=`;
    const navResp = await session.navigateTo(pagePath);
    let pageHtml = navResp.html;
    const pageUrl = navResp.url;
    const pageCookies = navResp.cookies;

    let rows = parseRadGridTable(pageHtml);
    let postbackFired = false;
    // Initial load shows an empty grid until Search posts back. Apply the
    // `_input`-stripped postback fix (same RadButton trap as TagSearch).
    if (rows.length === 0) {
      const target = findHandoverPostbackTarget(pageHtml);
      const subField = findHandoverSubsystemField(pageHtml);
      if (target) {
        const extra: Record<string, string> = {};
        if (args.sub_system && subField.field) {
          extra[subField.field] = args.sub_system;
          if (subField.clientState) {
            extra[subField.clientState] = JSON.stringify({
              value: args.sub_system, text: args.sub_system, enabled: true,
            });
          }
        }
        // RadAjax async partial postback (see postRadAjaxAsync docs).
        const { html: resultHtml, rawDelta } = await postRadAjaxAsync(
          pageCookies, pageUrl, pageHtml, target, extra
        );
        pageHtml = resultHtml;
        rows = parseRadGridTable(pageHtml);
        postbackFired = true;
        (args as any).__diag = {
          target,
          sub_field: subField.field,
          panel_html_len: resultHtml.length,
          has_rg_header: /rgHeader/i.test(resultHtml),
          has_thead: /<thead\b/i.test(resultHtml),
          rg_row_count: (resultHtml.match(/class="[^"]*\brgRow\b/gi) || []).length,
          rg_alt_count: (resultHtml.match(/class="[^"]*\brgAltRow\b/gi) || []).length,
          rg_master_open_count: (resultHtml.match(/class="[^"]*rgMasterTable/gi) || []).length,
          parsed_rows: rows.length,
          first_row_keys: rows[0] ? Object.keys(rows[0]) : null,
          first_row: rows[0] || null,
          // raw HTML around the first rgRow occurrence to inspect cells
          row_html_snip: (() => {
            const m = resultHtml.match(/<tr[^>]*class="[^"]*\brgRow\b[^"]*"[^>]*>[\s\S]{0,1200}/);
            return m ? m[0] : null;
          })(),
        };
      } else {
        (args as any).__diag = { target: null, reason: "no_search_button" };
      }
    }


    // Filter by subsystem if specified (client-side belt + suspenders).
    let filtered = rows;
    if (args.sub_system) {
      filtered = rows.filter(r => {
        const subSys = String(r["Sub System"] || r.SubSystem || r.sub_system || "");
        return subSys.includes(args.sub_system);
      });
    }


    await logFredMetric(supabaseClient, {
      user_id: userId,
      tool_used: "get_handover_certificate_status",
      project_code: projectCode,
      outcome: filtered.length > 0 ? "success" : "no_results",
      result_count: filtered.length,
      latency_ms: Date.now() - start,
    });

    return {
      found: filtered.length > 0,
      project: projectCode,
      certificate_type: certType,
      total_certificates: filtered.length,
      postback_fired: postbackFired,
      group_by: groupBy,
      diag: (args as any).__diag || null,
      certificates: filtered.slice(0, 200).map(r => ({
        certificate_ref: r[certType] || r.Certificate || r.Ref || Object.values(r)[0],
        sub_system: r["Sub System"] || r.SubSystem,
        discipline: r.Discipline || r["Discipline"] || null,
        tags: r.Tags,
        itrs: r.ITRs,
        outstanding_itrs: r["Outstanding ITRs"] || r.OutstandingITRs,
        generated_date: r["Generated Date"] || r.GeneratedDate,
        accepted_date: r["Accepted Date"] || r.AcceptedDate,
        raw: r,
      })),
    };
  } catch (err: any) {
    await logFredMetric(supabaseClient, {
      user_id: userId,
      tool_used: "get_handover_certificate_status",
      project_code: projectCode,
      outcome: "error",
      latency_ms: Date.now() - start,
      error_details: err.message,
    });
    return { found: false, error: err.message, project: projectCode };
  }
}

// ─── Tool: lookup_itr_for_equipment ──────────────────────────

export async function handleLookupITRForEquipment(
  args: any,
  supabaseClient: any,
  userId?: string
): Promise<any> {
  const start = Date.now();

  const results = lookupITRForEquipment(args.equipment_type, args.discipline);

  await logFredMetric(supabaseClient, {
    user_id: userId,
    tool_used: "lookup_itr_for_equipment",
    outcome: results.length > 0 ? "success" : "no_results",
    result_count: results.length,
    latency_ms: Date.now() - start,
  });

  if (results.length === 0) {
    // Log resolution failure for learning
    await logFredResolutionFailure(
      supabaseClient,
      args.equipment_type,
      args.equipment_type.toLowerCase().trim(),
      []
    );

    return {
      found: false,
      equipment_type: args.equipment_type,
      message: `No ITR allocation found for "${args.equipment_type}". Try a more specific equipment type name (e.g. "Centrifugal Pump", "Pressure Transmitter", "SDV").`,
      available_types: [
        "Pressure Transmitter", "Flow Transmitter", "Level Transmitter",
        "SDV/ESD Valve", "Control Valve", "PSV",
        "Centrifugal Pump", "Centrifugal Compressor", "Heat Exchanger",
        "LV Motor", "HV Switchboard", "Transformer",
        "Piping Hydrotest", "Piping Test Pack",
      ],
    };
  }

  return {
    found: true,
    equipment_type: args.equipment_type,
    matches: results.map(r => ({
      equipment: r.equipment_type,
      discipline: r.discipline,
      description: r.description || null,
      a_itrs: r.a_itrs,
      b_itrs: r.b_itrs,
      a_phase: "Mechanical Completion (Construction)",
      b_phase: "Pre-Commissioning (CSU)",
    })),
    note: "A-ITRs must be complete before MCC. B-ITRs must be complete before PCC/RFC.",
  };
}

// ─── A2A: Fred → Selma Document Readiness Check ─────────────

async function handleCheckDocumentReadiness(
  args: any,
  supabaseClient: any,
  userId?: string
): Promise<any> {
  const subSystem = args.sub_system || '';
  const projectCode = args.project_code || 'BNGL';
  const discipline = args.discipline || null;
  const certificatePhase = args.certificate_phase || 'MCC';

  // Define which document types are critical per phase
  const phaseDocs: Record<string, string[]> = {
    MCC: ['As-Built P&ID', 'Piping GA', 'Isometric Drawing', 'Instrument Datasheet', 'Cable Schedule', 'Equipment Datasheet'],
    PCC: ['Loop Diagram', 'Cause & Effect Matrix', 'Control Narrative', 'Operating Procedure', 'Pre-Commissioning Procedure'],
    RFSU: ['Operating Procedure', 'Maintenance Manual', 'Spare Parts List', 'Safety Case', 'HAZOP Close-out'],
    FAC: ['As-Built Drawings (all)', 'O&M Manual', 'Final Inspection Report', 'Warranty Certificate'],
  };

  const criticalDocs = phaseDocs[certificatePhase] || phaseDocs['MCC'];

  try {
    // Call Selma's A2A endpoint
    const a2aSecret = Deno.env.get('A2A_SHARED_SECRET') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    
    const a2aPayload = {
      source_agent: 'fred',
      target_agent: 'selma',
      request_type: 'document_readiness_check',
      parameters: {
        sub_system: subSystem,
        project_code: projectCode,
        discipline: discipline,
        certificate_phase: certificatePhase,
        critical_document_types: criticalDocs,
      },
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/selma-a2a`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${a2aSecret}`,
        'x-a2a-source': 'fred',
      },
      body: JSON.stringify(a2aPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Fred→Selma A2A failed (${response.status}): ${errText}`);
      return {
        status: 'a2a_unavailable',
        sub_system: subSystem,
        project_code: projectCode,
        certificate_phase: certificatePhase,
        critical_documents: criticalDocs,
        message: `Document readiness check via Selma is currently unavailable. The following document types should be verified manually for ${certificatePhase} readiness:`,
        manual_checklist: criticalDocs.map(doc => ({ document_type: doc, status: 'VERIFY MANUALLY' })),
      };
    }

    const selmaResult = await response.json();
    return {
      status: 'success',
      sub_system: subSystem,
      project_code: projectCode,
      certificate_phase: certificatePhase,
      document_readiness: selmaResult,
      critical_documents: criticalDocs,
    };
  } catch (err) {
    console.error(`Fred→Selma A2A error: ${err}`);
    return {
      status: 'a2a_error',
      sub_system: subSystem,
      project_code: projectCode,
      certificate_phase: certificatePhase,
      critical_documents: criticalDocs,
      message: `Could not reach Selma for document readiness. Verify these document types manually for ${certificatePhase}:`,
      manual_checklist: criticalDocs.map(doc => ({ document_type: doc, status: 'VERIFY MANUALLY' })),
    };
  }
}

// ─── Handler Router ──────────────────────────────────────────

export async function executeFredTool(
  toolName: string,
  args: any,
  supabaseClient: any,
  userId?: string
): Promise<any> {
  switch (toolName) {
    case "search_completions_tags":
      return handleSearchCompletionsTags(args, supabaseClient, userId);
    case "get_completion_status":
      return handleGetCompletionStatus(args, supabaseClient, userId);
    case "get_punchlist_details":
      return handleGetPunchlistDetails(args, supabaseClient, userId);
    case "get_handover_certificate_status":
      return handleGetHandoverCertificateStatus(args, supabaseClient, userId);
    case "lookup_itr_for_equipment":
      return handleLookupITRForEquipment(args, supabaseClient, userId);
    case "check_document_readiness":
      return handleCheckDocumentReadiness(args, supabaseClient, userId);
    case "search_systems_subsystems":
      return handleSearchSystemsSubsystems(args, supabaseClient, userId);
    default:
      return { error: `Unknown Fred tool: ${toolName}` };
  }
}

// ─── Tool: search_systems_subsystems ─────────────────────────

export async function handleSearchSystemsSubsystems(
  args: any,
  supabaseClient: any,
  userId?: string
): Promise<any> {
  const start = Date.now();
  const filter = String(args.filter || "").trim();
  const maxResults = Math.min(Number(args.max_results) || 100, 500);

  if (!filter) {
    return { found: false, error: "filter is required" };
  }

  try {
    // No projectCode — picker spans every tile in the BGC instance
    const session = await getSession(supabaseClient, "");
    const rows = await session.searchSubSystems(filter);

    if (!rows.length) {
      await logFredMetric(supabaseClient, {
        user_id: userId,
        query_text: filter,
        tool_used: "search_systems_subsystems",
        outcome: "no_results",
        latency_ms: Date.now() - start,
      });
      return {
        found: false,
        filter,
        message: `No systems or subsystems matched "${filter}" via the GoHub Reports SubSystem picker.`,
      };
    }

    const f = filter.toUpperCase();
    const norm = (v: any) => (v == null ? "" : String(v));
    const matchString = (v: any) => norm(v).toUpperCase().includes(f);
    const matched = rows.filter((r: any) =>
      matchString(r.SubSystem) || matchString(r.SubSystemNumber) ||
      matchString(r.Number) || matchString(r.Name) ||
      matchString(r.System) || matchString(r.SystemNumber) ||
      matchString(r.Description) || matchString(r.SubSystemDescription)
    );
    const finalRows = (matched.length ? matched : rows).slice(0, maxResults);

    await logFredMetric(supabaseClient, {
      user_id: userId,
      query_text: filter,
      tool_used: "search_systems_subsystems",
      outcome: "success",
      result_count: finalRows.length,
      latency_ms: Date.now() - start,
    });

    return {
      found: true,
      filter,
      total_available: matched.length || rows.length,
      returned: finalRows.length,
      truncated: (matched.length || rows.length) > finalRows.length,
      subsystems: finalRows.map((r: any) => ({
        sub_system: r.SubSystem || r.SubSystemNumber || r.Number || r.Name,
        system: r.System || r.SystemNumber || r.ParentSystem,
        description: r.Description || r.SubSystemDescription || r.Name || "",
        raw: r,
      })),
    };
  } catch (err: any) {
    await logFredMetric(supabaseClient, {
      user_id: userId,
      query_text: filter,
      tool_used: "search_systems_subsystems",
      outcome: "error",
      latency_ms: Date.now() - start,
      error_details: err.message,
    });
    return { found: false, filter, error: err.message };
  }
}

