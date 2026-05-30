/**
 * Runtime environment detection for the stale-bundle / self-reload machinery.
 *
 * We must reliably distinguish the Lovable editor live preview (Vite dev
 * server, embedded in an iframe) from the published production build.
 *
 * Primary signal: `import.meta.env.DEV`.
 *   - Editor live preview runs `vite dev` → DEV === true
 *   - Published app is a Vite production build → DEV === false
 *
 * We deliberately do NOT match the bare `*.lovableproject.com` /
 * `*.lovable.app` suffix: those are also the production hosts for projects
 * without a custom domain, and matching them would silently disable the
 * stale-bundle protections in production.
 */

export function shouldSkipSelfReload(): boolean {
  if (import.meta.env.DEV) return true;

  // Belt-and-suspenders for the editor iframe ONLY.
  try {
    if (window.location.hostname.startsWith('id-preview--')) return true;
    if (window.self !== window.top) return true; // embedded in the editor iframe
  } catch {
    /* cross-origin frame access can throw; ignore */
  }
  return false;
}

// One-time boot log so we can verify the predicate in both environments.
try {
  if (typeof window !== 'undefined' && !(window as any).__orshEnvLogged) {
    (window as any).__orshEnvLogged = true;
    // eslint-disable-next-line no-console
    console.info(
      '[orsh:env]',
      JSON.stringify({
        dev: import.meta.env.DEV,
        hostname: window.location.hostname,
        embedded: (() => {
          try { return window.self !== window.top; } catch { return 'cross-origin'; }
        })(),
        skipSelfReload: shouldSkipSelfReload(),
      }),
    );
  }
} catch {
  /* ignore */
}
