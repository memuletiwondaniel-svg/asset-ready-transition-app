// Shared Assai authentication helper

export interface AssaiLoginResult {
  success: boolean;
  sessionId?: string;
  cookies?: string[];
  baseUrl?: string;
  dbName?: string;
  error?: string;
  response_time_ms?: number;
}

const normalizeAssaiBaseUrl = (rawBaseUrl: string): string => {
  const trimmed = rawBaseUrl.trim();

  try {
    const url = new URL(trimmed);
    const hasAssaiLoginPath = /\/AW[^/]+\/login\.aweb$/i.test(url.pathname);
    const safePath = hasAssaiLoginPath ? "" : url.pathname.replace(/\/+$/, "");
    return `${url.origin}${safePath}`;
  } catch {
    return trimmed
      .replace(/\/AW[^/]+\/login\.aweb.*$/i, "")
      .replace(/\/+$/, "");
  }
};

const extractDbNameFromUrl = (rawBaseUrl: string): string | null => {
  const match = rawBaseUrl.match(/\/AW([^/]+?)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
};

const extractInputValue = (html: string, fieldName: string, fallback = ""): string => {
  const regex = new RegExp(`(?:id|name)="${fieldName}"[^>]*value="([^"]*)"`, "i");
  return regex.exec(html)?.[1] ?? fallback;
};

const extractCookiePairs = (resp: Response): string[] => {
  const headersAny = resp.headers as unknown as { getSetCookie?: () => string[] };
  const setCookies = headersAny.getSetCookie?.() ?? [];

  if (setCookies.length > 0) {
    return setCookies.map((cookie) => cookie.split(";")[0].trim()).filter(Boolean);
  }

  const raw = resp.headers.get("set-cookie");
  if (!raw) return [];

  return raw
    .split(/,(?=[^;]+=[^;]+)/g)
    .map((cookie) => cookie.split(";")[0].trim())
    .filter(Boolean);
};

const uniqueCookiePairs = (cookies: string[]): string[] => {
  const map = new Map<string, string>();
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (!name || rest.length === 0) continue;
    map.set(name.trim(), `${name.trim()}=${rest.join("=")}`);
  }
  return Array.from(map.values());
};

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const encryptAssaiField = async (
  passphrase: string,
  plainText: string,
  saltHex: string,
  ivHex: string,
  hashAlgo: string = "SHA-1",
): Promise<string> => {
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: hashAlgo,
      salt: hexToBytes(saltHex),
      iterations: 1000,
    },
    passphraseKey,
    { name: "AES-CBC", length: 128 },
    false,
    ["encrypt"],
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: hexToBytes(ivHex) },
    aesKey,
    new TextEncoder().encode(plainText),
  );

  return bytesToBase64(new Uint8Array(ciphertext));
};

/**
 * Login to Assai Cloud using the same encrypted flow used by the browser login form.
 * Returns a session result with timing info.
 */
export async function loginAssai(
  baseUrl: string,
  username: string,
  password: string,
  dbName?: string,
): Promise<AssaiLoginResult> {
  const normalizedBaseUrl = normalizeAssaiBaseUrl(baseUrl);
  const resolvedDbName = dbName || extractDbNameFromUrl(baseUrl);
  if (!resolvedDbName) {
    return { success: false, error: "Cannot determine database name from URL. Expected URL containing /AW<dbname>/" };
  }
  const loginPath = `/AW${resolvedDbName}/login.aweb`;
  const loginPageUrl = `${normalizedBaseUrl}${loginPath}?loginMethod=unpw`;
  const loginPostUrl = `${normalizedBaseUrl}${loginPath}`;
  console.log(`[assai-auth] Attempting login to ${loginPostUrl} as ${username}`);
  console.log(`[assai-auth] normalized_base_url=${normalizedBaseUrl}`);
  console.log(`[assai-auth] password_length=${password.length}`);

  const start = Date.now();

  try {
    // 1) Load login page and capture hidden form fields + cookies
    const loginPageResp = await fetch(loginPageUrl, { method: "GET", redirect: "manual" });
    const loginPageStatus = loginPageResp.status;
    const loginPageBody = await loginPageResp.text();
    let cookies = extractCookiePairs(loginPageResp);

    console.log(`[assai-auth] Step 1 - Login page GET: status=${loginPageStatus}, cookies=${JSON.stringify(cookies)}`);

    const contentUrl = extractInputValue(loginPageBody, "contentUrl", "./forward.aweb?page=root/body");
    const followUp = extractInputValue(loginPageBody, "followUp", "null");
    const uniqueName = extractInputValue(loginPageBody, "uniqueName", "");
    const ssodata = extractInputValue(loginPageBody, "ssodata", "null");
    const loginMethod = extractInputValue(loginPageBody, "loginMethod", "unpw");

    console.log(`[assai-auth] Hidden fields: contentUrl=${contentUrl}, followUp=${followUp}, uniqueName=${uniqueName}, ssodata=${ssodata}, loginMethod=${loginMethod}`);

    // 2) Request passphrase via DWR, same as submitSecureLogon() in Assai login.js
    const dwrUrl = `${normalizedBaseUrl}/AW${resolvedDbName}/dwr/call/plaincall/DWRBean.getSessionID.dwr`;
    const cookieHeader = uniqueCookiePairs(cookies).join("; ");
    console.log(`[assai-auth] Step 2 - DWR call cookies: ${cookieHeader}`);
    const dwrBody = [
      "callCount=1",
      "windowName=",
      "c0-scriptName=DWRBean",
      "c0-methodName=getSessionID",
      "c0-id=0",
      "batchId=0",
      "instanceId=0",
      `page=${encodeURIComponent(`/AW${resolvedDbName}/login.aweb?loginMethod=unpw`)}`,
      `scriptSessionId=${Date.now()}`,
      "",
    ].join("\n");

    const dwrResp = await fetch(dwrUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: dwrBody,
      redirect: "manual",
    });

    const dwrText = await dwrResp.text();
    console.log(`[assai-auth] DWR response status=${dwrResp.status}, length=${dwrText.length}`);
    console.log(`[assai-auth] DWR response preview: ${dwrText.substring(0, 300)}`);
    cookies = uniqueCookiePairs([...cookies, ...extractCookiePairs(dwrResp)]);
    console.log(`[assai-auth] Step 2 - After DWR, merged cookies: ${JSON.stringify(cookies)}`);

    const passphraseMatch = dwrText.match(/_remoteHandleCallback\('0','0',"([A-F0-9]+)"\)/i);
    let passphrase = passphraseMatch?.[1];
    console.log(`[assai-auth] Passphrase extracted: ${passphrase ? `yes (${passphrase.length} chars)` : 'NO'}`);

    if (!passphrase) {
      const elapsed = Date.now() - start;
      return { success: false, error: "Failed to initialize Assai secure login session", response_time_ms: elapsed };
    }

    // 3) Try SHA-256 first (newer CryptoJS default), then SHA-1 fallback
    const hashAlgos = ["SHA-256", "SHA-1"];
    
    for (const hashAlgo of hashAlgos) {
      const ivHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      const saltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      console.log(`[assai-auth] Trying ${hashAlgo}: username_length=${username.length}, password_length=${password.length}`);
      const cipherusr = await encryptAssaiField(passphrase, username, saltHex, ivHex, hashAlgo);
      const cipherpwd = await encryptAssaiField(passphrase, password, saltHex, ivHex, hashAlgo);

      const formBody = new URLSearchParams({
        iv: ivHex,
        salt: saltHex,
        cipherusr,
        cipherpwd,
        iterationCount: "1000",
        keySize: "128",
        contentUrl,
        followUp,
        uniqueName,
        isSecure: "true",
        dbname: resolvedDbName,
        ssodata,
        loginMethod,
        remember_me: "false",
      });

      // 4) Perform encrypted login
      const loginResp = await fetch(loginPostUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": loginPageUrl,
          "Origin": normalizedBaseUrl,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          ...(cookies.length ? { Cookie: cookies.join("; ") } : {}),
        },
        body: formBody.toString(),
        redirect: "manual",
      });

      const elapsed = Date.now() - start;
      const body = await loginResp.text();
      console.log(`[assai-auth] [${hashAlgo}] Response status=${loginResp.status}, body_length=${body.length}, elapsed=${elapsed}ms`);

      const lowerBody = body.toLowerCase();
      const hasForm = lowerBody.includes('id="form" action="login.aweb" method="post"');
      const hasUserid = lowerBody.includes('name="userid"');
      const hasButton = lowerBody.includes('id="button_log_on"');
      const returnedLoginForm = loginResp.status === 200 && hasForm && hasUserid && hasButton;

      if (returnedLoginForm) {
        console.log(`[assai-auth] [${hashAlgo}] Login form returned — trying next hash algo if available`);
        // Need fresh session for next attempt — get new cookies and passphrase
        if (hashAlgo !== hashAlgos[hashAlgos.length - 1]) {
          // Re-fetch login page for a fresh session
          const freshResp = await fetch(loginPageUrl, { method: "GET", redirect: "manual" });
          const freshBody = await freshResp.text();
          cookies = extractCookiePairs(freshResp);
          const freshCookieHeader = uniqueCookiePairs(cookies).join("; ");
          
          const freshDwrResp = await fetch(dwrUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain", ...(freshCookieHeader ? { Cookie: freshCookieHeader } : {}) },
            body: dwrBody,
            redirect: "manual",
          });
          const freshDwrText = await freshDwrResp.text();
          cookies = uniqueCookiePairs([...cookies, ...extractCookiePairs(freshDwrResp)]);
          const freshMatch = freshDwrText.match(/_remoteHandleCallback\('0','0',"([A-F0-9]+)"\)/i);
          if (freshMatch?.[1]) {
            passphrase = freshMatch[1];
            console.log(`[assai-auth] Refreshed session for next attempt, new passphrase: ${passphrase.substring(0,8)}...`);
          }
          continue;
        }
        // Last attempt failed
        const errorMatch = body.match(/class="error[^"]*"[^>]*>(.*?)<\//i) || body.match(/loginError[^>]*>(.*?)<\//i);
        const errorDetail = errorMatch?.[1]?.trim() || 'Decryption mismatch';
        return { success: false, error: `Login failed after trying all hash algorithms (${errorDetail})`, response_time_ms: elapsed };
      }

      if (loginResp.status === 302 || loginResp.status === 200) {
        const allCookies = uniqueCookiePairs([...cookies, ...extractCookiePairs(loginResp)]);
        const jsession = allCookies.find((cookie) => cookie.startsWith("JSESSIONID="));
        const sessionId = jsession?.split("=")[1] ?? "unknown";
        console.log(`[assai-auth] [${hashAlgo}] Login SUCCESS!`);

        return {
          success: true,
          sessionId,
          cookies: allCookies,
          baseUrl: normalizedBaseUrl,
          dbName: resolvedDbName,
          response_time_ms: elapsed,
        };
      }

      return { success: false, error: `Unexpected status: ${loginResp.status}`, response_time_ms: elapsed };
    }

    return { success: false, error: "All hash algorithms exhausted", response_time_ms: Date.now() - start };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error(`[assai-auth] Login error:`, err);
    return { success: false, error: err.message || "Connection failed", response_time_ms: elapsed };
  }
}
