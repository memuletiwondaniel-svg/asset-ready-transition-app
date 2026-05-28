/**
 * Stale-bundle hardening for ORSH.
 *
 * Two layers:
 *  1. Build-id polling against `<meta name="app-build">` in the current
 *     index.html. On mismatch we delegate to the shared hard-reset path.
 *  2. Idle-aware visibility reload. If the tab has been hidden for longer
 *     than IDLE_RELOAD_MS, force a fresh fetch of index.html on resume so
 *     a wake-from-idle tab never renders against the old in-memory bundle.
 *
 * Exposed `checkOnce` so AuthProvider can revalidate on SIGNED_IN — if the
 * user logs back in after their session timed out, that moment becomes the
 * trigger that swaps to the new bundle.
 */

import { performHardReset, APP_RESET_ID } from "./app-reset";

declare const __APP_BUILD__: string;

const CURRENT_BUILD: string = typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "";
const POLL_INTERVAL_MS = 60_000;
const IDLE_RELOAD_MS = 10 * 60_000; // 10 minutes hidden ⇒ force reload on resume

let started = false;
let inFlight = false;
let reloading = false;
let lastHiddenAt: number | null = null;

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

export async function checkOnce() {
  if (inFlight || reloading || !CURRENT_BUILD) return;
  inFlight = true;
  try {
    const remote = await fetchRemoteBuild();
    if (!remote || remote === "__APP_BUILD__") return; // dev / unreplaced
    if (remote !== CURRENT_BUILD) {
      reloading = true;
      await performHardReset(`${APP_RESET_ID}|build:${remote}`);
    }
  } finally {
    inFlight = false;
  }
}

function forceFreshReload() {
  if (reloading) return;
  reloading = true;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_r", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

export function startVersionCheck() {
  if (started) return;
  started = true;

  void checkOnce();
  window.setInterval(checkOnce, POLL_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      lastHiddenAt = Date.now();
      return;
    }
    // visible
    const hiddenFor = lastHiddenAt ? Date.now() - lastHiddenAt : 0;
    lastHiddenAt = null;
    if (hiddenFor >= IDLE_RELOAD_MS) {
      // Tab woke from long idle — never trust the in-memory bundle.
      forceFreshReload();
      return;
    }
    void checkOnce();
  });

  window.addEventListener("online", () => void checkOnce());
}
