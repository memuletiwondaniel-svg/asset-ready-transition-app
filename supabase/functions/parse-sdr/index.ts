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

    // Step 1: Get Assai credentials
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

    try {
      const { isEncrypted, decrypt } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch (_) {
      // Ignore decryption errors
    }

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Assai login credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = (creds.base_url || "https://eu.assaicloud.com").replace(/\/+$/, "");
    const dbName = creds.db_name || "eu578";
    const assaiBase = baseUrl + "/AW" + dbName;

    // Step 2: Authenticate with Assai
    const loginRes = await fetch(`${assaiBase}/login.aweb`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        user_name: username,
        user_pass: password,
        client_type: "web",
      }).toString(),
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

    // Step 3: Search for the SDR document in SUP_DOC module
    // Warmup label.aweb for SUP_DOC session context
    await fetch(`${assaiBase}/label.aweb?subclass_type=SUP_DOC`, {
      headers: { Cookie: cookieHeader },
      redirect: "follow",
    });

    const initUrl = `${assaiBase}/search.aweb?subclass_type=SUP_DOC&clas_seq_nr=1&suty_seq_nr=1`;
    await fetch(initUrl, {
      headers: { Cookie: cookieHeader },
      redirect: "follow",
    });

    // Search for the A01 SDR document by number
    const searchRes = await fetch(`${assaiBase}/searchresult.aweb`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        subclass_type: "SUP_DOC",
        clas_seq_nr: "1",
        suty_seq_nr: "1",
        number: document_number.replace(/%/g, "*"),
        action: "search",
      }).toString(),
      redirect: "follow",
    });

    const searchHtml = await searchRes.text();

    // Extract pk_seq_nr and entt_seq_nr
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
        console.error("parse-sdr: myCells parse error:", parseErr);
      }
    }

    if (!pkSeqNr || !enttSeqNr) {
      return new Response(
        JSON.stringify({
          error: `SDR document "${document_number}" not found in Assai SUP_DOC module. Please verify the document number.`,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Download the SDR document
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const dlRes = await fetch(
      `${assaiBase}/download.aweb?pk_seq_nr=${pkSeqNr}&entt_seq_nr=${enttSeqNr}`,
      {
        headers: { Cookie: cookieHeader },
        redirect: "follow",
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!dlRes.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to download SDR document (HTTP ${dlRes.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBytes = new Uint8Array(await dlRes.arrayBuffer());
    const contentType = dlRes.headers.get("content-type") || "";

    console.log(`parse-sdr: downloaded ${fileBytes.length} bytes, content-type: ${contentType}`);

    // Step 5: Parse the document — extract vendor document numbers
    // SDR vendor docs use 3-char alphanumeric type codes and ZV discipline
    // Pattern: PROJECT-ORIG-PLANT-SITE-UNIT-ZV-XXX-NNNNN-NNN
    const sdrRows: Array<{
      document_number: string;
      title: string;
      supplier_document_number: string;
      sdrl_code: string;
      discipline_code: string;
      document_type_code: string;
      unit_code: string;
      originator_code: string;
      vendor_code: string;
      po_number: string;
    }> = [];

    const textDecoder = new TextDecoder("utf-8", { fatal: false });
    const rawText = textDecoder.decode(fileBytes);

    const isExcel =
      contentType.includes("spreadsheet") ||
      contentType.includes("excel") ||
      contentType.includes("octet-stream") ||
      (fileBytes[0] === 0x50 && fileBytes[1] === 0x4b);

    const isPdf =
      contentType.includes("pdf") ||
      (fileBytes[0] === 0x25 && fileBytes[1] === 0x50 && fileBytes[2] === 0x44 && fileBytes[3] === 0x46);

    let textContent = rawText;
    if (isPdf) {
      const textMatches = rawText.match(/\(([^)]+)\)/g);
      textContent = textMatches
        ? textMatches.map((m: string) => m.slice(1, -1)).join(" ")
        : rawText;
    }

    if (!isExcel && !isPdf) {
      return new Response(
        JSON.stringify({
          error: `Unsupported SDR file format (content-type: ${contentType}). Expected Excel or PDF.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vendor document number pattern: PROJECT-ORIG-PLANT-SITE-UNIT-ZV-TYPE-SEQ-SHEET
    // Where TYPE is 3-char alphanumeric (A01, B01, C05, J01, etc.)
    const vendorDocRegex =
      /\b(\d{4}-[A-Z]{2,6}-[A-Z0-9]+-[A-Z]+-[A-Z0-9]+-ZV-[A-Z][A-Z0-9]{2}-\d{5}-\d{3})\b/g;
    
    // Also match general 9-segment document numbers for broader SDR parsing
    const generalDocRegex =
      /\b(\d{4}-[A-Z]{2,6}-[A-Z0-9]+-[A-Z]+-[A-Z0-9]+-[A-Z]{2}-[A-Z0-9]{3,4}-\d{5}-\d{3})\b/g;

    const foundNumbers = new Set<string>();
    let match;

    while ((match = vendorDocRegex.exec(textContent)) !== null) {
      foundNumbers.add(match[1]);
    }
    // Also scan with general pattern for non-ZV docs that may appear in SDRs
    while ((match = generalDocRegex.exec(textContent)) !== null) {
      foundNumbers.add(match[1]);
    }

    // Extract supplier document numbers (vendor's own numbering)
    // Common patterns: XX-NNNNNN-XXX-NNN, vendor-specific
    const supplierDocRegex = /\b([A-Z]{2,4}-\d{4,8}-[A-Z]{2,5}-\d{2,4})\b/g;
    const supplierDocs: string[] = [];
    while ((match = supplierDocRegex.exec(textContent)) !== null) {
      supplierDocs.push(match[1]);
    }

    // Parse each document number into SDR register rows
    for (const docNum of foundNumbers) {
      if (docNum === document_number) continue; // Skip the SDR itself
      const segments = docNum.split("-");
      if (segments.length < 9) continue;

      const disciplineCode = segments[5] || "";
      const typeCode = segments[6] || "";
      const seqSegment = segments[7] || "";

      // Extract PO number from sequence segment (last 5 digits of 10-digit PO)
      const poNumber = seqSegment.length === 5 ? seqSegment : "";

      sdrRows.push({
        document_number: docNum,
        title: "",
        supplier_document_number: "",
        sdrl_code: typeCode, // SDRL code is typically the type code (A01, B01, etc.)
        discipline_code: disciplineCode,
        document_type_code: typeCode,
        unit_code: segments[4] || "",
        originator_code: segments[1] || "",
        vendor_code: "", // Will be enriched from package/PO data
        po_number: poNumber,
      });
    }

    if (sdrRows.length === 0) {
      return new Response(
        JSON.stringify({
          warning: "No vendor document numbers found in the SDR. The file may require manual parsing.",
          document_number,
          bytes_downloaded: fileBytes.length,
          content_type: contentType,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 6: Try to enrich vendor_code from document_packages table
    const poNumbers = [...new Set(sdrRows.map((r) => r.po_number).filter(Boolean))];
    const vendorMap: Record<string, string> = {};
    if (poNumbers.length > 0) {
      const { data: packages } = await supabase
        .from("document_packages")
        .select("po_number, vendor_name, package_tag")
        .in("po_number", poNumbers);

      if (packages) {
        for (const pkg of packages) {
          if (pkg.po_number && pkg.vendor_name) {
            vendorMap[pkg.po_number] = pkg.vendor_name;
          }
        }
      }
    }

    // Apply vendor codes
    for (const row of sdrRows) {
      if (row.po_number && vendorMap[row.po_number]) {
        row.vendor_code = vendorMap[row.po_number];
      }
    }

    // Step 7: Upsert into sdr_register
    const upsertData = sdrRows.map((row) => ({
      project_id,
      document_number: row.document_number,
      title: row.title || null,
      supplier_document_number: row.supplier_document_number || null,
      sdrl_code: row.sdrl_code || null,
      discipline_code: row.discipline_code,
      document_type_code: row.document_type_code,
      unit_code: row.unit_code,
      originator_code: row.originator_code,
      vendor_code: row.vendor_code || null,
      po_number: row.po_number || null,
      planned_submission_date: null,
      is_found_in_dms: false,
      sdr_source_doc: document_number,
      tenant_id: tenant_id || null,
      updated_at: new Date().toISOString(),
    }));

    const chunkSize = 100;
    let totalUpserted = 0;
    for (let i = 0; i < upsertData.length; i += chunkSize) {
      const chunk = upsertData.slice(i, i + chunkSize);
      const { error: upsertErr } = await supabase
        .from("sdr_register")
        .upsert(chunk, {
          onConflict: "project_id,document_number,sdr_source_doc",
          ignoreDuplicates: false,
        });

      if (upsertErr) {
        console.error(`parse-sdr: upsert error at chunk ${i}:`, upsertErr);
      } else {
        totalUpserted += chunk.length;
      }
    }

    // Build summary
    const sdrlSummary: Record<string, number> = {};
    const vendorSummary: Record<string, number> = {};
    for (const row of sdrRows) {
      const sdrl = row.sdrl_code || "Unknown";
      sdrlSummary[sdrl] = (sdrlSummary[sdrl] || 0) + 1;
      const vendor = row.vendor_code || "Unassigned";
      vendorSummary[vendor] = (vendorSummary[vendor] || 0) + 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        sdr_source_doc: document_number,
        project_id,
        total_documents_parsed: sdrRows.length,
        total_upserted: totalUpserted,
        unique_po_numbers: poNumbers.length,
        sdrl_breakdown: sdrlSummary,
        vendor_breakdown: vendorSummary,
        message: `Successfully parsed ${sdrRows.length} expected vendor deliverables from SDR ${document_number}. ${poNumbers.length} unique PO numbers identified.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-sdr error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to parse SDR document",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
