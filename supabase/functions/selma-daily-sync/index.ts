import { createClient } from "jsr:@supabase/supabase-js@2";
import { decrypt, isEncrypted } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface SyncChange {
  document_number: string;
  change_type: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  project_code?: string;
  is_vcr_critical: boolean;
  document_sync_id?: string;
}

// ─── Assai Login (reuses agent-assai-connect pattern) ────────────────────────
async function assaiLogin(baseUrl: string, username: string, password: string) {
  const loginUrl = baseUrl.replace(/\/+$/, "");
  
  // Step 1: GET login page
  const pageRes = await fetch(loginUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  const pageHtml = await pageRes.text();
  const cookies = pageRes.headers.get("set-cookie") || "";
  const finalUrl = pageRes.url;

  // Step 2: Parse form
  const formActionMatch = pageHtml.match(/form[^>]*action\s*=\s*["']([^"']+)["']/i);
  const inputNames = [...pageHtml.matchAll(/<input[^>]*name\s*=\s*["']([^"']+)["'][^>]*/gi)]
    .map(m => ({ name: m[1], type: m[0].match(/type\s*=\s*["']([^"']+)["']/i)?.[1] || "text" }));

  const userField = inputNames.find(i => /user|login|email|name/i.test(i.name))?.name || "username";
  const passField = inputNames.find(i => i.type === "password")?.name || "password";

  let postUrl: string;
  const formAction = formActionMatch?.[1];
  if (formAction) {
    if (formAction.startsWith("http")) postUrl = formAction;
    else if (formAction.startsWith("/")) postUrl = `${new URL(finalUrl).origin}${formAction}`;
    else postUrl = `${finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1)}${formAction}`;
  } else {
    postUrl = finalUrl;
  }

  // Step 3: POST credentials
  const formBody = new URLSearchParams();
  formBody.set(userField, username);
  formBody.set(passField, password);

  const loginRes = await fetch(postUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Cookie": cookies.split(",").map(c => c.split(";")[0].trim()).join("; "),
      "Referer": finalUrl,
    },
    body: formBody.toString(),
    redirect: "follow",
  });

  const resText = await loginRes.text();
  const postCookies = loginRes.headers.get("set-cookie") || "";
  const allCookies = [
    ...cookies.split(",").map(c => c.split(";")[0].trim()),
    ...postCookies.split(",").map(c => c.split(";")[0].trim()),
  ].filter(Boolean).join("; ");

  const hasError = /invalid|incorrect|failed|wrong|denied|unauthorized/i.test(resText.substring(0, 2000));
  const hasWelcome = /welcome|dashboard|home|main|frame/i.test(resText.substring(0, 2000));
  const isRedirected = !loginRes.url.includes("login") && !loginRes.url.includes("loggedOff");
  const hasSessionCookie = allCookies.toLowerCase().includes("jsessionid") || postCookies.toLowerCase().includes("session");

  console.log(`[selma-sync] Login analysis: redirected=${isRedirected}, session=${hasSessionCookie}, error=${hasError}, welcome=${hasWelcome}`);

  if (hasError) throw new Error("Login rejected — invalid credentials");
  if (isRedirected || hasSessionCookie || hasWelcome) {
    return { sessionCookies: allCookies, appUrl: loginRes.url };
  }
  if (loginRes.status >= 400) throw new Error(`Login failed with HTTP ${loginRes.status}`);
  
  // Even if ambiguous, if we got cookies and a 200, try to proceed
  if (loginRes.status === 200 && allCookies.length > 10) {
    console.log("[selma-sync] Login ambiguous but proceeding with cookies");
    return { sessionCookies: allCookies, appUrl: loginRes.url };
  }
  
  throw new Error(`Login response ambiguous — status ${loginRes.status}, URL: ${loginRes.url}`);
}

// ─── Assai Search (HTTP-based document search) ──────────────────────────────
async function assaiSearchDocuments(
  baseUrl: string,
  sessionCookies: string,
  projectCode: string
): Promise<Array<{
  document_number: string;
  document_title: string;
  revision: string;
  status_code: string;
  discipline_code: string;
  package_tag: string;
}>> {
  // Assai search is typically a form POST or GET with query params
  const appRoot = baseUrl.replace(/\/+$/, "").replace(/\/[^/]*\.(aweb|html|jsp)$/i, "");
  const searchUrl = `${appRoot}/servlet/DocumentSearchServlet`;

  console.log(`[selma-sync] Searching documents for project code: ${projectCode}`);

  try {
    const searchParams = new URLSearchParams({
      documentNumber: `${projectCode}-%`,
      project: "ALL",
      action: "search",
    });

    const res = await fetch(`${searchUrl}?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": sessionCookies,
        "Accept": "text/html,application/xhtml+xml,application/xml",
      },
      redirect: "follow",
    });

    const html = await res.text();
    console.log(`[selma-sync] Search response: ${res.status}, ${html.length} chars`);

    // Parse HTML table rows for document data
    return parseDocumentTable(html);
  } catch (err) {
    console.error(`[selma-sync] Search failed for ${projectCode}:`, err);
    return [];
  }
}

// ─── Parse HTML document table ──────────────────────────────────────────────
function parseDocumentTable(html: string): Array<{
  document_number: string;
  document_title: string;
  revision: string;
  status_code: string;
  discipline_code: string;
  package_tag: string;
}> {
  const docs: Array<{
    document_number: string;
    document_title: string;
    revision: string;
    status_code: string;
    discipline_code: string;
    package_tag: string;
  }> = [];

  // Extract table rows — Assai typically renders results in <tr> elements
  const rowMatches = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  
  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1];
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1].replace(/<[^>]*>/g, "").trim());

    if (cells.length < 3) continue;

    // Heuristic: document numbers typically start with 4 digits
    const docNumCell = cells.find(c => /^\d{4}-/.test(c));
    if (!docNumCell) continue;

    docs.push({
      document_number: docNumCell,
      document_title: cells[1] || "",
      revision: cells.find(c => /^[A-Z0-9]{1,3}$/i.test(c) && c !== docNumCell) || "",
      status_code: cells.find(c => /^(AFC|IFR|IFA|ABU|RLM|APP|REV)/i.test(c)) || "",
      discipline_code: "",
      package_tag: "",
    });
  }

  console.log(`[selma-sync] Parsed ${docs.length} documents from HTML`);
  return docs;
}

// ─── Main Handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Allow both scheduled (no auth) and manual (with auth) invocation
  const authHeader = req.headers.get("authorization");
  let triggeredBy: string | null = null;

  if (authHeader) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    triggeredBy = user?.id || null;
  }

  try {
    // ── Phase 1: Configuration Brain ──────────────────────────────────────
    console.log("[selma-sync] Phase 1: Syncing DMS configuration...");

    const [
      { data: projects },
      { data: docTypes },
      { data: disciplines },
      { data: statusCodes },
      { data: numbering },
      { data: plants },
      { data: sites },
    ] = await Promise.all([
      supabase.from("dms_projects").select("*").eq("is_active", true).order("display_order"),
      supabase.from("dms_document_types").select("*").eq("is_active", true).order("display_order"),
      supabase.from("dms_disciplines").select("*").eq("is_active", true).order("display_order"),
      supabase.from("dms_status_codes").select("*").eq("is_active", true).order("display_order"),
      supabase.from("dms_numbering_segments").select("*").eq("is_active", true).order("position"),
      supabase.from("dms_plants").select("*").eq("is_active", true),
      supabase.from("dms_sites").select("*").eq("is_active", true),
    ]);

    // Build config snapshots with hashes for change detection
    const configs = {
      projects: { data: projects, hash: await hashData(JSON.stringify(projects)) },
      document_types: { data: docTypes, hash: await hashData(JSON.stringify(docTypes)) },
      disciplines: { data: disciplines, hash: await hashData(JSON.stringify(disciplines)) },
      status_codes: { data: statusCodes, hash: await hashData(JSON.stringify(statusCodes)) },
      numbering: { data: numbering, hash: await hashData(JSON.stringify(numbering)) },
      plants: { data: plants, hash: await hashData(JSON.stringify(plants)) },
      sites: { data: sites, hash: await hashData(JSON.stringify(sites)) },
    };

    // Check for config changes and upsert snapshots
    const configChanges: string[] = [];
    for (const [configType, { data, hash }] of Object.entries(configs)) {
      const { data: existing } = await supabase
        .from("selma_config_snapshot")
        .select("config_hash")
        .eq("config_type", configType)
        .maybeSingle();

      if (!existing || existing.config_hash !== hash) {
        configChanges.push(configType);
        await supabase.from("selma_config_snapshot").upsert({
          config_type: configType,
          config_data: data,
          config_hash: hash,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "config_type,tenant_id" });
      }
    }

    console.log(`[selma-sync] Config changes detected: ${configChanges.length > 0 ? configChanges.join(", ") : "none"}`);
    console.log(`[selma-sync] Projects loaded: ${projects?.length || 0}, Doc types: ${docTypes?.length || 0}`);

    // ── Phase 2: Assai Document Sync ─────────────────────────────────────
    console.log("[selma-sync] Phase 2: Connecting to Assai...");

    const { data: creds } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "assai")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!creds?.base_url) {
      console.log("[selma-sync] No Assai credentials configured — skipping document sync");
      return respond(200, {
        success: true,
        phase1_config: { changes: configChanges, projects: projects?.length || 0 },
        phase2_sync: { skipped: true, reason: "No credentials" },
        duration_ms: Date.now() - startTime,
      });
    }

    let username = creds.username_encrypted || "";
    let password = creds.password_encrypted || "";
    if (username && isEncrypted(username)) username = await decrypt(username);
    if (password && isEncrypted(password)) password = await decrypt(password);

    // Create sync log entry
    const { data: syncLog } = await supabase.from("dms_sync_logs").insert({
      dms_platform: "assai",
      sync_status: "in_progress",
      sync_route_used: "agent",
      triggered_by: triggeredBy,
      tenant_id: creds.tenant_id,
    }).select("id").single();

    const syncLogId = syncLog?.id;

    try {
      // Login to Assai
      const { sessionCookies } = await assaiLogin(creds.base_url, username, password);
      console.log("[selma-sync] Logged into Assai successfully");

      // Get all project codes to search
      const projectCodes = (projects || [])
        .filter((p: any) => p.code)
        .map((p: any) => ({ code: p.code, projectId: p.project_id, name: p.project_name }));

      console.log(`[selma-sync] Searching ${projectCodes.length} projects...`);

      let totalNew = 0;
      let totalChanged = 0;
      let totalDocuments = 0;
      const allChanges: SyncChange[] = [];

      // Search each project
      for (const proj of projectCodes) {
        const docs = await assaiSearchDocuments(creds.base_url, sessionCookies, proj.code);
        totalDocuments += docs.length;

        for (const doc of docs) {
          // Check if document already exists
          const { data: existing } = await supabase
            .from("dms_external_sync")
            .select("id, revision, status_code, document_title")
            .eq("dms_platform", "assai")
            .eq("document_number", doc.document_number)
            .maybeSingle();

          if (!existing) {
            // New document
            const { data: inserted } = await supabase.from("dms_external_sync").insert({
              dms_platform: "assai",
              document_number: doc.document_number,
              document_title: doc.document_title,
              revision: doc.revision,
              status_code: doc.status_code,
              discipline_code: doc.discipline_code,
              package_tag: doc.package_tag,
              last_synced_at: new Date().toISOString(),
              sync_status: "synced",
              tenant_id: creds.tenant_id,
            }).select("id").single();

            allChanges.push({
              document_number: doc.document_number,
              change_type: "new_document",
              new_value: doc.document_title,
              project_code: proj.code,
              is_vcr_critical: false,
              document_sync_id: inserted?.id,
            });
            totalNew++;
          } else {
            // Check for changes
            const changes: SyncChange[] = [];

            if (existing.status_code !== doc.status_code && doc.status_code) {
              changes.push({
                document_number: doc.document_number,
                change_type: "status_change",
                field_changed: "status_code",
                old_value: existing.status_code || "",
                new_value: doc.status_code,
                project_code: proj.code,
                is_vcr_critical: false,
                document_sync_id: existing.id,
              });
            }

            if (existing.revision !== doc.revision && doc.revision) {
              changes.push({
                document_number: doc.document_number,
                change_type: "revision_change",
                field_changed: "revision",
                old_value: existing.revision || "",
                new_value: doc.revision,
                project_code: proj.code,
                is_vcr_critical: false,
                document_sync_id: existing.id,
              });
            }

            if (existing.document_title !== doc.document_title && doc.document_title) {
              changes.push({
                document_number: doc.document_number,
                change_type: "title_change",
                field_changed: "document_title",
                old_value: existing.document_title || "",
                new_value: doc.document_title,
                project_code: proj.code,
                is_vcr_critical: false,
                document_sync_id: existing.id,
              });
            }

            if (changes.length > 0) {
              // Update the existing record
              await supabase.from("dms_external_sync")
                .update({
                  revision: doc.revision || existing.revision,
                  status_code: doc.status_code || existing.status_code,
                  document_title: doc.document_title || existing.document_title,
                  last_synced_at: new Date().toISOString(),
                })
                .eq("id", existing.id);

              allChanges.push(...changes);
              totalChanged++;
            } else {
              // Just touch the sync timestamp
              await supabase.from("dms_external_sync")
                .update({ last_synced_at: new Date().toISOString() })
                .eq("id", existing.id);
            }
          }
        }
      }

      // ── Phase 3: VCR Critical Document Watch ───────────────────────────
      console.log("[selma-sync] Phase 3: Cross-referencing VCR critical documents...");

      // Get documents flagged in VCR ingest queue
      const { data: vcrDocs } = await supabase
        .from("document_ingest_queue")
        .select("id, document_type_id, project_id, status")
        .not("document_type_id", "is", null);

      // Get critical document type codes (MDR, BOD/BDEP, etc.)
      const criticalTypeCodes = (docTypes || [])
        .filter((dt: any) => dt.is_mdr || /bod|bdep|basis/i.test(dt.document_name))
        .map((dt: any) => dt.code);

      // Mark changes involving VCR-critical documents
      for (const change of allChanges) {
        const docPrefix = change.document_number.split("-").slice(0, 2).join("-");
        const matchesCritical = criticalTypeCodes.some((code: string) =>
          change.document_number.includes(code)
        );
        if (matchesCritical) {
          change.is_vcr_critical = true;
        }
      }

      const vcrCriticalChanges = allChanges.filter(c => c.is_vcr_critical);
      console.log(`[selma-sync] VCR critical changes: ${vcrCriticalChanges.length}`);

      // ── Persist Changes ────────────────────────────────────────────────
      if (allChanges.length > 0 && syncLogId) {
        const changeRows = allChanges.map(c => ({
          sync_log_id: syncLogId,
          document_sync_id: c.document_sync_id,
          document_number: c.document_number,
          change_type: c.change_type,
          field_changed: c.field_changed,
          old_value: c.old_value,
          new_value: c.new_value,
          project_code: c.project_code,
          is_vcr_critical: c.is_vcr_critical,
          tenant_id: creds.tenant_id,
        }));

        await supabase.from("dms_sync_changes").insert(changeRows);
      }

      // Update sync log with results
      if (syncLogId) {
        await supabase.from("dms_sync_logs").update({
          sync_status: "success",
          synced_count: totalDocuments,
          new_documents: totalNew,
          status_changes: totalChanged,
          error_message: null,
        }).eq("id", syncLogId);
      }

      const duration = Date.now() - startTime;
      console.log(`[selma-sync] Complete: ${totalDocuments} docs, ${totalNew} new, ${totalChanged} changed, ${vcrCriticalChanges.length} VCR-critical (${duration}ms)`);

      return respond(200, {
        success: true,
        phase1_config: {
          changes: configChanges,
          projects: projects?.length || 0,
          doc_types: docTypes?.length || 0,
        },
        phase2_sync: {
          total_documents: totalDocuments,
          new_documents: totalNew,
          status_changes: totalChanged,
          projects_searched: projectCodes.length,
        },
        phase3_vcr: {
          critical_changes: vcrCriticalChanges.length,
          critical_types_monitored: criticalTypeCodes.length,
        },
        duration_ms: duration,
      });
    } catch (syncErr: any) {
      console.error("[selma-sync] Sync error:", syncErr);
      if (syncLogId) {
        await supabase.from("dms_sync_logs").update({
          sync_status: "failed",
          error_message: syncErr.message,
        }).eq("id", syncLogId);
      }
      throw syncErr;
    }
  } catch (err: any) {
    console.error("[selma-sync] Fatal error:", err);
    return respond(500, {
      success: false,
      error: err.message || "Internal error",
      duration_ms: Date.now() - startTime,
    });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
