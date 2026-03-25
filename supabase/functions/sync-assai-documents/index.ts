import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { project_id, tenant_id, manual_trigger } = await req.json();
    if (!project_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "project_id and tenant_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch credentials for Assai
    const { data: creds, error: credError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("dms_platform", "assai")
      .single();

    if (credError || !creds) {
      return new Response(
        JSON.stringify({
          error: "No Assai credentials configured for this tenant",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!creds.sync_enabled) {
      return new Response(
        JSON.stringify({ error: "Assai sync is disabled for this tenant" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Decrypt credentials (using shared crypto module)
    let username = creds.username_encrypted;
    let password = creds.password_encrypted;

    // Try to decrypt if they look encrypted (base64:base64:base64 format)
    try {
      const { decrypt, isEncrypted } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) {
        username = await decrypt(username);
      }
      if (password && isEncrypted(password)) {
        password = await decrypt(password);
      }
    } catch (decryptErr) {
      console.error("Decryption warning:", decryptErr);
      // Fall through — credentials may be stored in plain text during dev
    }

    // 3. Get project code for Assai query
    const { data: project } = await supabase
      .from("projects")
      .select("project_code, name")
      .eq("id", project_id)
      .single();

    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Authenticate to Assai and fetch documents
    let syncResult = {
      synced_count: 0,
      failed_count: 0,
      new_documents: 0,
      status_changes: 0,
    };
    let syncError: string | null = null;

    try {
      // Assai API authentication
      const baseUrl = creds.base_url?.replace(/\/$/, "");
      const projectCodeField = creds.project_code_field || "ProjectCode";

      // Step 1: Authenticate to get session token
      const authResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!authResponse.ok) {
        const errText = await authResponse.text();
        throw new Error(
          `Assai authentication failed (${authResponse.status}): ${errText}`
        );
      }

      const authData = await authResponse.json();
      const sessionToken =
        authData.token || authData.access_token || authData.sessionId;

      if (!sessionToken) {
        throw new Error("No session token returned from Assai authentication");
      }

      // Step 2: Fetch document register
      const docsResponse = await fetch(
        `${baseUrl}/api/documents?${projectCodeField}=${encodeURIComponent(project.project_code || project.name)}`,
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!docsResponse.ok) {
        const errText = await docsResponse.text();
        throw new Error(
          `Assai document fetch failed (${docsResponse.status}): ${errText}`
        );
      }

      const documents = await docsResponse.json();
      const docList = Array.isArray(documents)
        ? documents
        : documents.data || documents.documents || [];

      // Step 3: Get existing records for comparison
      const { data: existingDocs } = await supabase
        .from("dms_external_sync")
        .select("document_number, status_code")
        .eq("project_id", project_id)
        .eq("dms_platform", "assai");

      const existingMap = new Map(
        (existingDocs || []).map((d) => [d.document_number, d.status_code])
      );

      // Step 4: Upsert documents
      const upsertRecords = docList.map((doc: any) => ({
        project_id,
        document_number:
          doc.documentNumber || doc.document_number || doc.DocumentNumber || "",
        document_title:
          doc.title || doc.documentTitle || doc.DocumentTitle || "",
        revision: doc.revision || doc.Revision || null,
        status_code:
          doc.statusCode || doc.status || doc.StatusCode || null,
        discipline_code:
          doc.discipline || doc.disciplineCode || doc.DisciplineCode || null,
        package_tag:
          doc.packageTag || doc.package_tag || doc.PackageTag || null,
        vendor_po_sequence:
          doc.vendorPoSequence ||
          doc.vendor_po_sequence ||
          doc.VendorPOSequence ||
          null,
        dms_platform: "assai",
        external_url: doc.url || doc.externalUrl || doc.link || null,
        last_synced_at: new Date().toISOString(),
        sync_status: "success",
        tenant_id,
      }));

      // Count new and changed
      for (const rec of upsertRecords) {
        const existing = existingMap.get(rec.document_number);
        if (!existing) {
          syncResult.new_documents++;
        } else if (existing !== rec.status_code) {
          syncResult.status_changes++;
        }
      }

      if (upsertRecords.length > 0) {
        // Batch upsert in chunks of 500
        const chunkSize = 500;
        for (let i = 0; i < upsertRecords.length; i += chunkSize) {
          const chunk = upsertRecords.slice(i, i + chunkSize);
          const { error: upsertError } = await supabase
            .from("dms_external_sync")
            .upsert(chunk, {
              onConflict: "project_id,document_number,dms_platform",
            });

          if (upsertError) {
            console.error("Upsert error:", upsertError);
            syncResult.failed_count += chunk.length;
          } else {
            syncResult.synced_count += chunk.length;
          }
        }
      }
    } catch (apiError) {
      console.error("Assai sync error:", apiError);
      syncError =
        apiError instanceof Error ? apiError.message : "Unknown sync error";
      syncResult.failed_count++;
    }

    // 5. Update last_sync_at on credentials
    await supabase
      .from("dms_sync_credentials")
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", creds.id);

    // 6. Log the sync operation
    await supabase.from("dms_sync_logs").insert({
      credential_id: creds.id,
      project_id,
      dms_platform: "assai",
      synced_count: syncResult.synced_count,
      failed_count: syncResult.failed_count,
      new_documents: syncResult.new_documents,
      status_changes: syncResult.status_changes,
      sync_status: syncError ? "failed" : "success",
      error_message: syncError,
      triggered_by: user.id,
      tenant_id,
    });

    return new Response(
      JSON.stringify({
        success: !syncError,
        ...syncResult,
        error: syncError,
        manual_trigger: manual_trigger || false,
      }),
      {
        status: syncError ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
