/**
 * Dev-only header click-through self-test.
 *
 * Runs when the current URL contains `?selftest=headers`. Programmatically
 * clicks the three functional-preservation targets on /project/:id and
 * asserts each expected result, logging PASS/FAIL per target with the
 * current build stamp. Also stores a summary on `window.__ORSH_HEADER_SELFTEST__`.
 *
 * Targets:
 *   1. P2A Handover header  -> opens P2A workspace/plan (Radix Dialog).
 *   2. ORA Activities header -> opens ORA Gantt overlay (Radix Dialog/Sheet).
 *   3. Scope "Read more"    -> flips data-scope-expanded to "true" + label
 *                              flips from "Read more" to "Show less".
 *
 * The three targets carry data-testid attributes:
 *   - p2a-header-button
 *   - ora-header-button
 *   - scope-read-more
 *
 * The self-test is idempotent per page load and closes any overlay it opens
 * before moving to the next target so it never leaves the app in a
 * mid-interaction state.
 */

declare const __APP_BUILD__: string;

type Result = { target: string; pass: boolean; detail: string };

const BUILD_ID = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 'dev';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000, stepMs = 50): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await delay(stepMs);
  }
  return predicate();
}

function findDialogs(): Element[] {
  return Array.from(document.querySelectorAll('[role="dialog"]'));
}

function closeAnyOpenDialog() {
  // Press Escape to dismiss whatever overlay was opened by the previous step.
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

const FIND_TIMEOUT_MS = 20000;
const FIND_STEP_MS = 500;

async function findButton(testId: string): Promise<HTMLButtonElement | null> {
  const start = Date.now();
  while (Date.now() - start < FIND_TIMEOUT_MS) {
    const el = document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    if (el) return el;
    await delay(FIND_STEP_MS);
  }
  return document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
}

async function runP2ATest(): Promise<Result> {
  const btn = await findButton('p2a-header-button');
  if (!btn) return { target: 'P2A Handover header', pass: false, detail: `button not found after ${FIND_TIMEOUT_MS}ms (widget may be hidden or page not on /project/:id)` };
  const dialogsBefore = findDialogs().length;
  btn.click();
  const opened = await waitFor(() => findDialogs().length > dialogsBefore, 3000);
  const result: Result = opened
    ? { target: 'P2A Handover header', pass: true, detail: `dialog opened (count ${dialogsBefore} -> ${findDialogs().length})` }
    : { target: 'P2A Handover header', pass: false, detail: 'no new dialog appeared within 3s' };
  closeAnyOpenDialog();
  await delay(250);
  return result;
}

async function runORATest(): Promise<Result> {
  const btn = await findButton('ora-header-button');
  if (!btn) return { target: 'ORA Activities header', pass: false, detail: `button not found after ${FIND_TIMEOUT_MS}ms (project may have no active ORA plan)` };
  const dialogsBefore = findDialogs().length;
  btn.click();
  const opened = await waitFor(() => findDialogs().length > dialogsBefore, 3000);
  const result: Result = opened
    ? { target: 'ORA Activities header', pass: true, detail: `dialog opened (count ${dialogsBefore} -> ${findDialogs().length})` }
    : { target: 'ORA Activities header', pass: false, detail: 'no new dialog appeared within 3s' };
  closeAnyOpenDialog();
  await delay(250);
  return result;
}

async function runScopeReadMoreTest(): Promise<Result> {
  const btn = await findButton('scope-read-more');
  if (!btn) return { target: 'Scope Read more', pass: false, detail: `button not found after ${FIND_TIMEOUT_MS}ms (scope may be short enough not to need it)` };
  const before = btn.getAttribute('data-scope-expanded');
  const beforeLabel = btn.textContent?.trim();
  btn.click();
  const flipped = await waitFor(() => {
    const el = document.querySelector<HTMLButtonElement>('[data-testid="scope-read-more"]');
    return !!el && el.getAttribute('data-scope-expanded') !== before;
  }, 1000);
  const after = document.querySelector<HTMLButtonElement>('[data-testid="scope-read-more"]');
  const afterAttr = after?.getAttribute('data-scope-expanded');
  const afterLabel = after?.textContent?.trim();
  const labelFlipped = beforeLabel !== afterLabel;
  const pass = flipped && labelFlipped;
  if (after) after.click();
  return {
    target: 'Scope Read more',
    pass,
    detail: pass
      ? `expanded ${before}->${afterAttr}, label ${beforeLabel}->${afterLabel}`
      : `no toggle: attr ${before}->${afterAttr}, label ${beforeLabel}->${afterLabel}`,
  };
}

async function waitForProjectRouteReady(): Promise<void> {
  // Wait until we're on /project/:id AND at least one widget card header exists
  // (any of the three testids), or a hard 25s cap.
  const start = Date.now();
  const cap = 25000;
  while (Date.now() - start < cap) {
    const onRoute = /\/project\/[^/]+/.test(window.location.pathname);
    const anyWidget = document.querySelector('[data-testid="p2a-header-button"], [data-testid="ora-header-button"], [data-testid="scope-read-more"]');
    if (onRoute && anyWidget) return;
    await delay(250);
  }
}

export async function runHeaderSelfTest(): Promise<{ build: string; results: Result[]; passed: number; total: number }> {
  // eslint-disable-next-line no-console
  console.info('[orsh:selftest] starting header self-test build=%s at=%s', BUILD_ID, new Date().toISOString());
  await waitForProjectRouteReady();
  // eslint-disable-next-line no-console
  console.info('[orsh:selftest] project route ready, running assertions');
  const results: Result[] = [];
  results.push(await runP2ATest());
  results.push(await runORATest());
  results.push(await runScopeReadMoreTest());
  const passed = results.filter((r) => r.pass).length;
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`[orsh:selftest] ${r.pass ? 'PASS' : 'FAIL'} · ${r.target} · ${r.detail} · build=${BUILD_ID}`);
  }
  // eslint-disable-next-line no-console
  console.log(`[orsh:selftest] SUMMARY ${passed}/${results.length} PASS · build=${BUILD_ID}`);
  const summary = { build: BUILD_ID, results, passed, total: results.length };
  try { (window as any).__ORSH_HEADER_SELFTEST__ = summary; } catch {}
  return summary;
}

/** Called from ProjectDetailsPage when URL carries `?selftest=headers`. */
export function scheduleHeaderSelfTestIfRequested() {
  try {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('selftest') !== 'headers') return;
    if ((window as any).__ORSH_HEADER_SELFTEST_SCHEDULED__) return;
    (window as any).__ORSH_HEADER_SELFTEST_SCHEDULED__ = true;
    // Kick after a short tick; runHeaderSelfTest itself polls up to ~25s for
    // the project route + widgets to hydrate before running assertions.
    window.setTimeout(() => { void runHeaderSelfTest(); }, 300);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[orsh:selftest] scheduling error', err);
  }
}

