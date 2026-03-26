import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractFormFields(html: string): Array<{ name: string; type: string; value: string }> {
  const fields: Array<{ name: string; type: string; value: string }> = [];
  const inputRegex = /<input[^>]*>/gi;
  let m;
  while ((m = inputRegex.exec(html)) !== null) {
    const tag = m[0];
    const name = tag.match(/name=["']([^"']+)["']/i)?.[1] ?? "";
    if (!name) continue;
    const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "text";
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? "";
    fields.push({ name, type, value });
  }
  return fields;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();
}

// Extract column headers from the result grid
function extractColumnHeaders(html: string): string[] {
  const headers: string[] = [];
  // Look for th elements or header-style divs
  const thPattern = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let m;
  while ((m = thPattern.exec(html)) !== null) {
    const text = stripTags(m[1]);
    if (text) headers.push(text);
  }
  // Also try Assai's Active Widgets column definitions
  const colPattern = /setColumnText\s*\(\s*(\d+)\s*,\s*"([^"]+)"/gi;
  while ((m = colPattern.exec(html)) !== null) {
    headers.push(m[2]);
  }
  // Also try header labels from JS
  const headerPattern = /columns?\s*[\[=].*?["']([^"']+)["']/gi;
  while ((m = headerPattern.exec(html)) !== null) {
    if (m[1].length > 1 && m[1].length < 50) headers.push(m[1]);
  }
  return headers;
}

// Parse the Active Widgets grid data (AW uses a JS-based grid, not standard HTML tables)
function extractGridData(html: string): { rows: string[][]; gridVarName: string; columnCount: number } {
  const rows: string[][] = [];
  let gridVarName = "";
  let columnCount = 0;

  // AW grid data is typically set via setCellText(row, col, "value") or similar
  const setCellPattern = /setCellText\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*["']([^"']*)["']\s*\)/gi;
  let m;
  while ((m = setCellPattern.exec(html)) !== null) {
    const row = parseInt(m[1]);
    const col = parseInt(m[2]);
    const value = m[3];
    while (rows.length <= row) rows.push([]);
    while (rows[row].length <= col) rows[row].push("");
    rows[row][col] = value;
    if (col + 1 > columnCount) columnCount = col + 1;
  }

  // Also try setCellData pattern
  const setDataPattern = /setCellData\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*["']([^"']*)["']\s*\)/gi;
  while ((m = setDataPattern.exec(html)) !== null) {
    const row = parseInt(m[1]);
    const col = parseInt(m[2]);
    const value = m[3];
    while (rows.length <= row) rows.push([]);
    while (rows[row].length <= col) rows[row].push("");
    rows[row][col] = value;
    if (col + 1 > columnCount) columnCount = col + 1;
  }

  // Try to find grid variable name
  const gridMatch = html.match(/var\s+(\w+)\s*=\s*new\s+AW\.UI\.Grid/i);
  if (gridMatch) gridVarName = gridMatch[1];

  return { rows, gridVarName, columnCount };
}

// Extract data from HTML tables (fallback)
function parseHTMLTables(html: string): Array<{ tableIndex: number; rows: string[][] }> {
  const tables: Array<{ tableIndex: number; rows: string[][] }> = [];
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  let tableIndex = 0;
  while ((tableMatch = tablePattern.exec(html)) !== null) {
    tableIndex++;
    const tableHtml = tableMatch[1];
    const tableRows: string[][] = [];
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
      const cells: string[] = [];
      const cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
        cells.push(stripTags(cellMatch[1]));
      }
      if (cells.length >= 2) {
        tableRows.push(cells);
      }
    }
    if (tableRows.length > 0) {
      tables.push({ tableIndex, rows: tableRows });
    }
  }
  return tables;
}

// Extract JavaScript data arrays/objects from the page
function extractJSData(html: string): Record<string, any> {
  const data: Record<string, any> = {};
  
  // Look for JSON-like data structures
  const jsonArrayPattern = /var\s+(\w+)\s*=\s*(\[[\s\S]*?\]);/gi;
  let m;
  while ((m = jsonArrayPattern.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[2]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        data[m[1]] = { type: "array", length: parsed.length, first_3: parsed.slice(0, 3) };
      }
    } catch { /* not valid JSON */ }
  }

  // Look for setCellText calls to count them
  const setCellCount = (html.match(/setCellText/gi) || []).length;
  data._setCellText_count = setCellCount;

  // Look for document number patterns in the raw HTML
  const docNumPattern = /\b([A-Z]{2,5}-\d{3,}-[A-Z0-9-]+)\b/g;
  const docNums = new Set<string>();
  while ((m = docNumPattern.exec(html)) !== null && docNums.size < 20) {
    docNums.add(m[1]);
  }
  data._document_numbers_found = Array.from(docNums);

  // Look for row count info
  const rowCountMatch = html.match(/(\d+)\s+(?:of|records|results|total|items)/i);
  if (rowCountMatch) data._total_records_hint = rowCountMatch[0];

  // Extract the "Showing results X to Y of Z" text
  const showingMatch = html.match(/Showing\s+results?\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d*)/i);
  if (showingMatch) {
    data._showing = { from: showingMatch[1], to: showingMatch[2], total: showingMatch[3] || "unknown" };
  }

  return data;
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

    const loginResult = await loginAssai(resolvedBase, username, password, resolvedDb);
    if (!loginResult.success || !loginResult.cookies?.length) {
      return new Response(JSON.stringify({ step: "login", error: loginResult.error }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cookieHeader = loginResult.cookies.join("; ");
    const results: Record<string, any> = { login: "ok" };

    // Step 1: Fetch search form to get hidden fields
    const searchUrl = `${awBase}/search.aweb?subclass_type=DES_DOC`;
    const searchResp = await fetch(searchUrl, {
      headers: { Cookie: cookieHeader, Accept: "text/html" },
      redirect: "follow",
    });
    const searchHtml = await searchResp.text();
    const fields = extractFormFields(searchHtml);

    // Step 2: Submit with EMPTY text fields (proven working from probe5)
    const formData = new URLSearchParams();
    for (const f of fields) {
      if (f.type === "hidden" && f.name && f.value) {
        formData.set(f.name, f.value);
      }
    }
    // Leave text fields empty — this triggers "show all" in Assai
    for (const f of fields) {
      if (f.type === "text" || f.type === "") {
        formData.set(f.name, "");
      }
    }
    formData.set("subclass_type", "DES_DOC");

    console.log(`[probe6] Submitting empty search to result.aweb...`);
    const submitResp = await fetch(`${awBase}/result.aweb`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
        Referer: searchUrl,
      },
      body: formData.toString(),
      redirect: "follow",
    });
    const resultHtml = await submitResp.text();

    results.response = {
      status: submitResp.status,
      length: resultHtml.length,
      title: resultHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "",
    };

    // Step 3: Deep parse the result
    // 3a: Column headers
    const headers = extractColumnHeaders(resultHtml);
    results.column_headers = headers;

    // 3b: AW Grid data (setCellText)
    const gridData = extractGridData(resultHtml);
    results.grid_data = {
      var_name: gridData.gridVarName,
      column_count: gridData.columnCount,
      row_count: gridData.rows.length,
      first_10: gridData.rows.slice(0, 10),
    };

    // 3c: HTML tables
    const tables = parseHTMLTables(resultHtml);
    results.html_tables = tables.map(t => ({
      table_index: t.tableIndex,
      row_count: t.rows.length,
      first_5: t.rows.slice(0, 5),
    }));

    // 3d: JS data extraction
    const jsData = extractJSData(resultHtml);
    results.js_data = jsData;

    // 3e: Look for specific Assai patterns in the HTML
    // The AW grid typically uses a specific div structure
    const awPatterns = {
      has_aw_grid: /AW\.UI\.Grid/i.test(resultHtml),
      has_aw_list: /AW\.UI\.List/i.test(resultHtml),
      has_data_model: /dataModel|DataModel/g.test(resultHtml),
      has_xml_data: /xmlData|XMLData/i.test(resultHtml),
      has_json_data: /jsonData|JSONData/i.test(resultHtml),
      has_row_data: /rowData|row_data/i.test(resultHtml),
      has_cell_text: /setCellText/i.test(resultHtml),
      has_cell_data: /setCellData/i.test(resultHtml),
      has_add_row: /addRow/i.test(resultHtml),
      has_populate: /populate/i.test(resultHtml),
      has_load_data: /loadData/i.test(resultHtml),
      has_setContent: /setContent/i.test(resultHtml),
      has_iframe: /<iframe/i.test(resultHtml),
    };
    results.aw_patterns = awPatterns;

    // 3f: Extract script blocks for analysis
    const scriptBlocks: string[] = [];
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let sm;
    while ((sm = scriptPattern.exec(resultHtml)) !== null) {
      const content = sm[1].trim();
      if (content.length > 50 && content.length < 50000) {
        scriptBlocks.push(content.substring(0, 2000));
      }
    }
    results.script_blocks = {
      count: scriptBlocks.length,
      previews: scriptBlocks.slice(0, 5),
    };

    // 3g: Extract a chunk of the HTML around any table/grid area
    const gridAreaStart = resultHtml.indexOf("grid") !== -1 ? resultHtml.indexOf("grid") : resultHtml.indexOf("Grid");
    if (gridAreaStart > -1) {
      results.grid_area_preview = resultHtml.substring(Math.max(0, gridAreaStart - 200), gridAreaStart + 3000);
    }

    // 3h: Extract a section after "Showing results"
    const showingIdx = resultHtml.indexOf("Showing results");
    if (showingIdx > -1) {
      results.after_showing_results = resultHtml.substring(showingIdx, showingIdx + 5000);
    }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[probe6] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
