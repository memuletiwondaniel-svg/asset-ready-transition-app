/**
 * Shared Assai Cloud authentication logic.
 * Derives API base URL from a stored Platform URL and attempts
 * multiple authentication endpoints in sequence.
 */

export interface AuthAttempt {
  endpoint: string;
  status: number;
  body: string;
}

export interface AuthResult {
  success: boolean;
  token: string | null;
  baseUrl: string;
  endpointUsed: string | null;
  attempts: AuthAttempt[];
  responseTimeMs: number;
}

/**
 * Derive the API base URL from a stored Platform/Base URL.
 * Example inputs:
 *   https://eu.assaicloud.com/AWeu578/login.aweb  → https://eu.assaicloud.com/AWeu578
 *   https://eu.assaicloud.com/AWeu578/             → https://eu.assaicloud.com/AWeu578
 *   https://eu.assaicloud.com/AWeu578              → https://eu.assaicloud.com/AWeu578
 */
export function deriveBaseUrl(rawUrl: string): string {
  let url = rawUrl.trim().replace(/\/$/, "");

  // Strip known path suffixes
  const suffixes = ["/login.aweb", "/login", "/index.html", "/home"];
  for (const suffix of suffixes) {
    if (url.toLowerCase().endsWith(suffix)) {
      url = url.slice(0, -suffix.length);
      break;
    }
  }

  return url.replace(/\/$/, "");
}

/**
 * Attempt authentication against Assai Cloud using multiple endpoints.
 */
export async function authenticateAssai(
  baseUrl: string,
  username: string,
  password: string
): Promise<AuthResult> {
  const attempts: AuthAttempt[] = [];
  const startTime = Date.now();

  // Attempt 1: POST /api/authenticate (JSON)
  {
    const endpoint = `${baseUrl}/api/authenticate`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.text();
      attempts.push({ endpoint, status: res.status, body: body.substring(0, 500) });

      if (res.ok) {
        const token = extractToken(body);
        if (token) {
          return {
            success: true,
            token,
            baseUrl,
            endpointUsed: endpoint,
            attempts,
            responseTimeMs: Date.now() - startTime,
          };
        }
      }
    } catch (err) {
      attempts.push({
        endpoint,
        status: 0,
        body: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  // Attempt 2: POST /api/auth/login (JSON)
  {
    const endpoint = `${baseUrl}/api/auth/login`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.text();
      attempts.push({ endpoint, status: res.status, body: body.substring(0, 500) });

      if (res.ok) {
        const token = extractToken(body);
        if (token) {
          return {
            success: true,
            token,
            baseUrl,
            endpointUsed: endpoint,
            attempts,
            responseTimeMs: Date.now() - startTime,
          };
        }
      }
    } catch (err) {
      attempts.push({
        endpoint,
        status: 0,
        body: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  // Attempt 3: POST /login (form-urlencoded)
  {
    const endpoint = `${baseUrl}/login`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      });
      const body = await res.text();
      attempts.push({ endpoint, status: res.status, body: body.substring(0, 500) });

      if (res.ok) {
        const token = extractToken(body);
        if (token) {
          return {
            success: true,
            token,
            baseUrl,
            endpointUsed: endpoint,
            attempts,
            responseTimeMs: Date.now() - startTime,
          };
        }
      }
    } catch (err) {
      attempts.push({
        endpoint,
        status: 0,
        body: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  return {
    success: false,
    token: null,
    baseUrl,
    endpointUsed: null,
    attempts,
    responseTimeMs: Date.now() - startTime,
  };
}

function extractToken(responseBody: string): string | null {
  try {
    const data = JSON.parse(responseBody);
    return data.token || data.access_token || data.sessionId || data.Token || data.AccessToken || null;
  } catch {
    // Check if the response itself looks like a token (JWT)
    if (responseBody.startsWith("eyJ")) {
      return responseBody.trim();
    }
    return null;
  }
}
