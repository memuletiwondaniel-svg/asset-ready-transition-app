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
  extractPaginationInfo,
  navigateToPage,
} from "../gocompletions-auth.ts";
import { lookupITRForEquipment } from "./itr-matrix.ts";

// Known MCC TypeID GUID — others to be captured from live session
const CERTIFICATE_TYPE_IDS: Record<string, string> = {
  MCC: "aafaeac5-e094-df11-b37f-0050ba0820b5",
  // PCC, RFC, RFSU, FAC, MCC-DAC, PCDAC, RFOC: to be captured
};

const CERTIFICATE_GATES: Record<string, number> = {
  MCC: 1, PCC: 2, RFC: 3, RFSU: 4, FAC: 5,
  "MCC-DAC": 1, PCDAC: 2, RFOC: 3,
};

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
    const typeId = CERTIFICATE_TYPE_IDS[certType];
    const gate = CERTIFICATE_GATES[certType] || 1;

    if (!typeId) {
      // TypeID not yet captured — use search page approach
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
        note: `TypeID GUID for ${certType} not yet captured. Using generic handover search.`,
        certificates: rows.slice(0, 50),
      };
    }

    // Build URL with TypeID GUID
    const session = await getSession(supabaseClient, projectCode);
    const pagePath = `GoCompletions/Handovers/HandoverSearch.aspx?TypeID=${typeId}&HandoverGate=${gate}&GroupBy=SubSystem&IsPartialHandover=False&IsMultiHandover=False&IsProcedure=False&HasInterimDate=False&AdditionalFilters=`;
    const { html } = await session.navigateTo(pagePath);

    const rows = parseRadGridTable(html);

    // Filter by subsystem if specified
    let filtered = rows;
    if (args.sub_system) {
      filtered = rows.filter(r => {
        const subSys = (r["Sub System"] || r.SubSystem || r.sub_system || "");
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
      certificates: filtered.slice(0, 100).map(r => ({
        certificate_ref: r[certType] || r.Certificate || r.Ref || Object.values(r)[0],
        sub_system: r["Sub System"] || r.SubSystem,
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
    default:
      return { error: `Unknown Fred tool: ${toolName}` };
  }
}
