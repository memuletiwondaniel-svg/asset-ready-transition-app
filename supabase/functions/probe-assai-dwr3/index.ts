import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function dwrCall(
  awBase: string, dbName: string, cookieHeader: string,
  methodName: string, params: string[] = [], page?: string,
): Promise<{ status: number; text: string }> {
  const url = `${awBase}/dwr/call/plaincall/DWRBean.${methodName}.dwr`;
  const paramLines = params.map((p, i) => `c0-param${i}=${p}`).join("\n");
  const body = [
    "callCount=1", "windowName=",
    "c0-scriptName=DWRBean", `c0-methodName=${methodName}`, "c0-id=0",
    paramLines, "batchId=1", "instanceId=0",
    `page=${encodeURIComponent(page || `/AW${dbName}/forward.aweb?page=root/body`)}`,
    `scriptSessionId=${Date.now()}`, "",
  ].join("\n");
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain", Cookie: cookieHeader },
    body, redirect: "manual",
  });
  return { status: resp.status, text: await resp.text() };
}

async function fetchPage(url: string, cookieHeader: string): Promise<{ status: number; text: string }> {
  const resp = await fetch(url, {
    headers: { Cookie: cookieHeader, Accept: "text/html" },
    redirect: "follow",
  });
  return { status: resp.status, text: await resp.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: creds } = await supabase.from("dms_sync_credentials").select("*")
      .eq("dms_platform", "assai").limit(1).maybeSingle();
    if (!creds) return new Response(JSON.stringify({ error: "No creds" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const baseUrl = (creds.base_url || "").replace(/\/+$/, "");
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");
    const dbName = creds.db_name || "";
    let resolvedBase: string;
    try { resolvedBase = new URL(baseUrl.replace(/\/AW[^/]+\/login\.aweb.*$/i, "").replace(/\/+$/, "")).origin; }
    catch { resolvedBase = baseUrl; }
    const resolvedDb = dbName || (() => { const m = baseUrl.match(/\/AW([^/]+?)(?:\/|$)/i); return m?.[1]?.toLowerCase() ?? ""; })();
    const awBase = `${resolvedBase}/AW${resolvedDb}`;

    // Login
    const loginResult = await loginAssai(resolvedBase, username, password, resolvedDb);
    if (!loginResult.success || !loginResult.cookies?.length) {
      return new Response(JSON.stringify({ step: "login", error: loginResult.error }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cookieHeader = loginResult.cookies.join("; ");
    const results: Record<string, any> = { login: "ok", probes: {} };

    // ── Phase A: Navigate to the main content frame to establish session context
    // The Assai login redirects to forward.aweb?page=root/body which is the dashboard.
    // The browser then loads the menu frame and navigates via JavaScript.
    // We need to mimic the initial page load sequence.

    // A1: Hit the main entry point after login (contentUrl from login form)
    const entryUrls = [
      `${awBase}/forward.aweb?page=root/body`,
      `${awBase}/forward.aweb?page=root/body&subclass_type=DES_DOC`,
      `${awBase}/forward.aweb?page=root/body&subclass_type=DOCUMENT`,
    ];
    for (const url of entryUrls) {
      const key = url.replace(awBase, "");
      try {
        const r = await fetchPage(url, cookieHeader);
        results.probes[`nav:${key}`] = { status: r.status, length: r.text.length, preview: r.text.substring(0, 500) };
      } catch (e) { results.probes[`nav:${key}`] = { error: String(e) }; }
    }

    // ── Phase B: Try main.aweb which is sometimes the search entry point
    const mainUrls = [
      `${awBase}/main.aweb`,
      `${awBase}/main.aweb?subclass_type=DES_DOC`,
      `${awBase}/menu.aweb`,
      `${awBase}/search.aweb?subclass_type=DES_DOC`,
      `${awBase}/search.aweb?subclass_type=DOCUMENT`,
      `${awBase}/result.aweb`,
    ];
    for (const url of mainUrls) {
      const key = url.replace(awBase, "");
      try {
        const r = await fetchPage(url, cookieHeader);
        const hasTable = r.text.includes("<table") || r.text.includes("<TABLE");
        const hasForm = r.text.includes("<form") || r.text.includes("<FORM");
        const hasError = r.text.includes("error") || r.text.includes("Error");
        results.probes[`page:${key}`] = {
          status: r.status, length: r.text.length, hasTable, hasForm, hasError,
          preview: r.text.substring(0, 1500),
        };
      } catch (e) { results.probes[`page:${key}`] = { error: String(e) }; }
    }

    // ── Phase C: switchProject to ISG (seq 53322) then try getRowCount
    try {
      const sw = await dwrCall(awBase, resolvedDb, cookieHeader, "switchProject", ["string:53322"]);
      results.probes["switchProject(53322)"] = { status: sw.status, response: sw.text.substring(0, 2000) };
    } catch (e) { results.probes["switchProject(53322)"] = { error: String(e) }; }

    // After switch, try getRowCount again
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getRowCount");
      results.probes["getRowCount_after_switch"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getRowCount_after_switch"] = { error: String(e) }; }

    // ── Phase D: Try to use the DWR main() method — this might initialize the view
    // DWRBean.main takes 1 param, likely a string[] or page reference
    const mainCalls = [
      { label: "main(DES_DOC)", params: ["string:DES_DOC"] },
      { label: "main(DOCUMENT)", params: ["string:DOCUMENT"] },
      { label: "main(result)", params: ["string:result"] },
      { label: "main(search)", params: ["string:search"] },
    ];
    for (const call of mainCalls) {
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "main", call.params);
        results.probes[call.label] = { status: r.status, response: r.text.substring(0, 3000) };
      } catch (e) { results.probes[call.label] = { error: String(e) }; }
    }

    // ── Phase E: Try getEnttSeqNr — gets entity sequence number for a subclass
    const enttCalls = [
      { label: "getEnttSeqNr(DES_DOC)", params: ["string:DES_DOC"] },
      { label: "getEnttSeqNr(DOCUMENT)", params: ["string:DOCUMENT"] },
      { label: "getEnttSeqNr(CORR)", params: ["string:CORR"] },
    ];
    for (const call of enttCalls) {
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getEnttSeqNr", call.params);
        results.probes[call.label] = { status: r.status, response: r.text.substring(0, 2000) };
      } catch (e) { results.probes[call.label] = { error: String(e) }; }
    }

    // ── Phase F: Try getSearchFieldOrder with numeric seq params
    // From DWRBean.js: getSearchFieldOrder(p0, p1) — 2 params
    const sfoCalls = [
      { label: "getSearchFieldOrder(DES_DOC,0)", params: ["string:DES_DOC", "number:0"] },
      { label: "getSearchFieldOrder(1,0)", params: ["number:1", "number:0"] },
    ];
    for (const call of sfoCalls) {
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getSearchFieldOrder", call.params);
        results.probes[call.label] = { status: r.status, response: r.text.substring(0, 3000) };
      } catch (e) { results.probes[call.label] = { error: String(e) }; }
    }

    // ── Phase G: Try getLabel for common screen labels — reveals UI structure
    const labelCalls = [
      "SEARCH", "RESULT", "DOCUMENT", "DES_DOC", "MENU", "INBOX",
    ];
    for (const lbl of labelCalls) {
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getLabel", [`string:${lbl}`]);
        const match = r.text.match(/_remoteHandleCallback\('1','0',"?([^")\n]*)"?\)/);
        results.probes[`getLabel(${lbl})`] = match?.[1] ?? r.text.substring(0, 500);
      } catch (e) { results.probes[`getLabel(${lbl})`] = { error: String(e) }; }
    }

    // ── Phase H: Try isAllowed to see permissions
    const permCalls = [
      { label: "isAllowed(SEARCH,VIEW)", params: ["string:SEARCH", "string:VIEW"] },
      { label: "isAllowed(DOCUMENT,VIEW)", params: ["string:DOCUMENT", "string:VIEW"] },
      { label: "isAllowed(EXPORT,VIEW)", params: ["string:EXPORT", "string:VIEW"] },
      { label: "isAllowed(RESULT,VIEW)", params: ["string:RESULT", "string:VIEW"] },
    ];
    for (const call of permCalls) {
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "isAllowed", call.params);
        const match = r.text.match(/_remoteHandleCallback\('1','0',([^)]+)\)/);
        results.probes[call.label] = match?.[1] ?? r.text.substring(0, 500);
      } catch (e) { results.probes[call.label] = { error: String(e) }; }
    }

    // ── Phase I: Try getDashboardGraphData/getDashboardItems with project seqnr
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getDashboardGraphData", ["string:53322"]);
      results.probes["getDashboardGraphData(53322)"] = { status: r.status, response: r.text.substring(0, 3000) };
    } catch (e) { results.probes["getDashboardGraphData(53322)"] = { error: String(e) }; }

    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getAssignedDashboards", ["string:53322"]);
      results.probes["getAssignedDashboards(53322)"] = { status: r.status, response: r.text.substring(0, 3000) };
    } catch (e) { results.probes["getAssignedDashboards(53322)"] = { error: String(e) }; }

    // ── Phase J: Try getChartData with various params
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getChartData", ["string:document_status"]);
      results.probes["getChartData(document_status)"] = { status: r.status, response: r.text.substring(0, 3000) };
    } catch (e) { results.probes["getChartData(document_status)"] = { error: String(e) }; }

    // ── Phase K: Try the export-related approach — getDownloadableTransmittalFiles
    // Also try getWorkAreaList which might list document areas
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getWorkAreaList");
      results.probes["getWorkAreaList"] = { status: r.status, response: r.text.substring(0, 3000) };
    } catch (e) { results.probes["getWorkAreaList"] = { error: String(e) }; }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
