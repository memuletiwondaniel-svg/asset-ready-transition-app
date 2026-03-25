// Shared Assai authentication helper

export interface AssaiLoginResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  response_time_ms?: number;
}

/**
 * Login to Assai Cloud using form-based authentication.
 * Returns a session result with timing info.
 */
export async function loginAssai(
  baseUrl: string,
  username: string,
  password: string,
  dbName: string,
): Promise<AssaiLoginResult> {
  const loginUrl = `${baseUrl}/AW${dbName}/login.aweb`;
  console.log(`[assai-auth] Attempting login to ${loginUrl} as ${username}`);
  console.log(`[assai-auth] password_length=${password.length}`);

  const start = Date.now();

  try {
    const formBody = new URLSearchParams({
      loginMethod: 'unpw',
      isSecure: 'true',
      username,
      password,
    });

    const resp = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
      redirect: 'manual',
    });

    const elapsed = Date.now() - start;
    const body = await resp.text();

    console.log(`[assai-auth] Response status=${resp.status}, body_length=${body.length}, elapsed=${elapsed}ms`);

    // Check for explicit credential error indicators only
    const lowerBody = body.toLowerCase();
    const hasCredentialError =
      lowerBody.includes('incorrect username or password') ||
      lowerBody.includes('invalid username or password');

    if (hasCredentialError) {
      return { success: false, error: 'Incorrect username or password', response_time_ms: elapsed };
    }

    // A redirect (302) or successful page load means login worked
    if (resp.status === 302 || resp.status === 200) {
      // Extract session cookie if present
      const setCookie = resp.headers.get('set-cookie') || '';
      const sessionMatch = setCookie.match(/JSESSIONID=([^;]+)/);
      return {
        success: true,
        sessionId: sessionMatch?.[1] || 'unknown',
        response_time_ms: elapsed,
      };
    }

    return { success: false, error: `Unexpected status: ${resp.status}`, response_time_ms: elapsed };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error(`[assai-auth] Login error:`, err);
    return { success: false, error: err.message || 'Connection failed', response_time_ms: elapsed };
  }
}
