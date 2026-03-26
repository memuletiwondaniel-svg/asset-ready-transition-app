import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Make a DWR plaincall and return the raw response text */
async function dwrCall(
  awBase: string,
  dbName: string,
  cookieHeader: string,
  methodName: string,
  params: string[] = [],
  page?: string,
): Promise<{ status: number; text: string }> {
  const url = `${awBase}/dwr/call/plaincall/DWRBean.${methodName}.dwr`;
  const paramLines = params.map((p, i) => `c0-param${i}=${p}`).join("\n");
  const body = [
    "callCount=1",
    "windowName=",
    "c0-scriptName=DWRBean",
    `c0-methodName=${methodName}`,
    "c0-id=0",
    paramLines,
    "batchId=1",
    "instanceId=0",
    `page=${encodeURIComponent(page || `/AW${dbName}/forward.aweb?page=root/body`)}`,
    `scriptSessionId=${Date.now()}`,
    "",
  ].join("\n");

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain", Cookie: cookieHeader },
    body,
    redirect: "manual",
  });
  const text = await resp.text();
  return { status: resp.status, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: creds } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "assai")
      .limit(1)
      .maybeSingle();

    if (!creds) {
      return new Response(JSON.stringify({ success: false, error: "No Assai credentials" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = (creds.base_url || "").replace(/\/+$/, "");
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");
    const dbName = creds.db_name || "";

    const normalizedBase = baseUrl.replace(/\/AW[^/]+\/login\.aweb.*$/i, "").replace(/\/+$/, "");
    let resolvedBase: string;
    try { resolvedBase = new URL(normalizedBase).origin; } catch { resolvedBase = normalizedBase; }
    const resolvedDb = dbName || (() => { const m = baseUrl.match(/\/AW([^/]+?)(?:\/|$)/i); return m?.[1]?.toLowerCase() ?? ""; })();

    const awBase = `${resolvedBase}/AW${resolvedDb}`;

    // Login
    const loginResult = await loginAssai(resolvedBase, username, password, resolvedDb);
    if (!loginResult.success || !loginResult.cookies?.length) {
      return new Response(JSON.stringify({ success: false, step: "login", error: loginResult.error }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cookieHeader = loginResult.cookies.join("; ");
    const results: Record<string, any> = { login: "ok", probes: {} };

    // ── Probe 1: getRowCount (no params)
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getRowCount");
      results.probes["getRowCount"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getRowCount"] = { error: String(e) }; }

    // ── Probe 2: getSearchFieldOrder (no params)
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getSearchFieldOrder");
      results.probes["getSearchFieldOrder"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getSearchFieldOrder"] = { error: String(e) }; }

    // ── Probe 3: getSearchIndicators (no params)
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getSearchIndicators");
      results.probes["getSearchIndicators"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getSearchIndicators"] = { error: String(e) }; }

    // ── Probe 4: getInboxRowCounts (no params)
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getInboxRowCounts");
      results.probes["getInboxRowCounts"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getInboxRowCounts"] = { error: String(e) }; }

    // ── Probe 5: getCurrentProject (no params)
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getCurrentProject");
      results.probes["getCurrentProject"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getCurrentProject"] = { error: String(e) }; }

    // ── Probe 6: getServerInfo (no params)
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getServerInfo");
      results.probes["getServerInfo"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getServerInfo"] = { error: String(e) }; }

    // ── Probe 7: getDWRInfo (no params)
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getDWRInfo");
      results.probes["getDWRInfo"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getDWRInfo"] = { error: String(e) }; }

    // ── Probe 8: getAvailableProjects with various params
    const projectParamCombos = [
      { label: "getAvailableProjects(empty,empty)", params: ["string:", "string:"] },
      { label: "getAvailableProjects(%,%)", params: ["string:%", "string:%"] },
      { label: "getAvailableProjects(null,null)", params: ["null:null", "null:null"] },
    ];
    for (const combo of projectParamCombos) {
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getAvailableProjects", combo.params);
        results.probes[combo.label] = { status: r.status, response: r.text.substring(0, 3000) };
      } catch (e) { results.probes[combo.label] = { error: String(e) }; }
    }

    // ── Probe 9: getQuickSearchKeyWords with wildcard
    const searchCombos = [
      { label: "getQuickSearchKeyWords(*,DES_DOC)", params: ["string:*", "string:DES_DOC"] },
      { label: "getQuickSearchKeyWords(%,DES_DOC)", params: ["string:%", "string:DES_DOC"] },
      { label: "getQuickSearchKeyWords(,DES_DOC)", params: ["string:", "string:DES_DOC"] },
    ];
    for (const combo of searchCombos) {
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getQuickSearchKeyWords", combo.params);
        results.probes[combo.label] = { status: r.status, response: r.text.substring(0, 3000) };
      } catch (e) { results.probes[combo.label] = { error: String(e) }; }
    }

    // ── Probe 10: getQuickSearchKeyWordOptions
    for (const combo of [
      { label: "getQuickSearchKeyWordOptions(DES_DOC,empty)", params: ["string:DES_DOC", "string:"] },
      { label: "getQuickSearchKeyWordOptions(empty,empty)", params: ["string:", "string:"] },
    ]) {
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getQuickSearchKeyWordOptions", combo.params);
        results.probes[combo.label] = { status: r.status, response: r.text.substring(0, 3000) };
      } catch (e) { results.probes[combo.label] = { error: String(e) }; }
    }

    // ── Probe 11: findDoreByDocumentNr with wildcard
    for (const combo of [
      { label: "findDoreByDocumentNr(%)", params: ["string:%"] },
      { label: "findDoreByDocumentNr(*)", params: ["string:*"] },
    ]) {
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "findDoreByDocumentNr", combo.params);
        results.probes[combo.label] = { status: r.status, response: r.text.substring(0, 3000) };
      } catch (e) { results.probes[combo.label] = { error: String(e) }; }
    }

    // ── Probe 12: getDashboardItems (no params)
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getDashboardItems");
      results.probes["getDashboardItems"] = { status: r.status, response: r.text.substring(0, 3000) };
    } catch (e) { results.probes["getDashboardItems"] = { error: String(e) }; }

    // ── Probe 13: getForward — try to navigate to document register
    for (const page of [
      "string:root/body/documentregister",
      "string:root/body/result",
      "string:documentregister",
      "string:result",
    ]) {
      const label = `getForward(${page})`;
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getForward", [page]);
        results.probes[label] = { status: r.status, response: r.text.substring(0, 3000) };
      } catch (e) { results.probes[label] = { error: String(e) }; }
    }

    // ── Probe 14: getParameter with common param names
    for (const paramName of ["DOCUMENT_REGISTER", "SEARCH_RESULT", "MAX_ROWS", "SUBCLASS_TYPE"]) {
      const label = `getParameter(${paramName})`;
      try {
        const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getParameter", [`string:${paramName}`]);
        results.probes[label] = { status: r.status, response: r.text.substring(0, 1000) };
      } catch (e) { results.probes[label] = { error: String(e) }; }
    }

    // ── Probe 15: getTabRowCount (no params)
    try {
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getTabRowCount");
      results.probes["getTabRowCount"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getTabRowCount"] = { error: String(e) }; }

    // ── Probe 16: Try navigating via GET to establish document view context, then getRowCount
    try {
      // Navigate to the document list view via the body page
      const navResp = await fetch(`${awBase}/forward.aweb?page=root/body&subclass_type=DES_DOC`, {
        headers: { Cookie: cookieHeader, Accept: "text/html" },
        redirect: "follow",
      });
      await navResp.text();

      // Now try getRowCount with this context
      const r = await dwrCall(awBase, resolvedDb, cookieHeader, "getRowCount", [], 
        `/AW${resolvedDb}/forward.aweb?page=root/body&subclass_type=DES_DOC`);
      results.probes["getRowCount_after_nav_DES_DOC"] = { status: r.status, response: r.text.substring(0, 2000) };
    } catch (e) { results.probes["getRowCount_after_nav_DES_DOC"] = { error: String(e) }; }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
