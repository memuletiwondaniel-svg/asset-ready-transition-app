/**
 * One-shot destructive client-state reset.
 *
 * Bump APP_RESET_ID to force every device to wipe localStorage,
 * sessionStorage, Cache Storage, service workers, and IndexedDB
 * on the next load. Auth tokens are preserved so users stay signed in.
 */

export const APP_RESET_ID = "2026-05-28-route-shell-hard-reset-v5";
export const APP_RESET_ID = "2026-05-28-route-shell-hard-reset-v6";
export const RESET_KEY = "__orsh_reset_id";
export const SESSION_EPOCH_KEY = "__orsh_session_epoch";
export const TAB_SESSION_EPOCH_KEY = "__orsh_tab_session_epoch";

const PRESERVE_PREFIXES = ["sb-"];
const PRESERVE_KEYS = ["rememberMe", RESET_KEY, SESSION_EPOCH_KEY, TAB_SESSION_EPOCH_KEY];
const REMOVED_ROUTE_PREFIXES = [
  "/users",
  "/user-management",
  "/my-backlog",
  "/manage-checklist",
  "/vcrs",
  "/pssr/approver-dashboard",
  "/pssr-reviews",
  "/pssr/",
  "/p2o",
];

function isRemovedPath(path: string): boolean {
  if (path === "/pssr") return false;
  return REMOVED_ROUTE_PREFIXES.some((prefix) =>
    prefix === "/pssr/"
      ? path.startsWith(prefix) && path.endsWith("/sof")
      : path === prefix || path.startsWith(`${prefix}/`)
  );
}

function sanitizeStoredValue(key: string, value: string): string | null {
  if (!value) return value;

  if ((key.startsWith("orsh-favorite-pages") || key.startsWith("orsh-admin-favorites")) && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((entry) => {
          if (typeof entry === "string") return !isRemovedPath(entry);
          if (entry && typeof entry === "object" && typeof entry.path === "string") {
            return !isRemovedPath(entry.path);
          }
          return true;
        });
        return JSON.stringify(cleaned);
      }
    } catch {
      return value;
    }
  }

  if ((key.toLowerCase().includes("route") || key.toLowerCase().includes("path") || key.toLowerCase().includes("redirect")) && typeof value === "string") {
    return isRemovedPath(value) ? "/home" : value;
  }

  return value;
}

function nextSessionEpoch(): string {
  return `${Date.now()}`;
}

export function bumpSessionEpoch() {
  try {
    const nextEpoch = nextSessionEpoch();
    localStorage.setItem(SESSION_EPOCH_KEY, nextEpoch);
    sessionStorage.setItem(TAB_SESSION_EPOCH_KEY, nextEpoch);
    return nextEpoch;
  } catch {
    return null;
  }
}

export function syncTabSessionEpoch() {
  try {
    const epoch = localStorage.getItem(SESSION_EPOCH_KEY) || nextSessionEpoch();
    localStorage.setItem(SESSION_EPOCH_KEY, epoch);
    sessionStorage.setItem(TAB_SESSION_EPOCH_KEY, epoch);
    return epoch;
  } catch {
    return null;
  }
}

export function hasSessionEpochMismatch() {
  try {
    const globalEpoch = localStorage.getItem(SESSION_EPOCH_KEY);
    const tabEpoch = sessionStorage.getItem(TAB_SESSION_EPOCH_KEY);
    if (!globalEpoch) return false;
    return !!tabEpoch && tabEpoch !== globalEpoch;
  } catch {
    return false;
  }
}

function shouldPreserve(key: string): boolean {
  if (PRESERVE_KEYS.includes(key)) return true;
  return PRESERVE_PREFIXES.some((p) => key.startsWith(p));
}

async function wipeCaches() {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
}

async function wipeServiceWorkers() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
}

async function wipeIndexedDB() {
  try {
    const anyIdb = indexedDB as any;
    if (typeof anyIdb?.databases === "function") {
      const dbs: Array<{ name?: string }> = await anyIdb.databases();
      await Promise.all(
        dbs
          .map((d) => d?.name)
          .filter((n): n is string => !!n)
          .map(
            (name) =>
              new Promise<void>((resolve) => {
                try {
                  const req = indexedDB.deleteDatabase(name);
                  req.onsuccess = () => resolve();
                  req.onerror = () => resolve();
                  req.onblocked = () => resolve();
                } catch {
                  resolve();
                }
              })
          )
      );
    }
  } catch {
    /* ignore */
  }
}

function wipeStorage(storage: Storage) {
  try {
    const preserved: Record<string, string> = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && shouldPreserve(key)) {
        const val = storage.getItem(key);
        if (val !== null) {
          const sanitized = sanitizeStoredValue(key, val);
          if (sanitized !== null) preserved[key] = sanitized;
        }
      }
    }
    storage.clear();
    for (const [k, v] of Object.entries(preserved)) {
      storage.setItem(k, v);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Performs the full reset and hard-reloads. Use this for both the
 * boot-time reset-id mismatch and the runtime version-change path.
 */
export async function performHardReset(nextResetId: string = APP_RESET_ID) {
  wipeStorage(localStorage);
  wipeStorage(sessionStorage);
  await Promise.all([wipeCaches(), wipeServiceWorkers(), wipeIndexedDB()]);
  try {
    const nextEpoch = nextSessionEpoch();
    localStorage.setItem(RESET_KEY, nextResetId);
    localStorage.setItem(SESSION_EPOCH_KEY, nextEpoch);
    sessionStorage.setItem(TAB_SESSION_EPOCH_KEY, nextEpoch);
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(Date.now()));
  window.location.replace(url.toString());
}

/**
 * If this device hasn't yet processed APP_RESET_ID, wipe and reload.
 * Returns true if a reload was triggered (caller should NOT continue booting).
 */
export function runResetIfNeeded(): boolean {
  try {
    const stored = localStorage.getItem(RESET_KEY);
    if (stored === APP_RESET_ID) return false;
  } catch {
    return false;
  }
  // Fire and forget — we replace() inside performHardReset.
  void performHardReset(APP_RESET_ID);
  return true;
}
