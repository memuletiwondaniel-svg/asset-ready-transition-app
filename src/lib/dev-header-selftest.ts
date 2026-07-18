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

async function runP2ATest(): Promise<Result> {
  const btn = document.querySelector<HTMLButtonElement>('[data-testid="p2a-header-button"]');
  if (!btn) return { target: 'P2A Handover header', pass: false, detail: 'button not found (widget may be hidden or page not on /project/:id)' };
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
  const btn = document.querySelector<HTMLButtonElement>('[data-testid="ora-header-button"]');
  if (!btn) return { target: 'ORA Activities header', pass: false, detail: 'button not found (project may have no active ORA plan)' };
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
  const btn = document.querySelector<HTMLButtonElement>('[data-testid="scope-read-more"]');
  if (!btn) return { target: 'Scope Read more', pass: false, detail: 'button not found (scope may be short enough not to need it)' };
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
  // Toggle back so the page state is unchanged after the test.
  if (after) after.click();
  return {
    target: 'Scope Read more',
    pass,
    detail: pass
      ? `expanded ${before}->${afterAttr}, label ${beforeLabel}->${afterLabel}`
      : `no toggle: attr ${before}->${afterAttr}, label ${beforeLabel}->${afterLabel}`,
  };
}

export async function runHeaderSelfTest(): Promise<{ build: string; results: Result[]; passed: number; total: number }> {
  // eslint-disable-next-line no-console
  console.info('[orsh:selftest] starting header self-test build=%s at=%s', BUILD_ID, new Date().toISOString());
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
    // Wait 1.2s for widgets to render and data queries to settle before firing.
    window.setTimeout(() => { void runHeaderSelfTest(); }, 1200);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[orsh:selftest] scheduling error', err);
  }
}
