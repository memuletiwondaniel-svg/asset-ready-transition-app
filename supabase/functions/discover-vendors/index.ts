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
    const { project_code, project_id, tenant_id } = await req.json();

    if (!project_code && !project_id) {
      return new Response(
        JSON.stringify({ error: "project_code or project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve project_id if only code given
    let resolvedProjectId = project_id;
    let resolvedProjectCode = project_code;

    if (!resolvedProjectId && project_code) {
      const { data: proj } = await supabase
        .from("projects")
        .select("id, project_code")
        .ilike("project_code", `%${project_code}%`)
        .limit(1)
        .maybeSingle();
      resolvedProjectId = proj?.id || null;
      resolvedProjectCode = proj?.project_code || project_code;
    }

    // Get Assai credentials
    const { data: creds } = await supabase
      .from("dms_sync_credentials")
      .select("base_url, username_encrypted, password_encrypted, db_name")
      .eq("dms_platform", "assai")
      .maybeSingle();

    if (!creds) {
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
    } catch (_) {}

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Assai login credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = (creds.base_url || "https://eu.assaicloud.com").replace(/\/+$/, "");
    const dbName = creds.db_name || "eu578";
    const assaiBase = baseUrl + "/AW" + dbName;

    // Authenticate
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
        JSON.stringify({ error: `Assai auth failed (HTTP ${loginRes.status})` }),
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
        JSON.stringify({ error: "No session cookies from Assai" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve Assai project code from dms_projects
    let assaiProjectCode = project_code;
    if (!assaiProjectCode) {
      const { data: dmsProj } = await supabase
        .from("dms_projects")
        .select("code")
        .eq("project_id", resolvedProjectId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      assaiProjectCode = dmsProj?.code || "";
    }

    if (!assaiProjectCode) {
      return new Response(
        JSON.stringify({ error: "Could not resolve Assai project code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search SUP_DOC module for all vendor documents in this project
    // Warmup SUP_DOC session
    await fetch(`${assaiBase}/label.aweb?subclass_type=SUP_DOC`, {
      headers: { Cookie: cookieHeader },
      redirect: "follow",
    });

    await fetch(`${assaiBase}/search.aweb?subclass_type=SUP_DOC&clas_seq_nr=1&suty_seq_nr=1`, {
      headers: { Cookie: cookieHeader },
      redirect: "follow",
    });

    // Search for all vendor docs with this project code
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
        number: `${assaiProjectCode}-%`,
        action: "search",
      }).toString(),
      redirect: "follow",
    });

    const searchHtml = await searchRes.text();
    const cellsMatch = searchHtml.match(/var myCells\s*=\s*(\[[\s\S]*?\]);/);

    // Parse all vendor document results
    const vendorDocs: Array<{
      docNumber: string;
      title: string;
      status: string;
      revision: string;
      originator: string;
      typeCode: string;
      seqSegment: string;
    }> = [];

    if (cellsMatch) {
      try {
        const cells = JSON.parse(cellsMatch[1]);
        for (const row of cells) {
          const docNum = String(row[0] || "").replace(/<[^>]*>/g, "").trim();
          const title = String(row[1] || "").replace(/<[^>]*>/g, "").trim();
          const status = String(row[7] || "").replace(/<[^>]*>/g, "").trim();
          const revision = String(row[4] || "").replace(/<[^>]*>/g, "").trim();

          if (docNum) {
            const segments = docNum.split("-");
            if (segments.length >= 9) {
              vendorDocs.push({
                docNumber: docNum,
                title,
                status,
                revision,
                originator: segments[1] || "",
                typeCode: segments[6] || "",
                seqSegment: segments[7] || "",
              });
            }
          }
        }
      } catch (parseErr) {
        console.error("discover-vendors: parse error:", parseErr);
      }
    }

    // If we hit the 100-doc limit, also search by discipline ZV specifically
    if (vendorDocs.length >= 100) {
      // Re-init search
      await fetch(`${assaiBase}/search.aweb?subclass_type=SUP_DOC&clas_seq_nr=1&suty_seq_nr=1`, {
        headers: { Cookie: cookieHeader },
        redirect: "follow",
      });

      // Get unique type codes from first batch to sub-query
      const knownTypes = new Set(vendorDocs.map(d => d.typeCode));
      for (const typeCode of knownTypes) {
        await new Promise(r => setTimeout(r, 300));

        await fetch(`${assaiBase}/search.aweb?subclass_type=SUP_DOC&clas_seq_nr=1&suty_seq_nr=1`, {
          headers: { Cookie: cookieHeader },
          redirect: "follow",
        });

        const subRes = await fetch(`${assaiBase}/searchresult.aweb`, {
          method: "POST",
          headers: {
            Cookie: cookieHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            subclass_type: "SUP_DOC",
            clas_seq_nr: "1",
            suty_seq_nr: "1",
            number: `${assaiProjectCode}-%-%-%-%-ZV-${typeCode}-%`,
            action: "search",
          }).toString(),
          redirect: "follow",
        });

        const subHtml = await subRes.text();
        const subMatch = subHtml.match(/var myCells\s*=\s*(\[[\s\S]*?\]);/);
        if (subMatch) {
          const subCells = JSON.parse(subMatch[1]);
          const existingNums = new Set(vendorDocs.map(d => d.docNumber));
          for (const row of subCells) {
            const docNum = String(row[0] || "").replace(/<[^>]*>/g, "").trim();
            if (docNum && !existingNums.has(docNum)) {
              const segments = docNum.split("-");
              if (segments.length >= 9) {
                vendorDocs.push({
                  docNumber: docNum,
                  title: String(row[1] || "").replace(/<[^>]*>/g, "").trim(),
                  status: String(row[7] || "").replace(/<[^>]*>/g, "").trim(),
                  revision: String(row[4] || "").replace(/<[^>]*>/g, "").trim(),
                  originator: segments[1] || "",
                  typeCode: segments[6] || "",
                  seqSegment: segments[7] || "",
                });
              }
            }
          }
        }
      }
    }

    console.log(`discover-vendors: found ${vendorDocs.length} vendor documents for ${assaiProjectCode}`);

    // Aggregate by originator + PO (sequence segment)
    // PO number = last 5 digits of 10-digit PO, stored in sequence segment
    const vendorPackages = new Map<string, {
      vendor_code: string;
      po_number: string;
      document_type_codes: Set<string>;
      total_documents: number;
      latest_status: string;
      titles: string[];
    }>();

    for (const doc of vendorDocs) {
      const key = `${doc.originator}::${doc.seqSegment}`;
      if (!vendorPackages.has(key)) {
        vendorPackages.set(key, {
          vendor_code: doc.originator,
          po_number: doc.seqSegment,
          document_type_codes: new Set(),
          total_documents: 0,
          latest_status: doc.status,
          titles: [],
        });
      }
      const pkg = vendorPackages.get(key)!;
      pkg.document_type_codes.add(doc.typeCode);
      pkg.total_documents++;
      if (doc.title && pkg.titles.length < 5) pkg.titles.push(doc.title);
    }

    // Try to infer package scope from document titles and type codes
    function inferPackageScope(typeCodes: Set<string>, titles: string[]): string {
      const allText = titles.join(" ").toLowerCase();
      if (allText.includes("instrument") || allText.includes("transmitter")) return "Instrumentation Package";
      if (allText.includes("electrical") || allText.includes("switchboard") || allText.includes("mcc")) return "Electrical Package";
      if (allText.includes("valve") || allText.includes("actuator")) return "Valve Package";
      if (allText.includes("pump")) return "Pump Package";
      if (allText.includes("compressor")) return "Compressor Package";
      if (allText.includes("heat exchanger") || allText.includes("cooler")) return "Heat Exchanger Package";
      if (allText.includes("vessel") || allText.includes("tank")) return "Vessel/Tank Package";
      if (allText.includes("piping") || allText.includes("pipe")) return "Piping Package";
      if (allText.includes("hvac") || allText.includes("ventilation")) return "HVAC Package";
      if (allText.includes("telecom") || allText.includes("communication")) return "Telecoms Package";
      if (allText.includes("fire") || allText.includes("safety")) return "Fire & Safety Package";
      if (allText.includes("coating") || allText.includes("insulation")) return "Insulation/Coating Package";
      if (typeCodes.has("A01")) return "Vendor Document Package";
      return "Equipment Package";
    }

    // Look up existing vendor names from document_packages
    const originatorCodes = [...new Set([...vendorPackages.values()].map(v => v.vendor_code))];
    const vendorNameMap: Record<string, string> = {};

    if (originatorCodes.length > 0) {
      // Check dms_originators for company names
      const { data: originators } = await supabase
        .from("dms_originators")
        .select("code, description")
        .in("code", originatorCodes);

      if (originators) {
        for (const orig of originators) {
          vendorNameMap[orig.code] = orig.description;
        }
      }
    }

    // Upsert into dms_vendor_packages
    const now = new Date().toISOString();
    const upsertRows = [];

    for (const [, pkg] of vendorPackages) {
      upsertRows.push({
        project_id: resolvedProjectId || null,
        project_code: assaiProjectCode,
        vendor_code: pkg.vendor_code,
        vendor_name: vendorNameMap[pkg.vendor_code] || null,
        po_number: pkg.po_number || null,
        package_tag: null,
        package_scope: inferPackageScope(pkg.document_type_codes, pkg.titles),
        document_type_codes: [...pkg.document_type_codes],
        total_documents_found: pkg.total_documents,
        latest_status: pkg.latest_status || null,
        discovery_source: "assai_sup_doc",
        discovered_from_doc: null,
        discovery_method: "scan",
        last_scanned_at: now,
        tenant_id: tenant_id || null,
        updated_at: now,
      });
    }

    let totalUpserted = 0;
    const chunkSize = 50;
    for (let i = 0; i < upsertRows.length; i += chunkSize) {
      const chunk = upsertRows.slice(i, i + chunkSize);
      const { error: upsertErr } = await supabase
        .from("dms_vendor_packages")
        .upsert(chunk, {
          onConflict: "project_id,vendor_code,po_number",
          ignoreDuplicates: false,
        });

      if (upsertErr) {
        console.error(`discover-vendors: upsert error at chunk ${i}:`, upsertErr);
      } else {
        totalUpserted += chunk.length;
      }
    }

    // Build summary
    const vendorSummary: Record<string, { packages: number; documents: number }> = {};
    for (const [, pkg] of vendorPackages) {
      const vendor = vendorNameMap[pkg.vendor_code] || pkg.vendor_code;
      if (!vendorSummary[vendor]) vendorSummary[vendor] = { packages: 0, documents: 0 };
      vendorSummary[vendor].packages++;
      vendorSummary[vendor].documents += pkg.total_documents;
    }

    return new Response(
      JSON.stringify({
        success: true,
        project_code: assaiProjectCode,
        project_id: resolvedProjectId,
        total_vendor_documents: vendorDocs.length,
        total_vendor_packages: vendorPackages.size,
        total_unique_vendors: originatorCodes.length,
        total_upserted: totalUpserted,
        vendor_summary: vendorSummary,
        packages: upsertRows.map(r => ({
          vendor_code: r.vendor_code,
          vendor_name: r.vendor_name,
          po_number: r.po_number,
          package_scope: r.package_scope,
          document_types: r.document_type_codes,
          total_documents: r.total_documents_found,
        })),
        message: `Discovered ${vendorPackages.size} vendor packages from ${originatorCodes.length} vendors across ${vendorDocs.length} documents in project ${assaiProjectCode}.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("discover-vendors error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to discover vendors",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
