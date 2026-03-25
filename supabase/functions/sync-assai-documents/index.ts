import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AssaiDocument {
  document_number: string;
  document_title: string;
  revision: string;
  status_code: string;
  discipline_code: string;
  work_package_code: string;
}

interface DwrBeanMethod {
  name: string;
  arity: number;
}

const MUTATING_METHOD_PATTERN =
  /^(add|delete|update|save|copy|process|register|validate|check|ocr|import|export|upload|download|remove|set)/i;

/**
 * Normalize Assai work package code (e.g. "ST/DP189") to ORSH format ("DP-189").
 * Preserves original in metadata.
 */
function normalizePackageTag(raw: string): string {
  if (!raw) return "";
  // Remove common prefixes like "ST/" or "EN/"
  const stripped = raw.replace(/^[A-Z]{2}\//i, "");
  // Insert hyphen between letters and digits: DP189 -> DP-189
  return stripped.replace(/^([A-Z]+)(\d+)$/i, "$1-$2");
}

/**
 * Call a DWR method on the Assai server and return the raw response text.
 */
async function callDwr(
  baseUrl: string,
  dbName: string,
  cookies: string[],
  scriptName: string,
  methodName: string,
  params: string[] = [],
  batchId = 0,
): Promise<string> {
  const dwrUrl = `${baseUrl}/AW${dbName}/dwr/call/plaincall/${scriptName}.${methodName}.dwr`;
  const lines = [
    "callCount=1",
    "windowName=",
    `c0-scriptName=${scriptName}`,
    `c0-methodName=${methodName}`,
    "c0-id=0",
    ...params.map((p, i) => `c0-param${i}=${p}`),
    `batchId=${batchId}`,
    "instanceId=0",
    `page=${encodeURIComponent(`/AW${dbName}/forward.aweb?page=root/body`)}`,
    `scriptSessionId=${Date.now()}`,
    "",
  ];
  const resp = await fetch(dwrUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      Cookie: cookies.join("; "),
    },
    body: lines.join("\n"),
    redirect: "manual",
  });
  return await resp.text();
}

/**
 * Navigate to the document register page and extract documents from the HTML table.
 */
async function fetchDocumentsViaWeb(
  baseUrl: string,
  dbName: string,
  cookies: string[],
): Promise<AssaiDocument[]> {
  // Try the standard document register URL pattern
  const registerUrl = `${baseUrl}/AW${dbName}/forward.aweb?page=root/body/documentregister`;
  console.log(`[sync-assai] Fetching document register: ${registerUrl}`);

  const resp = await fetch(registerUrl, {
    method: "GET",
    headers: {
      Cookie: cookies.join("; "),
      Accept: "text/html",
    },
    redirect: "manual",
  });

  const html = await resp.text();
  console.log(`[sync-assai] Register page status=${resp.status}, length=${html.length}`);

  // If we got redirected to login, session failed
  if (html.includes('action="login.aweb"')) {
    throw new Error("Session expired - redirected to login page");
  }

  return [];
}

/**
 * Try to fetch documents via DWR DocumentBean methods.
 * Assai typically exposes search/list via DWR beans.
 */
async function fetchDocumentsViaDwr(
  baseUrl: string,
  dbName: string,
  cookies: string[],
): Promise<AssaiDocument[]> {
  try {
    const interfaceUrl = `${baseUrl}/AW${dbName}/dwr/interface/DWRBean.js`;
    const interfaceResp = await fetch(interfaceUrl, {
      headers: { Cookie: cookies.join("; ") },
    });
    const interfaceJs = await interfaceResp.text();
    console.log(`[sync-assai] DWRBean.js status=${interfaceResp.status}, length=${interfaceJs.length}`);

    const methods = parseDwrBeanMethods(interfaceJs);
    console.log(`[sync-assai] DWRBean methods discovered: ${methods.length}`);

    const docLikeMethods = methods
      .filter((m) => /doc|register|search|mdr|transmittal|package|revision|status|list|grid|result|quick/i.test(m.name))
      .filter((m) => !MUTATING_METHOD_PATTERN.test(m.name))
      .filter((m) => m.arity <= 2)
      .sort((a, b) => {
        const aScore = /search|result|list|grid|quick/i.test(a.name) ? 0 : 1;
        const bScore = /search|result|list|grid|quick/i.test(b.name) ? 0 : 1;
        return aScore - bScore;
      })
      .slice(0, 30);
    console.log(
      `[sync-assai] DWRBean doc-like methods: ${docLikeMethods
        .slice(0, 40)
        .map((m) => `${m.name}(${m.arity})`)
        .join(", ")}`,
    );

    let batch = 1;
    for (const method of docLikeMethods) {
      const invocationPatterns: string[][] = [];

      if (method.arity === 0) {
        invocationPatterns.push([]);
      } else if (method.arity === 1) {
        invocationPatterns.push(["string:%"]);
        invocationPatterns.push(["string:*"]);
        invocationPatterns.push(["string:"]);
        invocationPatterns.push(["null:null"]);
      } else if (method.arity === 2) {
        invocationPatterns.push(["string:%", "number:0"]);
        invocationPatterns.push(["string:", "number:0"]);
        invocationPatterns.push(["string:", "string:"]);
        invocationPatterns.push(["null:null", "null:null"]);
      } else {
        continue;
      }

      for (const params of invocationPatterns) {
        try {
          console.log(
            `[sync-assai] Trying DWRBean.${method.name} with ${params.length} params (${params
              .map((p) => p.split(":")[0])
              .join(",")})`,
          );
          const result = await callDwr(
            baseUrl,
            dbName,
            cookies,
            "DWRBean",
            method.name,
            params,
            batch++,
          );

          if (result.includes("_remoteHandleException")) {
            const exceptionLine = result
              .split("\n")
              .find((line) => line.includes("_remoteHandleException"));
            console.log(
              `[sync-assai] DWRBean.${method.name} returned exception: ${exceptionLine?.substring(0, 220)}`,
            );
            continue;
          }

          if (result.includes("_remoteHandleCallback")) {
            const docs = parseDwrDocumentResponse(result);
            if (docs.length > 0) {
              console.log(`[sync-assai] Parsed ${docs.length} docs from DWRBean.${method.name}`);
              return docs;
            }
            console.log(
              `[sync-assai] DWRBean.${method.name} callback without parsable docs: ${result
                .replace(/\s+/g, " ")
                .substring(0, 450)}`,
            );
          }
        } catch (e) {
          console.log(`[sync-assai] DWRBean.${method.name} failed: ${e}`);
        }
      }
    }
  } catch (e) {
    console.log(`[sync-assai] DWRBean discovery failed: ${e}`);
  }

  return [];
}

function parseDwrBeanMethods(interfaceJs: string): DwrBeanMethod[] {
  const results = new Map<string, DwrBeanMethod>();
  const regex = /DWRBean\.(\w+)\s*=\s*function\(([^)]*)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(interfaceJs)) !== null) {
    const name = match[1];
    const args = match[2]
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const arity = args.filter((a) => a !== "callback").length;
    results.set(name, { name, arity });
  }

  return Array.from(results.values());
}

/**
 * Parse a DWR response for document data.
 * DWR returns data in a specific format with s0, s1, etc. variable assignments.
 */
function parseDwrDocumentResponse(dwrText: string): AssaiDocument[] {
  const docs: AssaiDocument[] = [];
  const seen = new Set<string>();

  const readField = (objText: string, keys: string[]): string => {
    for (const key of keys) {
      const rx = new RegExp(
        `(?:['\"]?${key}['\"]?\\s*:\\s*)(?:\"([^\"]*)\"|'([^']*)'|([^,}]+))`,
        "i",
      );
      const m = objText.match(rx);
      const value = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim();
      if (value && value !== "null" && value !== "undefined") return value;
    }
    return "";
  };

  const pushDocIfAny = (objText: string) => {
    const docNum = readField(objText, [
      "documentNumber",
      "docNumber",
      "number",
      "document_no",
      "doc_no",
      "documentnumber",
    ]);

    if (!docNum || seen.has(docNum)) return;
    seen.add(docNum);

    docs.push({
      document_number: docNum,
      document_title: readField(objText, ["title", "documentTitle", "description", "document_title"]),
      revision: readField(objText, ["revision", "rev", "revisionCode", "currentRevision"]),
      status_code: readField(objText, ["status", "statusCode", "documentStatus", "currentStatus"]),
      discipline_code: readField(objText, ["discipline", "disciplineCode", "discipline_code"]),
      work_package_code: readField(objText, ["workPackage", "workPackageCode", "packageCode", "work_package"]),
    });
  };

  // DWR array response pattern: var s0={...}; var s1={...};
  const objectMatches = dwrText.matchAll(/var\s+s\d+=\{([^}]+)\}/g);

  for (const match of objectMatches) {
    const objText = match[1];
    pushDocIfAny(objText);
  }

  // DWR callback payload pattern
  const callbackPayloadMatch = dwrText.match(/_remoteHandleCallback\('0','0',([\s\S]*?)\);?\s*$/m);
  const callbackPayload = callbackPayloadMatch?.[1] ?? "";
  if (callbackPayload) {
    const payloadObjects = callbackPayload.matchAll(/\{([^{}]+)\}/g);
    for (const m of payloadObjects) {
      pushDocIfAny(m[1]);
    }
  }

  return docs;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID for sync log
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    // Read Assai credentials
    const { data: creds, error: credsError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "assai")
      .limit(1)
      .single();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ success: false, error: "No Assai credentials configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = creds.base_url || "";
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");
    const dbName = creds.db_name || undefined;

    if (!baseUrl || !username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Incomplete Assai credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from("dms_sync_logs")
      .insert({
        dms_platform: "assai",
        credential_id: creds.id,
        sync_status: "in_progress",
        triggered_by: user?.id || null,
        tenant_id: creds.tenant_id,
      })
      .select("id")
      .single();

    const syncLogId = syncLog?.id;

    try {
      // Step 1: Login
      console.log("[sync-assai] Starting Assai login...");
      const loginResult = await loginAssai(baseUrl, username, password, dbName);

      if (!loginResult.success || !loginResult.cookies) {
        const errorMsg = loginResult.error || "Login failed";
        if (syncLogId) {
          await supabase.from("dms_sync_logs").update({
            sync_status: "failed",
            error_message: errorMsg,
          }).eq("id", syncLogId);
        }
        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log(`[sync-assai] Login successful. SessionId=${loginResult.sessionId}`);
      const resolvedBase = loginResult.baseUrl!;
      const resolvedDb = loginResult.dbName!;
      const sessionCookies = loginResult.cookies!;

      // Step 1.5: Discover the Assai interface by fetching the home/forward page
      const forwardUrl = `${resolvedBase}/AW${resolvedDb}/forward.aweb?page=root/body`;
      console.log(`[sync-assai] Fetching forward page: ${forwardUrl}`);
      const forwardResp = await fetch(forwardUrl, {
        headers: { Cookie: sessionCookies.join("; "), Accept: "text/html" },
        redirect: "manual",
      });
      const forwardHtml = await forwardResp.text();
      console.log(`[sync-assai] Forward page status=${forwardResp.status}, length=${forwardHtml.length}`);
      
      // Extract all .aweb links and JS references to discover navigation
      const awebLinks = [...forwardHtml.matchAll(/href=["']([^"']*\.aweb[^"']*)["']/gi)].map(m => m[1]);
      const pageRefs = [...forwardHtml.matchAll(/page=([a-zA-Z0-9/._-]+)/gi)].map(m => m[1]);
      console.log(`[sync-assai] Found .aweb links: ${awebLinks.slice(0, 20).join(", ")}`);
      console.log(`[sync-assai] Found page refs: ${pageRefs.slice(0, 20).join(", ")}`);
      
      // Extract DWR script references
      const dwrScripts = [...forwardHtml.matchAll(/\/dwr\/interface\/(\w+)\.js/gi)].map(m => m[1]);
      console.log(`[sync-assai] DWR scripts in forward page: ${dwrScripts.join(", ")}`);
      
      // Log a snippet of the page for analysis
      console.log(`[sync-assai] Forward page snippet: ${forwardHtml.substring(0, 2000)}`);

      // Step 2: Fetch documents via DWR discovery
      console.log("[sync-assai] Attempting to fetch documents via DWR...");
      let documents = await fetchDocumentsViaDwr(resolvedBase, resolvedDb, sessionCookies);

      // Step 3: Fallback to web scraping if DWR didn't work
      if (documents.length === 0) {
        console.log("[sync-assai] DWR returned no documents, trying web page...");
        documents = await fetchDocumentsViaWeb(resolvedBase, resolvedDb, sessionCookies);
      }

      console.log(`[sync-assai] Total documents fetched: ${documents.length}`);

      // Step 4: Upsert to dms_external_sync
      let syncedCount = 0;
      let failedCount = 0;
      let newCount = 0;
      let statusChanges = 0;

      for (const doc of documents) {
        try {
          const packageTag = normalizePackageTag(doc.work_package_code);

          // Check if document already exists
          const { data: existing } = await supabase
            .from("dms_external_sync")
            .select("id, status_code, revision")
            .eq("dms_platform", "assai")
            .eq("document_number", doc.document_number)
            .limit(1)
            .single();

          if (existing) {
            // Update existing
            if (existing.status_code !== doc.status_code) statusChanges++;
            await supabase.from("dms_external_sync").update({
              document_title: doc.document_title,
              revision: doc.revision,
              status_code: doc.status_code,
              discipline_code: doc.discipline_code,
              package_tag: packageTag,
              last_synced_at: new Date().toISOString(),
              sync_status: "synced",
              metadata: {
                assai_work_package_code: doc.work_package_code,
                last_sync_source: "edge_function",
              },
            }).eq("id", existing.id);
          } else {
            // Insert new
            await supabase.from("dms_external_sync").insert({
              dms_platform: "assai",
              document_number: doc.document_number,
              document_title: doc.document_title,
              revision: doc.revision,
              status_code: doc.status_code,
              discipline_code: doc.discipline_code,
              package_tag: packageTag,
              last_synced_at: new Date().toISOString(),
              sync_status: "synced",
              tenant_id: creds.tenant_id,
              metadata: {
                assai_work_package_code: doc.work_package_code,
                last_sync_source: "edge_function",
              },
            });
            newCount++;
          }
          syncedCount++;
        } catch (e) {
          console.error(`[sync-assai] Failed to sync doc ${doc.document_number}:`, e);
          failedCount++;
        }
      }

      // Step 5: Update sync log
      if (syncLogId) {
        await supabase.from("dms_sync_logs").update({
          sync_status: "completed",
          synced_count: syncedCount,
          failed_count: failedCount,
          new_documents: newCount,
          status_changes: statusChanges,
        }).eq("id", syncLogId);
      }

      // Update last_sync_at on credentials
      await supabase.from("dms_sync_credentials").update({
        last_sync_at: new Date().toISOString(),
      }).eq("id", creds.id);

      return new Response(
        JSON.stringify({
          success: true,
          synced_count: syncedCount,
          new_documents: newCount,
          status_changes: statusChanges,
          failed_count: failedCount,
          message: documents.length === 0
            ? "Login successful but no documents found yet. Check logs for DWR discovery results."
            : `Synced ${syncedCount} documents (${newCount} new, ${statusChanges} status changes)`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (syncErr: any) {
      console.error("[sync-assai] Sync error:", syncErr);
      if (syncLogId) {
        await supabase.from("dms_sync_logs").update({
          sync_status: "failed",
          error_message: syncErr.message || "Sync failed",
          error_details: { stack: syncErr.stack, message: syncErr.message },
        }).eq("id", syncLogId);
      }
      return new Response(
        JSON.stringify({ success: false, error: syncErr.message || "Sync failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err: any) {
    console.error("[sync-assai] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});