/**
 * Runtime cache-busting: polls the current origin's index.html for the
 * `<meta name="app-build">` tag and compares it against the build ID baked
 * into this bundle. When they differ, a new version has been deployed —
 * clear caches/service workers and hard-reload so the user picks it up.
 *
 * Hashed assets under /assets are safe to long-cache (Vite hashes file
 * names), so we only need to invalidate the HTML shell + any SW caches.
 */

declare const __APP_BUILD__: string;

const CURRENT_BUILD: string = typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "";
const POLL_INTERVAL_MS = 60_000; // 1 minute
const RELOAD_FLAG = "__orsh_version_reloaded";

let started = false;
let inFlight = false;

async function fetchRemoteBuild(): Promise<string | null> {
  try {
    const res = await fetch(`/?_v=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta\s+name=["']app-build["']\s+content=["']([^"']+)["']/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function hardReload() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
  // Cache-busting query param defeats any intermediary cache.
  const url = new URL(window.location.href);
  url.searchParams.set("_v", String(Date.now()));
  window.location.replace(url.toString());
}

async function checkOnce() {
  if (inFlight || !CURRENT_BUILD) return;
  inFlight = true;
  try {
    const remote = await fetchRemoteBuild();
    if (!remote || remote === "__APP_BUILD__") return; // dev fallback / unreplaced
    if (remote !== CURRENT_BUILD && sessionStorage.getItem(RELOAD_FLAG) !== remote) {
      sessionStorage.setItem(RELOAD_FLAG, remote);
      await hardReload();
    }
  } finally {
    inFlight = false;
  }
}

export function startVersionCheck() {
  if (started) return;
  started = true;

  // Check immediately, then on a timer.
  void checkOnce();
  window.setInterval(checkOnce, POLL_INTERVAL_MS);

  // Re-check when the tab becomes visible (typical "I came back later" case).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkOnce();
  });

  // Re-check when network comes back online.
  window.addEventListener("online", () => void checkOnce());
}
