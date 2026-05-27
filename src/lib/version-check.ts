/**
 * Polls the current origin's index.html for `<meta name="app-build">` and
 * compares it against the build id baked into this bundle. On mismatch a
 * new version is live — delegate to the shared hard-reset path so behavior
 * stays identical to the boot-time reset.
 */

import { performHardReset, APP_RESET_ID } from "./app-reset";

declare const __APP_BUILD__: string;

const CURRENT_BUILD: string = typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "";
const POLL_INTERVAL_MS = 60_000;

let started = false;
let inFlight = false;
let reloading = false;

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

async function checkOnce() {
  if (inFlight || reloading || !CURRENT_BUILD) return;
  inFlight = true;
  try {
    const remote = await fetchRemoteBuild();
    if (!remote || remote === "__APP_BUILD__") return; // dev / unreplaced
    if (remote !== CURRENT_BUILD) {
      reloading = true;
      // Use a build-derived reset id so each new deploy re-wipes once.
      await performHardReset(`${APP_RESET_ID}|build:${remote}`);
    }
  } finally {
    inFlight = false;
  }
}

export function startVersionCheck() {
  if (started) return;
  started = true;

  void checkOnce();
  window.setInterval(checkOnce, POLL_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkOnce();
  });

  window.addEventListener("online", () => void checkOnce());
}
