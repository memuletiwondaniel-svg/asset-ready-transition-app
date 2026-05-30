/**
 * Controls the pre-React boot overlay declared in index.html.
 *
 * The overlay is visible by default so the user never sees a stale or
 * empty UI before the latest bundle has actually mounted. We hide it
 * once React commits, and re-show it when a hard reload is in flight.
 */

const OVERLAY_ID = "app-boot-overlay";
const LABEL_ID = "app-boot-label";

export function hideBootOverlay() {
  if (typeof document === "undefined") return;
  const el = document.getElementById(OVERLAY_ID);
  if (!el) return;
  el.classList.add("is-hiding");
  window.setTimeout(() => {
    el.parentNode?.removeChild(el);
  }, 300);
}

export function showBootOverlay(message?: string) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(OVERLAY_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML =
      '<div class="spinner"></div><div class="label" id="' +
      LABEL_ID +
      '">Loading latest version…</div>';
    document.body.appendChild(el);
  }
  el.classList.remove("is-hiding");
  if (message) {
    const label = document.getElementById(LABEL_ID);
    if (label) label.textContent = message;
  }
}
