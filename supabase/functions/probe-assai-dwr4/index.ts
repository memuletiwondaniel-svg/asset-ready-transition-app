import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractFormFields(html: string): Array<{ name: string; type: string; value: string; id: string }> {
  const fields: Array<{ name: string; type: string; value: string; id: string }> = [];
  const inputRegex = /<input[^>]*>/gi;
  let m;
  while ((m = inputRegex.exec(html)) !== null) {
    const tag = m[0];
    const name = tag.match(/name=["']([^"']+)["']/i)?.[1] ?? "";
    if (!name) continue;
    const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "text";
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? "";
    const id = tag.match(/id=["']([^"']+)["']/i)?.[1] ?? "";
    fields.push({ name, type, value, id });
  }
  // Also extract select elements
  const selectRegex = /<select[^>]*name=["']([^"']+)["'][^>]*>/gi;
  while ((m = selectRegex.exec(html)) !== null) {
    fields.push({ name: m[1], type: "select", value: "", id: "" });
  }
  return fields;
}

function extractFormAction(html: string): string {
  const m = html.match(/<form[^>]*action=["']([^"']+)["']/i);
  return m?.[1] ?? "";
}

function extractFormMethod(html: string): string {
  const m = html.match(/<form[^>]*method=["']([^"']+)["']/i);
  return m?.[1]?.toUpperCase() ?? "POST";
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
    const results: Record<string, any> = { login: "ok" };

    // Step 1: Fetch the search form
    const searchUrl = `${awBase}/search.aweb?subclass_type=DES_DOC`;
    console.log(`[probe4] Fetching search form: ${searchUrl}`);
    const searchResp = await fetch(searchUrl, {
      headers: { Cookie: cookieHeader, Accept: "text/html" },
      redirect: "follow",
    });
    const searchHtml = await searchResp.text();
    results.search_form = {
      status: searchResp.status,
      length: searchHtml.length,
    };

    // Step 2: Parse the form
    const fields = extractFormFields(searchHtml);
    const formAction = extractFormAction(searchHtml);
    const formMethod = extractFormMethod(searchHtml);
    results.form_analysis = {
      action: formAction,
      method: formMethod,
      field_count: fields.length,
      fields: fields.map(f => ({ name: f.name, type: f.type, value: f.value ? f.value.substring(0, 100) : "", id: f.id })),
    };

    // Step 3: Build submission — include all hidden fields, leave search fields as wildcards
    const formData = new URLSearchParams();

    // Add all hidden fields first
    for (const f of fields) {
      if (f.type === "hidden" && f.name && f.value) {
        formData.set(f.name, f.value);
      }
    }

    // Set search fields to wildcard "*" to get all documents
    // Common Assai search field names
    const searchFieldNames = fields
      .filter(f => f.type === "text" || f.type === "")
      .map(f => f.name);

    results.text_fields = searchFieldNames;

    // Set the first text field (usually document number) to wildcard
    for (const fname of searchFieldNames) {
      formData.set(fname, "*");
    }

    // Ensure the submit action is set
    if (!formData.has("action")) formData.set("action", "search");
    if (!formData.has("subclass_type")) formData.set("subclass_type", "DES_DOC");

    results.submission = {
      url: formAction ? new URL(formAction, searchUrl).toString() : `${awBase}/result.aweb`,
      fields_submitted: Array.from(formData.keys()),
      field_values: Object.fromEntries(
        Array.from(formData.entries()).map(([k, v]) => [k, v.length > 100 ? v.substring(0, 100) + "..." : v])
      ),
    };

    // Step 4: Submit the search form
    const submitUrl = formAction
      ? new URL(formAction, searchUrl).toString()
      : `${awBase}/result.aweb`;

    console.log(`[probe4] Submitting search to: ${submitUrl}`);
    const submitResp = await fetch(submitUrl, {
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

    results.result_page = {
      status: submitResp.status,
      length: resultHtml.length,
      has_table: resultHtml.includes("<table") || resultHtml.includes("<TABLE"),
      has_error: resultHtml.includes("applet:error") || resultHtml.includes("error.aweb"),
      has_grid: resultHtml.includes("grid") || resultHtml.includes("Grid"),
      has_tr: (resultHtml.match(/<tr/gi) || []).length,
      has_td: (resultHtml.match(/<td/gi) || []).length,
      preview: resultHtml.substring(0, 3000),
    };

    // Step 5: If result has table rows, parse them
    if (results.result_page.has_td > 5) {
      const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
      const documents: Array<Record<string, string>> = [];
      const seen = new Set<string>();

      const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      let rowIndex = 0;

      while ((rowMatch = rowPattern.exec(resultHtml)) !== null) {
        rowIndex++;
        const cells: string[] = [];
        const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let cellMatch;
        while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
          cells.push(stripTags(cellMatch[1]));
        }
        if (cells.length < 3) continue;

        // Try to identify document number cell
        const docNum = cells.find(c => /\d{3,}-[A-Z]/.test(c) || /^[A-Z]{2,}\d{3,}/.test(c) || /^\d{4,}/.test(c));
        if (docNum && !seen.has(docNum)) {
          seen.add(docNum);
          const i = cells.indexOf(docNum);
          documents.push({
            row: String(rowIndex),
            cells_count: String(cells.length),
            document_number: docNum,
            all_cells: cells.join(" | "),
          });
        }

        // Capture first 20 raw rows for analysis regardless
        if (rowIndex <= 20 && cells.length >= 3) {
          if (!results.raw_rows) results.raw_rows = [];
          results.raw_rows.push({ row: rowIndex, cells });
        }
      }

      results.parsed_documents = {
        count: documents.length,
        first_10: documents.slice(0, 10),
      };
    }

    // Step 6: Also try submitting with just document_number=* and minimal fields
    console.log(`[probe4] Trying minimal submission...`);
    const minimalForm = new URLSearchParams();
    // Copy only hidden fields
    for (const f of fields) {
      if (f.type === "hidden" && f.name && f.value) {
        minimalForm.set(f.name, f.value);
      }
    }
    // Set only document number field to wildcard, leave rest empty
    if (searchFieldNames.length > 0) {
      minimalForm.set(searchFieldNames[0], "*");
    }

    const minResp = await fetch(submitUrl, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
        Referer: searchUrl,
      },
      body: minimalForm.toString(),
      redirect: "follow",
    });
    const minHtml = await minResp.text();
    results.minimal_result = {
      status: minResp.status,
      length: minHtml.length,
      has_table: minHtml.includes("<table") || minHtml.includes("<TABLE"),
      has_error: minHtml.includes("applet:error") || minHtml.includes("error.aweb"),
      has_tr: (minHtml.match(/<tr/gi) || []).length,
      has_td: (minHtml.match(/<td/gi) || []).length,
      preview: minHtml.substring(0, 3000),
    };

    // Parse minimal result too
    if (results.minimal_result.has_td > 5) {
      const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
      const minDocs: Array<Record<string, string>> = [];
      const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      let ri = 0;
      while ((rowMatch = rowPattern.exec(minHtml)) !== null) {
        ri++;
        const cells: string[] = [];
        const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let cellMatch;
        while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
          cells.push(stripTags(cellMatch[1]));
        }
        if (cells.length >= 3 && ri <= 20) {
          if (!results.minimal_raw_rows) results.minimal_raw_rows = [];
          results.minimal_raw_rows.push({ row: ri, cells });
        }
      }
    }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[probe4] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
