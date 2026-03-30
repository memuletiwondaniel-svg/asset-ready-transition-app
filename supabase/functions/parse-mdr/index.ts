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
    const { document_number, project_id, tenant_id } = await req.json();

    if (!document_number || !project_id) {
      return new Response(
        JSON.stringify({ error: "document_number and project_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Step 1: Use read_assai_document pattern to download the 6611 MDR
    // First, get Assai credentials
    const { data: creds, error: credErr } = await supabase
      .from("dms_sync_credentials")
      .select("base_url, username_encrypted, password_encrypted, db_name")
      .eq("dms_platform", "assai")
      .maybeSingle();

    if (credErr || !creds) {
      return new Response(
        JSON.stringify({ error: "Assai credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let username = creds.username_encrypted || "";
    let password = creds.password_encrypted || "";

    // Decrypt credentials
    try {
      const { isEncrypted, decrypt } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch (decryptErr) {
      console.error("parse-mdr: credential decryption failed:", decryptErr);
    }

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Assai login credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = (creds.base_url || "https://eu.assaicloud.com").replace(/\/+$/, "");
    const dbName = creds.db_name || "eu578";
    const instancePath = "/AW" + dbName;
    const assaiBase = baseUrl + instancePath;

    // Authenticate with Assai
    const loginUrl = `${assaiBase}/login.aweb`;
    const loginBody = new URLSearchParams({
      user_name: username,
      user_pass: password,
      client_type: "web",
    });

    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: loginBody.toString(),
      redirect: "follow",
    });

    if (!loginRes.ok) {
      return new Response(
        JSON.stringify({ error: `Assai authentication failed (HTTP ${loginRes.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const setCookies = loginRes.headers.getSetCookie?.() || [];
    const cookieHeader = setCookies
      .map((c: string) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");

    if (!cookieHeader) {
      return new Response(
        JSON.stringify({ error: "Assai authentication returned no session cookies" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Search for the document in Assai to get pk_seq_nr
    // Initialize search session
    const initUrl = `${assaiBase}/search.aweb?subclass_type=DES_DOC&clas_seq_nr=1&suty_seq_nr=1`;
    await fetch(initUrl, {
      headers: { Cookie: cookieHeader },
      redirect: "follow",
    });

    // Search for the MDR document by number
    const searchUrl = `${assaiBase}/searchresult.aweb`;
    const searchBody = new URLSearchParams({
      subclass_type: "DES_DOC",
      clas_seq_nr: "1",
      suty_seq_nr: "1",
      number: document_number.replace(/%/g, "*"),
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

    // Extract pk_seq_nr and entt_seq_nr from search results
    const cellsMatch = searchHtml.match(/var myCells\s*=\s*(\[[\s\S]*?\]);/);
    let pkSeqNr: string | null = null;
    let enttSeqNr: string | null = null;

    if (cellsMatch) {
      try {
        const cells = JSON.parse(cellsMatch[1]);
        if (cells.length > 0) {
          const row = cells[0];
          pkSeqNr = String(row[33] || "").replace(/<[^>]*>/g, "").trim();
          enttSeqNr = String(row[34] || "").replace(/<[^>]*>/g, "").trim();
        }
      } catch (parseErr) {
        console.error("parse-mdr: myCells parse error:", parseErr);
      }
    }

    if (!pkSeqNr || !enttSeqNr) {
      return new Response(
        JSON.stringify({
          error: `MDR document "${document_number}" not found in Assai. Please verify the document number.`,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Download the document
    const downloadUrl = `${assaiBase}/download.aweb?pk_seq_nr=${pkSeqNr}&entt_seq_nr=${enttSeqNr}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const dlRes = await fetch(downloadUrl, {
      headers: { Cookie: cookieHeader },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!dlRes.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to download MDR document (HTTP ${dlRes.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBytes = new Uint8Array(await dlRes.arrayBuffer());
    const contentType = dlRes.headers.get("content-type") || "";

    console.log(`parse-mdr: downloaded ${fileBytes.length} bytes, content-type: ${contentType}`);

    // Step 4: Parse the document content
    // Detect file type and parse accordingly
    const mdrRows: Array<{
      document_number: string;
      title: string;
      discipline_code: string;
      document_type_code: string;
      unit_code: string;
      originator_code: string;
      final_rev_requirement: string;
      is_tier1: boolean;
      is_tier2: boolean;
    }> = [];

    // Parse based on content — MDRs are typically Excel files
    // For PDF MDRs, we extract text and parse tabular structures
    const isExcel =
      contentType.includes("spreadsheet") ||
      contentType.includes("excel") ||
      contentType.includes("octet-stream") ||
      // Check for XLSX magic bytes (PK zip)
      (fileBytes[0] === 0x50 && fileBytes[1] === 0x4b);

    const isPdf =
      contentType.includes("pdf") ||
      (fileBytes[0] === 0x25 &&
        fileBytes[1] === 0x50 &&
        fileBytes[2] === 0x44 &&
        fileBytes[3] === 0x46);

    if (isExcel) {
      // For Excel files, use a lightweight parsing approach
      // Extract text content from the spreadsheet
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      const rawText = textDecoder.decode(fileBytes);

      // Extract shared strings from XLSX (they're in xl/sharedStrings.xml)
      // For now, parse the raw XML content to find document numbers
      const docNumberRegex =
        /\b(\d{4}-[A-Z]{2,6}-[A-Z0-9]+-[A-Z]+-[A-Z0-9]+-[A-Z]{2}-[A-Z0-9]+-\d{5}-\d{3})\b/g;
      const foundNumbers = new Set<string>();
      let match;

      while ((match = docNumberRegex.exec(rawText)) !== null) {
        foundNumbers.add(match[1]);
      }

      // Parse each document number into its segments
      for (const docNum of foundNumbers) {
        if (docNum === document_number) continue; // Skip the MDR document itself
        const segments = docNum.split("-");
        if (segments.length >= 9) {
          mdrRows.push({
            document_number: docNum,
            title: "", // Will be enriched from Assai later
            discipline_code: segments[5] || "",
            document_type_code: segments[6] || "",
            unit_code: segments[4] || "",
            originator_code: segments[1] || "",
            final_rev_requirement: "", // Will be parsed from column data
            is_tier1: false,
            is_tier2: false,
          });
        }
      }
    } else if (isPdf) {
      // For PDFs, extract readable text and find document numbers
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      const rawText = textDecoder.decode(fileBytes);

      // Extract text content from between parentheses (PDF text objects)
      const textMatches = rawText.match(/\(([^)]+)\)/g);
      const fullText = textMatches
        ? textMatches.map((m: string) => m.slice(1, -1)).join(" ")
        : rawText;

      const docNumberRegex =
        /\b(\d{4}-[A-Z]{2,6}-[A-Z0-9]+-[A-Z]+-[A-Z0-9]+-[A-Z]{2}-[A-Z0-9]+-\d{5}-\d{3})\b/g;
      const foundNumbers = new Set<string>();
      let match;

      while ((match = docNumberRegex.exec(fullText)) !== null) {
        foundNumbers.add(match[1]);
      }

      for (const docNum of foundNumbers) {
        if (docNum === document_number) continue;
        const segments = docNum.split("-");
        if (segments.length >= 9) {
          mdrRows.push({
            document_number: docNum,
            title: "",
            discipline_code: segments[5] || "",
            document_type_code: segments[6] || "",
            unit_code: segments[4] || "",
            originator_code: segments[1] || "",
            final_rev_requirement: "",
            is_tier1: false,
            is_tier2: false,
          });
        }
      }
    } else {
      return new Response(
        JSON.stringify({
          error: `Unsupported MDR file format (content-type: ${contentType}). Expected Excel or PDF.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mdrRows.length === 0) {
      return new Response(
        JSON.stringify({
          warning: "No document numbers found in the MDR. The file may require manual parsing or a different format.",
          document_number,
          bytes_downloaded: fileBytes.length,
          content_type: contentType,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: Determine tier classification based on document type
    // Tier 1: Safety-critical documents (HAZOP, SIL, Safety Case, Operating Procedures)
    const tier1Types = new Set([
      "6611", // MDR itself
      "0401", // HAZOP
      "2365", // P&ID/PEFS
      "5733", // Safety Case
      "0601", // Operating Procedure
      "A90",  // HAZOP Report (vendor)
    ]);
    // Tier 2: Important but not safety-critical
    const tier2Types = new Set([
      "0301", // Specifications
      "0201", // Datasheets
      "0101", // Drawings
      "J01",  // IOM
    ]);

    for (const row of mdrRows) {
      row.is_tier1 = tier1Types.has(row.document_type_code);
      row.is_tier2 = tier2Types.has(row.document_type_code);
    }

    // Step 6: Upsert into mdr_register
    const upsertData = mdrRows.map((row) => ({
      project_id,
      document_number: row.document_number,
      title: row.title || null,
      discipline_code: row.discipline_code,
      document_type_code: row.document_type_code,
      unit_code: row.unit_code,
      originator_code: row.originator_code,
      final_rev_requirement: row.final_rev_requirement || null,
      is_tier1: row.is_tier1,
      is_tier2: row.is_tier2,
      is_found_in_dms: false,
      mdr_source_doc: document_number,
      tenant_id: tenant_id || null,
      updated_at: new Date().toISOString(),
    }));

    // Batch upsert in chunks of 100
    const chunkSize = 100;
    let totalUpserted = 0;
    for (let i = 0; i < upsertData.length; i += chunkSize) {
      const chunk = upsertData.slice(i, i + chunkSize);
      const { error: upsertErr } = await supabase
        .from("mdr_register")
        .upsert(chunk, {
          onConflict: "project_id,document_number,mdr_source_doc",
          ignoreDuplicates: false,
        });

      if (upsertErr) {
        console.error(`parse-mdr: upsert error at chunk ${i}:`, upsertErr);
      } else {
        totalUpserted += chunk.length;
      }
    }

    // Build summary by discipline
    const disciplineSummary: Record<string, number> = {};
    for (const row of mdrRows) {
      const disc = row.discipline_code || "Unknown";
      disciplineSummary[disc] = (disciplineSummary[disc] || 0) + 1;
    }

    const tier1Count = mdrRows.filter((r) => r.is_tier1).length;
    const tier2Count = mdrRows.filter((r) => r.is_tier2).length;

    return new Response(
      JSON.stringify({
        success: true,
        mdr_source_doc: document_number,
        project_id,
        total_documents_parsed: mdrRows.length,
        total_upserted: totalUpserted,
        tier1_count: tier1Count,
        tier2_count: tier2Count,
        discipline_breakdown: disciplineSummary,
        message: `Successfully parsed ${mdrRows.length} expected documents from MDR ${document_number}. ${tier1Count} Tier 1 (safety-critical) and ${tier2Count} Tier 2 documents identified.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-mdr error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to parse MDR document",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
