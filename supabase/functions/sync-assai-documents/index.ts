import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Extract Set-Cookie pairs from a response.
 */
function extractCookies(resp: Response): string[] {
  const headersAny = resp.headers as unknown as { getSetCookie?: () => string[] };
  const setCookies = headersAny.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    return setCookies.map((c) => c.split(";")[0].trim()).filter(Boolean);
  }
  const raw = resp.headers.get("set-cookie");
  if (!raw) return [];
  return raw.split(/,(?=[^;]+=[^;]+)/g).map((c) => c.split(";")[0].trim()).filter(Boolean);
}

/**
 * Merge cookies, keeping latest value per name.
 */
function mergeCookies(existing: string[], newOnes: string[]): string[] {
  const map = new Map<string, string>();
  for (const c of [...existing, ...newOnes]) {
    const [name, ...rest] = c.split("=");
    if (name && rest.length > 0) map.set(name.trim(), c);
  }
  return Array.from(map.values());
}

/**
 * Obtain a Bearer token via the Assai OAuth implicit-grant flow.
 */
async function getAssaiBearerToken(
  baseUrl: string,
  dbName: string,
  username: string,
  password: string,
): Promise<{ token: string | null; error?: string }> {
  const redirectUri = `${baseUrl}/AAeu578/access_token.jsp?client_id=${dbName}`;
  const authorizeUrl = `${baseUrl}/AAeu578/oauth/authorize?client_id=${dbName}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token`;

  console.log(`[sync-assai] OAuth Step 1: ${authorizeUrl}`);

  let cookies: string[] = [];

  // Step 1: Hit authorize — expect redirect to login.jsp
  const authResp = await fetch(authorizeUrl, {
    method: "GET",
    headers: { "Accept": "text/html" },
    redirect: "manual",
  });
  cookies = mergeCookies(cookies, extractCookies(authResp));
  await authResp.text();

  let location = authResp.headers.get("location");
  console.log(`[sync-assai] OAuth authorize status=${authResp.status}, location=${location?.substring(0, 250)}`);

  if (!location) {
    return { token: null, error: "OAuth authorize did not redirect" };
  }

  // Resolve relative/http URLs
  let loginUrl = location.startsWith("http") ? location : new URL(location, authorizeUrl).toString();

  // Follow any intermediate redirects (e.g., http→https 301)
  for (let i = 0; i < 5; i++) {
    if (loginUrl.includes("login.jsp") || loginUrl.includes("login.aweb")) break;

    const intermediateResp = await fetch(loginUrl, {
      method: "GET",
      headers: { "Cookie": cookies.join("; "), "Accept": "text/html" },
      redirect: "manual",
    });
    cookies = mergeCookies(cookies, extractCookies(intermediateResp));
    await intermediateResp.text();

    const nextLoc = intermediateResp.headers.get("location");
    if (!nextLoc || intermediateResp.status < 300 || intermediateResp.status >= 400) break;
    loginUrl = nextLoc.startsWith("http") ? nextLoc : new URL(nextLoc, loginUrl).toString();
  }

  // CRITICAL: Force HTTPS to prevent http→https 301 which converts POST to GET
  loginUrl = loginUrl.replace(/^http:\/\//i, "https://");
  console.log(`[sync-assai] OAuth Step 2: Login page URL = ${loginUrl.substring(0, 250)}`);

  const loginUrlWithOrig = loginUrl.includes("orig_request")
    ? loginUrl
    : `${loginUrl}${loginUrl.includes("?") ? "&" : "?"}loginMethod=unpw&orig_request=${encodeURIComponent(authorizeUrl)}`;

  console.log(`[sync-assai] Login URL with orig_request: ${loginUrlWithOrig.substring(0, 300)}`);

  // Step 2: GET the login page to capture hidden fields
  const loginPageResp = await fetch(loginUrlWithOrig, {
    method: "GET",
    headers: { "Cookie": cookies.join("; "), "Accept": "text/html" },
    redirect: "follow",
  });
  cookies = mergeCookies(cookies, extractCookies(loginPageResp));
  const loginPageBody = await loginPageResp.text();
  const loginFinalUrl = loginPageResp.url || loginUrlWithOrig;

  console.log(`[sync-assai] Login page final_url=${loginFinalUrl.substring(0, 200)}, status=${loginPageResp.status}, body_length=${loginPageBody.length}`);

  const tokenInLoginUrl = loginFinalUrl.match(/[#&]access_token=([^&\s]+)/);
  if (tokenInLoginUrl) return { token: tokenInLoginUrl[1] };

  const extractHidden = (name: string): string => {
    const match = loginPageBody.match(new RegExp(`name=["']${name}["'][^>]*value=["']([^"']*)["']`, "i"));
    if (match) return match[1];
    const match2 = loginPageBody.match(new RegExp(`value=["']([^"']*)["'][^>]*name=["']${name}["']`, "i"));
    return match2?.[1] ?? "";
  };

  const crValue = extractHidden("cr");
  const origRequestFromForm = extractHidden("orig_request");

  const formTag = loginPageBody.match(/<form[^>]*/i)?.[0] || "no form found";
  const formAction = loginPageBody.match(/action=["']([^"']+)["']/i)?.[1] || "";
  const formMethod = loginPageBody.match(/method=["']([^"']+)["']/i)?.[1] || "GET";

  const inputFields: Array<{ name: string; type: string; value: string }> = [];
  const inputRegex = /<input[^>]*>/gi;
  let inputMatch;
  while ((inputMatch = inputRegex.exec(loginPageBody)) !== null) {
    const tag = inputMatch[0];
    const name = tag.match(/name=["']([^"']+)["']/i)?.[1] ?? "";
    if (!name) continue;
    const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "text";
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? "";
    inputFields.push({ name, type, value });
  }

  const inputFieldLabels = inputFields.map((f) => `${f.name}(${f.type})`);

  console.log(`[sync-assai] Form tag: ${formTag}`);
  console.log(`[sync-assai] Form action=${formAction}, method=${formMethod}`);
  console.log(`[sync-assai] Form inputs: ${inputFieldLabels.join(", ")}`);
  console.log(`[sync-assai] Hidden cr=${crValue ? "present" : "empty"}, orig_request=${origRequestFromForm ? "present" : "empty"}`);
  console.log(`[sync-assai] Login page body (first 2000): ${loginPageBody.substring(0, 2000)}`);

  // Step 3: POST credentials
  const loginFinalNoHash = loginFinalUrl.split("#")[0].replace(/^http:\/\//i, "https://");
  const loginPostUrlFromAction = (formAction
    ? new URL(formAction, loginFinalNoHash).toString()
    : loginFinalNoHash
  ).replace(/^http:\/\//i, "https://");

  const loginPostUrlWithQuery = loginFinalNoHash;
  const loginPostUrl =
    /\/login\.jsp$/i.test(formAction || "") && loginPostUrlWithQuery.includes("?")
      ? loginPostUrlWithQuery
      : loginPostUrlFromAction;

  const hasField = (name: string) => inputFields.some((f) => f.name === name);

  const usernameField = ["j_username", "username", "userid", "userId"].find(hasField) || "username";
  const passwordField = ["j_password", "password", "passwd"].find(hasField) || "password";

  const formData = new URLSearchParams();
  for (const field of inputFields) {
    if (field.type === "hidden") {
      formData.set(field.name, field.value || "");
    }
  }
  formData.set(usernameField, username);
  formData.set(passwordField, password);
  if (!formData.has("orig_request")) formData.set("orig_request", origRequestFromForm || authorizeUrl);
  if (!formData.has("loginMethod")) formData.set("loginMethod", "unpw");
  if (!formData.has("client_id")) formData.set("client_id", dbName);

  console.log(`[sync-assai] OAuth Step 3: POSTing to ${loginPostUrl} with fields: ${Array.from(formData.keys()).join(", ")}`);

  const doLoginPost = async (url: string) => {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookies.join("; "),
        "Accept": "text/html",
        "Referer": loginFinalNoHash,
        "Origin": new URL(url).origin,
      },
      body: formData.toString(),
      redirect: "manual",
    });
    cookies = mergeCookies(cookies, extractCookies(resp));
    const body = await resp.text();
    return {
      status: resp.status,
      location: resp.headers.get("location"),
      body,
      url,
    };
  };

  let loginAttempt = await doLoginPost(loginPostUrl);

  if (loginAttempt.status === 405 && loginPostUrl !== loginPostUrlWithQuery) {
    console.log(`[sync-assai] Login POST got 405, retrying with query URL: ${loginPostUrlWithQuery}`);
    loginAttempt = await doLoginPost(loginPostUrlWithQuery);
  }

  const postLocation = loginAttempt.location;
  console.log(`[sync-assai] Login POST status=${loginAttempt.status}, location=${postLocation?.substring(0, 250) ?? "null"}, url=${loginAttempt.url}`);

  if (loginAttempt.status >= 400) {
    console.log(`[sync-assai] Login POST error body: ${loginAttempt.body.substring(0, 500)}`);
  }

  if (!postLocation) {
    const bodyToken = loginAttempt.body.match(/access_token[=:]["'\s]*([A-Za-z0-9\-._~+/]+=*)/);
    if (bodyToken) return { token: bodyToken[1] };
    return {
      token: null,
      error: `Login POST returned ${loginAttempt.status} with no redirect. method=${formMethod}, action=${formAction}, usernameField=${usernameField}, passwordField=${passwordField}`,
    };
  }

  // Step 4: Follow the redirect chain after login to capture the token
  let currentUrl = postLocation.startsWith("http") ? postLocation : new URL(postLocation, loginPostUrl).toString();
  currentUrl = currentUrl.replace(/^http:\/\//i, "https://");

  for (let hop = 0; hop < 10; hop++) {
    const tokenInUrl = currentUrl.match(/[#&]access_token=([^&\s]+)/);
    if (tokenInUrl) {
      console.log(`[sync-assai] Token found in URL at hop ${hop}`);
      return { token: tokenInUrl[1] };
    }

    const resp = await fetch(currentUrl, {
      method: "GET",
      headers: {
        "Cookie": cookies.join("; "),
        "Accept": "text/html",
      },
      redirect: "manual",
    });
    cookies = mergeCookies(cookies, extractCookies(resp));

    const loc = resp.headers.get("location");
    console.log(`[sync-assai] Redirect hop ${hop}: status=${resp.status}, location=${loc?.substring(0, 250) ?? "none"}`);

    if (loc) {
      const tokenMatch = loc.match(/[#&]access_token=([^&\s]+)/);
      if (tokenMatch) {
        await resp.text();
        console.log(`[sync-assai] Token found in Location header at hop ${hop}`);
        return { token: tokenMatch[1] };
      }
    }

    if (resp.status >= 300 && resp.status < 400 && loc) {
      await resp.text();
      currentUrl = loc.startsWith("http") ? loc : new URL(loc, currentUrl).toString();
      continue;
    }

    const body = await resp.text();
    console.log(`[sync-assai] Final page: ${currentUrl.substring(0, 200)}`);
    console.log(`[sync-assai] Final body preview: ${body.substring(0, 300)}`);

    const bodyMatch = body.match(/access_token[=:]["'\s]*([A-Za-z0-9\-._~+/]+=*)/);
    if (bodyMatch) return { token: bodyMatch[1] };

    const inputMatchFinal = body.match(/value=["'](Bearer [^"']+|[A-Za-z0-9\-._~+/]{20,})['"]/);
    if (inputMatchFinal) {
      const val = inputMatchFinal[1].replace(/^Bearer\s+/, "");
      return { token: val };
    }

    break;
  }

  return { token: null, error: "Could not extract token after following all redirects" };
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

    // Parse request body for sync_method parameter
    let syncMethod: string | null = null;
    try {
      const body = await req.json();
      syncMethod = body?.sync_method || null;
    } catch {
      // No body or invalid JSON — default behavior
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    const { data: creds, error: credsError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "assai")
      .limit(1)
      .maybeSingle();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ success: false, error: "No Assai credentials configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = (creds.base_url || "").replace(/\/+$/, "");
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");
    const dbName = creds.db_name || "";

    const normalizedBase = baseUrl.replace(/\/AW[^/]+\/login\.aweb.*$/i, "").replace(/\/+$/, "");
    let resolvedBase: string;
    try {
      const u = new URL(normalizedBase);
      resolvedBase = `${u.origin}`;
    } catch {
      resolvedBase = normalizedBase;
    }
    const resolvedDb = dbName || (() => {
      const m = baseUrl.match(/\/AW([^/]+?)(?:\/|$)/i);
      return m?.[1]?.toLowerCase() ?? "";
    })();

    // Create sync log
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

    // Incremental counters — survive timeouts because we save after each page
    let totalSynced = 0;
    let totalFailed = 0;
    let totalNew = 0;
    let totalStatusChanges = 0;
    let syncRoute = "none";

    /**
     * Upsert a batch of documents immediately and update the sync log.
     * This ensures data is persisted even if the function times out on later pages.
     */
    async function upsertBatch(docs: any[], route: string) {
      syncRoute = route;
      for (const doc of docs) {
        try {
          const docNumber = doc.document_number || "";
          if (!docNumber) continue;

          const payload = {
            document_title: doc.document_title || "",
            revision: doc.revision || "",
            status_code: doc.status_code || "",
            discipline_code: doc.discipline_code || "",
            package_tag: doc.work_package_code || "",
            last_synced_at: new Date().toISOString(),
            sync_status: "synced",
            metadata: { raw: doc, last_sync_source: route },
          };

          const { data: existing } = await supabase
            .from("dms_external_sync")
            .select("id, status_code")
            .eq("dms_platform", "assai")
            .eq("document_number", docNumber)
            .limit(1)
            .maybeSingle();

          if (existing) {
            if (existing.status_code !== payload.status_code) totalStatusChanges++;
            await supabase.from("dms_external_sync").update(payload).eq("id", existing.id);
          } else {
            await supabase.from("dms_external_sync").insert({
              ...payload,
              dms_platform: "assai",
              document_number: docNumber,
              tenant_id: creds.tenant_id,
            });
            totalNew++;
          }
          totalSynced++;
        } catch (e) {
          console.error(`[sync-assai] Failed to sync doc:`, e);
          totalFailed++;
        }
      }

      // Update sync log after each batch so progress is visible even on timeout
      if (syncLogId) {
        await supabase.from("dms_sync_logs").update({
          sync_status: "in_progress",
          synced_count: totalSynced,
          failed_count: totalFailed,
          new_documents: totalNew,
          status_changes: totalStatusChanges,
          sync_route_used: route,
        }).eq("id", syncLogId);
      }
      console.log(`[sync-assai] Batch saved: total=${totalSynced}, new=${totalNew}, changes=${totalStatusChanges}`);
    }

    try {
      // Step 1: Login via shared loginAssai to get session cookies
      console.log(`[sync-assai] Logging in via loginAssai. base=${resolvedBase}, db=${resolvedDb}`);
      const loginResult = await loginAssai(resolvedBase, username, password, resolvedDb);

      if (!loginResult.success || !loginResult.cookies?.length) {
        throw new Error(`Login failed: ${loginResult.error || "No session cookies"}`);
      }

      const sessionCookies = loginResult.cookies;
      console.log(`[sync-assai] Login succeeded. ${sessionCookies.length} cookies.`);

      // ── ROUTE 1: OAuth Bearer token + REST API ──────────────────────
      let route1Success = false;

      try {
        console.log("[sync-assai] Route 1: Attempting OAuth + REST API...");

        const tokenPageUrl = `${resolvedBase}/AA${resolvedDb}/access_token.jsp?client_id=${resolvedDb}`;
        const tokenResp = await fetch(tokenPageUrl, {
          headers: { "Cookie": sessionCookies.join("; "), "Accept": "text/html" },
          redirect: "follow",
        });
        const tokenHtml = await tokenResp.text();

        const tokenMatch = tokenHtml.match(/value=["'](Bearer\s+[A-Za-z0-9\-._~+/]+=*)['"]/i)
          || tokenHtml.match(/value=["']([A-Za-z0-9\-._~+/]{30,})['"]/);

        const rawToken = tokenMatch?.[1] || null;
        const bearerToken = rawToken?.startsWith("Bearer ") ? rawToken.replace("Bearer ", "").trim() : rawToken;

        console.log(`[sync-assai] Route 1: Bearer token ${bearerToken ? "found (len=" + bearerToken.length + ")" : "NOT found"}`);

        if (bearerToken) {
          const docsResp = await fetch(`${resolvedBase}/AA${resolvedDb}/api/v1/documents`, {
            headers: {
              "Authorization": `Bearer ${bearerToken}`,
              "Accept": "application/json",
            },
          });

          console.log(`[sync-assai] Route 1: Docs API status=${docsResp.status}`);

          if (docsResp.ok) {
            const docsJson = await docsResp.json();
            const parsed = Array.isArray(docsJson)
              ? docsJson
              : docsJson.data || docsJson.documents || docsJson.results || docsJson.items || [];

            if (parsed.length > 0) {
              const documents = parsed.map((doc: any) => ({
                document_number: doc.document_number || doc.documentNumber || doc.number || "",
                document_title: doc.title || doc.document_title || doc.description || "",
                revision: doc.revision || doc.rev || "",
                status_code: doc.status || doc.status_code || "",
                discipline_code: doc.discipline || doc.discipline_code || "",
                work_package_code: doc.work_package || doc.workPackage || "",
              }));
              await upsertBatch(documents, "oauth_rest");
              route1Success = true;
              console.log(`[sync-assai] Route 1 SUCCESS: ${documents.length} documents via OAuth REST`);
            }
          }
        }
      } catch (e) {
        console.log(`[sync-assai] Route 1 failed: ${e}`);
      }

      // ── ROUTE 2: Form-based HTML scraping (proven fallback) ────────
      if (!route1Success) {
        console.log("[sync-assai] Route 2: Falling back to form-based HTML scraping...");
        const awBase = `${resolvedBase}/AW${resolvedDb}`;

        try {
          const searchUrl = `${awBase}/search.aweb?subclass_type=DES_DOC`;
          const searchResp = await fetch(searchUrl, {
            headers: { Cookie: sessionCookies.join("; "), Accept: "text/html" },
            redirect: "follow",
          });
          const searchHtml = await searchResp.text();
          console.log(`[sync-assai] Route 2: Search form status=${searchResp.status}, length=${searchHtml.length}`);

          const formFields: Array<{ name: string; type: string; value: string }> = [];
          const formInputRegex = /<input[^>]*>/gi;
          let formInputM;
          while ((formInputM = formInputRegex.exec(searchHtml)) !== null) {
            const tag = formInputM[0];
            const name = tag.match(/name=["']([^"']+)["']/i)?.[1] ?? "";
            if (!name) continue;
            const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "text";
            const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? "";
            formFields.push({ name, type, value });
          }

          const searchFormData = new URLSearchParams();
          for (const f of formFields) {
            if (f.type === "hidden" && f.name && f.value) searchFormData.set(f.name, f.value);
          }
          for (const f of formFields) {
            if (f.type === "text" || f.type === "") searchFormData.set(f.name, "");
          }
          searchFormData.set("subclass_type", "DES_DOC");

          let pageNum = 0;
          const maxPages = 50;
          let hasMorePages = true;

          while (hasMorePages && pageNum < maxPages) {
            pageNum++;
            if (pageNum > 1) {
              searchFormData.set("start_row", String((pageNum - 1) * 100 + 1));
            }

            console.log(`[sync-assai] Route 2: Fetching page ${pageNum}...`);
            const resultResp = await fetch(`${awBase}/result.aweb`, {
              method: "POST",
              headers: {
                Cookie: sessionCookies.join("; "),
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "text/html",
                Referer: searchUrl,
              },
              body: searchFormData.toString(),
              redirect: "follow",
            });
            const resultHtml = await resultResp.text();

            if (resultResp.status !== 200 || resultHtml.includes("applet:error") || resultHtml.length < 5000) {
              console.log(`[sync-assai] Route 2: Page ${pageNum} error or empty (status=${resultResp.status}, len=${resultHtml.length})`);
              hasMorePages = false;
              break;
            }

            const myCellsMatch = resultHtml.match(/var\s+myCells\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function|\/\/|\n\s*\n)/);
            if (myCellsMatch) {
              try {
                const myCells: string[][] = JSON.parse(myCellsMatch[1]);
                console.log(`[sync-assai] Route 2: Page ${pageNum} - myCells has ${myCells.length} rows`);

                const pageDocs: any[] = [];
                for (const row of myCells) {
                  if (!Array.isArray(row) || row.length < 10) continue;
                  const fullDocNum = (row[3] || "").replace(/<[^>]+>/g, "").trim();
                  if (!fullDocNum || fullDocNum === "DOCUMENT NR") continue;

                  pageDocs.push({
                    document_number: fullDocNum,
                    document_title: (row[8] || "").replace(/<[^>]+>/g, "").trim(),
                    revision: (row[4] || "").replace(/<[^>]+>/g, "").trim(),
                    status_code: (row[6] || "").replace(/<[^>]+>/g, "").trim(),
                    discipline_code: (row[13] || "").replace(/<[^>]+>/g, "").trim(),
                    originator: (row[10] || "").replace(/<[^>]+>/g, "").trim(),
                    date: (row[5] || "").replace(/<[^>]+>/g, "").trim(),
                  });
                }

                // Save this page's documents IMMEDIATELY — survives timeout
                if (pageDocs.length > 0) {
                  await upsertBatch(pageDocs, "form_scrape");
                }

                if (myCells.length < 100) {
                  hasMorePages = false;
                }
              } catch (parseErr) {
                console.log(`[sync-assai] Route 2: Failed to parse myCells JSON: ${parseErr}`);
                hasMorePages = false;
              }
            } else {
              console.log(`[sync-assai] Route 2: No myCells found on page ${pageNum}, trying regex fallback`);
              const docPattern = /["'](\d{4}-[A-Z]{2,}-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z]{2}-\d{4}-\d{5})["']/g;
              let docMatch;
              const seenOnPage = new Set<string>();
              const regexDocs: any[] = [];
              while ((docMatch = docPattern.exec(resultHtml)) !== null) {
                const num = docMatch[1];
                if (!seenOnPage.has(num)) {
                  seenOnPage.add(num);
                  regexDocs.push({
                    document_number: num,
                    document_title: "",
                    revision: "",
                    status_code: "",
                    discipline_code: "",
                  });
                }
              }
              if (regexDocs.length > 0) {
                await upsertBatch(regexDocs, "form_scrape");
              }
              hasMorePages = false;
            }
          }

          if (totalSynced > 0 && syncRoute === "form_scrape") {
            console.log(`[sync-assai] Route 2 SUCCESS: ${totalSynced} documents via form scrape (${pageNum} pages)`);
          } else if (totalSynced === 0) {
            console.log(`[sync-assai] Route 2: 0 documents extracted`);
          }
        } catch (e) {
          console.log(`[sync-assai] Route 2 failed: ${e}`);
        }
      }

      console.log(`[sync-assai] Final: ${totalSynced} documents via ${syncRoute}`);

      // Final sync log update — mark as completed
      if (syncLogId) {
        await supabase.from("dms_sync_logs").update({
          sync_status: totalSynced > 0 ? "completed" : "failed",
          synced_count: totalSynced,
          failed_count: totalFailed,
          new_documents: totalNew,
          status_changes: totalStatusChanges,
          sync_route_used: syncRoute,
        }).eq("id", syncLogId);
      }

      await supabase.from("dms_sync_credentials").update({
        last_sync_at: new Date().toISOString(),
      }).eq("id", creds.id);

      return new Response(
        JSON.stringify({
          success: true,
          synced_count: totalSynced,
          new_documents: totalNew,
          status_changes: totalStatusChanges,
          failed_count: totalFailed,
          sync_route: syncRoute,
          message: totalSynced === 0
            ? "Authenticated successfully but no documents returned via either route."
            : `Synced ${totalSynced} documents (${totalNew} new, ${totalStatusChanges} status changes) via ${syncRoute}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    } catch (syncErr: any) {
      console.error("[sync-assai] Sync error:", syncErr);
      if (syncLogId) {
        await supabase.from("dms_sync_logs").update({
          sync_status: totalSynced > 0 ? "partial" : "failed",
          synced_count: totalSynced,
          failed_count: totalFailed,
          new_documents: totalNew,
          status_changes: totalStatusChanges,
          error_message: syncErr.message,
          error_details: { stack: syncErr.stack },
          sync_route_used: syncRoute || "none",
        }).eq("id", syncLogId);
      }
      return new Response(
        JSON.stringify({ success: false, error: syncErr.message, partial_synced: totalSynced }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
