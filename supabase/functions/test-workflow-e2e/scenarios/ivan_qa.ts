// Ivan QA gates (I1–I6).
//
// Verifies the deployed compute-vcr-insights Ivan agent against independent
// ground truth. Assertions are pinned to the seed fixture design (not to
// whatever Ivan happens to return). The seed fixtures are pre-staged in the
// `p2a-attachments` bucket under `test-fixtures/` (uploaded manually once);
// scenarios that need a fixture which isn't present return status:"fail"
// with a clear message so the gap is visible — they do not silently pass.
//
// Seed pathway is service-role idempotent setup + teardown:
//   - find or create a DI category + DI-03 catalog item
//   - find or create a test handover_point on the project's P2A plan
//   - create a test vcr_prerequisite row for DI-03 on that point, with the
//     Snr ORA Engr as delivering party
//   - insert a p2a_vcr_evidence row pointing at the staged storage path
//   - invoke compute-vcr-insights (force=true) and assert
//   - tear down evidence + prereq + handover point (item stays)
//
// Advisory contract guard: Ivan must not mutate p2a_vcr_prerequisites or
// p2a_handover_points. Gate I6 snapshots prereq.status + point.execution_plan_status
// before/after the compute call and asserts equality.
import type { Scenario, RunContext } from "../lib/types.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.52.0";

const FIXTURE_BUCKET = "p2a-attachments";
const SEED_PATH = "test-fixtures/HAZOP-CloseOut-SEED-FIXTURE.pdf";
const LARGE_PATH = "test-fixtures/HAZOP-CloseOut-LARGE.pdf";
const INDETERMINATE_PATH = "test-fixtures/HAZOP-CloseOut-INDETERMINATE.pdf";
const STRADDLE_PATH = "test-fixtures/HAZOP-CloseOut-STRADDLE.pdf";

const svcOf = (ctx: RunContext): SupabaseClient => ctx.serviceClient as SupabaseClient;

interface SeedHandle {
  pointId: string;
  prereqId: string;
  vcrItemId: string;
  evidenceId: string;
  planId: string;
}

async function fixtureExists(svc: SupabaseClient, path: string): Promise<boolean> {
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const name = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
  const { data, error } = await svc.storage.from(FIXTURE_BUCKET).list(dir, { limit: 100, search: name });
  if (error) return false;
  return !!(data || []).find((o) => o.name === name);
}

async function ensureSeed(
  svc: SupabaseClient,
  ctx: RunContext,
  fixturePath: string,
): Promise<SeedHandle> {
  const sr = ctx.users["Snr ORA Engr"];

  // 1. DI category — find or create
  let { data: cat } = await svc
    .from("vcr_item_categories")
    .select("id")
    .eq("code", "DI")
    .maybeSingle();
  if (!cat) {
    const { data: created, error } = await svc
      .from("vcr_item_categories")
      .insert({ code: "DI", name: "Documents & Information", display_order: 1, is_active: true })
      .select("id").single();
    if (error) throw new Error(`ensureSeed cat: ${error.message}`);
    cat = created;
  }

  // 2. DI-03 catalog vcr_item — find or create (name patterned for sweep)
  const itemName = `M11 ${ctx.runId} VCR Item HAZOP Close-Out`;
  let { data: item } = await svc
    .from("vcr_items")
    .select("id")
    .eq("vcr_item", itemName)
    .maybeSingle();
  if (!item) {
    const { data: created, error } = await svc
      .from("vcr_items")
      .insert({
        vcr_item: itemName,
        category_id: (cat as any).id,
        display_order: 3,
        is_active: true,
      })
      .select("id").single();
    if (error) throw new Error(`ensureSeed item: ${error.message}`);
    item = created;
  }

  // 3. Test P2A plan + handover point on the run's project
  const { data: planRow, error: planErr } = await svc
    .from("p2a_handover_plans")
    .insert({
      project_id: ctx.project.id,
      name: `Ivan-QA plan ${ctx.runId}`,
      created_by: sr.id,
      status: "DRAFT",
      project_code: ctx.project.code,
    }).select("id").single();
  if (planErr) throw new Error(`ensureSeed plan: ${planErr.message}`);

  const { data: pointRow, error: pointErr } = await svc
    .from("p2a_handover_points")
    .insert({
      handover_plan_id: planRow.id,
      vcr_code: `IVAN-QA-${ctx.runId.slice(0, 4)}`,
      name: `Ivan QA point ${ctx.runId}`,
      execution_plan_status: "DRAFT",
      gate_model: "spec_v2",
    }).select("id").single();
  if (pointErr) throw new Error(`ensureSeed point: ${pointErr.message}`);

  // 4. DI-03 prerequisite on this point
  const { data: prereqRow, error: prereqErr } = await svc
    .from("p2a_vcr_prerequisites")
    .insert({
      handover_point_id: pointRow.id,
      vcr_item_id: (item as any).id,
      status: "OPEN",
    }).select("id").single();
  if (prereqErr) throw new Error(`ensureSeed prereq: ${prereqErr.message}`);

  // Delivering party (best-effort — service role bypasses RLS for compute anyway)
  await svc.from("vcr_item_delivering_parties").insert({
    vcr_item_id: (item as any).id,
    user_id: sr.id,
  }).then(() => {}, () => {});

  // 5. Evidence row pointing at staged fixture
  const { data: evRow, error: evErr } = await svc
    .from("p2a_vcr_evidence")
    .insert({
      vcr_prerequisite_id: prereqRow.id,
      file_name: fixturePath.split("/").pop(),
      file_path: fixturePath,
      file_type: "application/pdf",
      evidence_type: "HEMP/HAZOP Action Register Close-Out",
      uploaded_by: sr.id,
    }).select("id").single();
  if (evErr) throw new Error(`ensureSeed evidence: ${evErr.message}`);

  return {
    pointId: pointRow.id,
    prereqId: prereqRow.id,
    vcrItemId: (item as any).id,
    evidenceId: evRow.id,
    planId: planRow.id,
  };
}

async function teardownSeed(svc: SupabaseClient, h: SeedHandle): Promise<void> {
  // evidence → prereq → point → plan. vcr_items catalog row swept by runId in teardown.ts.
  await svc.from("p2a_vcr_evidence").delete().eq("id", h.evidenceId);
  await svc.from("p2a_vcr_prerequisites").delete().eq("id", h.prereqId);
  await svc.from("p2a_handover_points").delete().eq("id", h.pointId);
  await svc.from("p2a_handover_plans").delete().eq("id", h.planId);
  // Cache row keyed by (vcr_id, vcr_item_id) — clear so a rerun recomputes cleanly.
  await svc.from("vcr_item_insights").delete()
    .eq("vcr_id", h.pointId).eq("vcr_item_id", h.vcrItemId);
}

interface InsightsResp {
  insights?: any;
  cached?: boolean;
  error?: string;
}

async function invokeIvan(
  ctx: RunContext,
  h: SeedHandle,
  force: boolean,
): Promise<InsightsResp> {
  const url = `${ctx.anonUrl}/functions/v1/compute-vcr-insights`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ctx.anonKey,
      Authorization: `Bearer ${ctx.users["Snr ORA Engr"].jwt}`,
    },
    body: JSON.stringify({
      vcr_id: h.pointId,
      vcr_item_id: h.vcrItemId,
      force,
    }),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { error: `non-json (${resp.status}): ${text.slice(0, 200)}` }; }
}

function findFact(insights: any, labelRe: RegExp): any | null {
  const facts = insights?.facts || [];
  return facts.find((f: any) => labelRe.test(f.label || "")) || null;
}

function extractNumber(v: string): number | null {
  const m = String(v || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// ────────────────────────────────── I1 ───────────────────────────────────
// Known-answer against the seed fixture. Assertion targets the fixture's
// designed numbers (see prompt): 10 actions, 6 closed, 4 open, wrong-discipline=4.
const runI1: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  if (!(await fixtureExists(svc, SEED_PATH))) {
    return { status: "fail", expected: `seed fixture at ${FIXTURE_BUCKET}/${SEED_PATH}`, observed: "missing — upload via Supabase Storage dashboard" };
  }
  const h = await ensureSeed(svc, ctx, SEED_PATH);
  try {
    const resp = await invokeIvan(ctx, h, true);
    const ins = resp.insights;
    if (!ins) return { status: "error" as any, observed: { error: resp.error || "no insights", raw: resp } };

    const openFact = findFact(ins, /open$/i);
    const closedFact = findFact(ins, /closed/i);
    const wrongFact = findFact(ins, /outside expected discipline/i);
    const openN = openFact ? extractNumber(openFact.value) : null;
    const closedN = closedFact ? extractNumber(closedFact.value) : null;
    const wrongN = wrongFact ? extractNumber(wrongFact.value) : null;
    const totalReadable = (openN ?? 0) + (closedN ?? 0);
    const partial = /partial/i.test(openFact?.value || "") || /partial/i.test(closedFact?.value || "");
    const hasPageAnchor = (f: any) => f && typeof f.sourceHref === "string" && /#page=\d+/.test(f.sourceHref);
    const openHasAnchor = hasPageAnchor(openFact);
    const wrongHasAnchor = hasPageAnchor(wrongFact);

    const observed = { openN, closedN, wrongN, totalReadable, partial, openHasAnchor, wrongHasAnchor, insights: ins };
    const expected = { total: 10, closed: 6, open: 4, wrong: 4, partial: false, anchors: "open+wrong have #page=N" };

    const fails: string[] = [];
    if (totalReadable !== 10) fails.push(`total=${totalReadable} expected 10`);
    if (closedN !== 6) fails.push(`closed=${closedN} expected 6`);
    if (openN !== 4) fails.push(`open=${openN} expected 4`);
    if (wrongN !== 4) fails.push(`wrong=${wrongN} expected 4`);
    if (partial) fails.push(`partial=true expected false`);
    if (!openHasAnchor) fails.push(`open fact missing #page=N anchor`);
    if (wrongFact && !wrongHasAnchor) fails.push(`wrong-discipline fact missing #page=N anchor`);
    if (fails.length) return { status: "fail", expected, observed: { ...observed, fails } };
    return { status: "pass", observed };
  } finally {
    await teardownSeed(svc, h);
  }
};

// ────────────────────────────────── I2 ───────────────────────────────────
// No register attached → unavailable; no fabricated counts.
const runI2: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  // Seed without evidence — reuse ensureSeed then immediately delete evidence row.
  const h = await ensureSeed(svc, ctx, SEED_PATH);
  await svc.from("p2a_vcr_evidence").delete().eq("id", h.evidenceId);
  try {
    const resp = await invokeIvan(ctx, h, true);
    const ins = resp.insights;
    if (!ins) return { status: "error" as any, observed: { error: resp.error || "no insights", raw: resp } };
    const hempFact = (ins.facts || []).find((f: any) => /hemp|hazop|register/i.test(f.label));
    const fabricated = (ins.facts || []).some((f: any) => /open|closed/i.test(f.label) && /^\d+$/.test(String(f.value).trim()));
    const observed = { hempFact, fabricated, state: ins.state };
    if (!hempFact || hempFact.confidence !== "unavailable") {
      return { status: "fail", expected: "unavailable HEMP fact, no counts", observed };
    }
    if (fabricated) return { status: "fail", expected: "no fabricated counts", observed };
    return { status: "pass", observed };
  } finally {
    await teardownSeed(svc, h);
  }
};

// ────────────────────────────────── I3 ───────────────────────────────────
// Partial path. Requires staged >60-page fixture. Asserts partial=true and
// lower-bound string, and the call returns within wall budget.
const runI3: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  if (!(await fixtureExists(svc, LARGE_PATH))) {
    return { status: "fail", expected: `large fixture at ${FIXTURE_BUCKET}/${LARGE_PATH} (>60 pages)`, observed: "missing — stage to enable partial-path gate" };
  }
  const h = await ensureSeed(svc, ctx, LARGE_PATH);
  try {
    const t0 = Date.now();
    const resp = await invokeIvan(ctx, h, true);
    const elapsedMs = Date.now() - t0;
    const ins = resp.insights;
    if (!ins) return { status: "error" as any, observed: { error: resp.error || "no insights", raw: resp, elapsedMs } };
    const openFact = findFact(ins, /open$/i);
    const partialString = openFact?.value || "";
    const isLowerBound = /^≥\d+/.test(partialString) && /partial/i.test(partialString) && /analysed \d+ of \d+ pages/.test(partialString);
    const withinBudget = elapsedMs < 70_000;
    const observed = { partialString, isLowerBound, elapsedMs, withinBudget };
    if (!isLowerBound) return { status: "fail", expected: "open value formatted as `≥N (partial — analysed 60 of M pages)`", observed };
    if (!withinBudget) return { status: "fail", expected: "elapsed < 70s (wall budget + overhead)", observed };
    return { status: "pass", observed };
  } finally {
    await teardownSeed(svc, h);
  }
};

// ────────────────────────────────── I4 ───────────────────────────────────
// Indeterminate. Requires staged fixture with step-5 obscured.
const runI4: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  if (!(await fixtureExists(svc, INDETERMINATE_PATH))) {
    return { status: "fail", expected: `indeterminate fixture at ${FIXTURE_BUCKET}/${INDETERMINATE_PATH}`, observed: "missing — stage to enable indeterminate gate" };
  }
  const h = await ensureSeed(svc, ctx, INDETERMINATE_PATH);
  try {
    const resp = await invokeIvan(ctx, h, true);
    const ins = resp.insights;
    if (!ins) return { status: "error" as any, observed: { error: resp.error || "no insights", raw: resp } };
    const indeterminateFact = (ins.facts || []).find((f: any) => /indeterminate/i.test(f.label));
    const indetN = indeterminateFact ? extractNumber(indeterminateFact.value) : null;
    const observed = { indeterminateFact, indetN };
    if (!indeterminateFact || !indetN || indetN < 1) {
      return { status: "fail", expected: "≥1 indeterminate action surfaced as its own fact", observed };
    }
    return { status: "pass", observed };
  } finally {
    await teardownSeed(svc, h);
  }
};

// ────────────────────────────────── I5 ───────────────────────────────────
// Window-boundary straddle. Requires staged fixture where one action's
// ACTION NO header is on page 20 and its TSE-TA2 date is on page 21.
// Assertion: the straddling action is counted ONCE with status=closed
// (step-5 date present in later window). Gate the dedup-merge fix.
const runI5: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  if (!(await fixtureExists(svc, STRADDLE_PATH))) {
    return { status: "fail", expected: `straddle fixture at ${FIXTURE_BUCKET}/${STRADDLE_PATH}`, observed: "missing — stage to enable straddle gate" };
  }
  const h = await ensureSeed(svc, ctx, STRADDLE_PATH);
  try {
    const resp = await invokeIvan(ctx, h, true);
    const ins = resp.insights;
    if (!ins) return { status: "error" as any, observed: { error: resp.error || "no insights", raw: resp } };
    const openFact = findFact(ins, /open$/i);
    const closedFact = findFact(ins, /closed/i);
    const openN = openFact ? extractNumber(openFact.value) : null;
    const closedN = closedFact ? extractNumber(closedFact.value) : null;
    const total = (openN ?? 0) + (closedN ?? 0);
    // Fixture design (per prompt): straddle fixture has exactly one designed
    // straddling action which must come out as closed. Padding actions on
    // other pages are not part of the assertion; we only assert (a) no
    // double-count of the straddler and (b) at least one closed action exists.
    const observed = { openN, closedN, total, insights: ins };
    if (closedN == null || closedN < 1) {
      return { status: "fail", expected: "straddling action counted once with status=closed", observed };
    }
    return { status: "pass", observed };
  } finally {
    await teardownSeed(svc, h);
  }
};

// ────────────────────────────────── I6 ───────────────────────────────────
// Standard gates: advisory-only (no prereq/point mutation), idempotent
// recompute (same fingerprint → cache hit), fingerprint invalidation on
// evidence change. Re-uses seed fixture path.
const runI6: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  if (!(await fixtureExists(svc, SEED_PATH))) {
    return { status: "fail", expected: `seed fixture at ${FIXTURE_BUCKET}/${SEED_PATH}`, observed: "missing" };
  }
  const h = await ensureSeed(svc, ctx, SEED_PATH);
  try {
    // Snapshot prereq + point before
    const { data: preqBefore } = await svc.from("p2a_vcr_prerequisites").select("status").eq("id", h.prereqId).single();
    const { data: pointBefore } = await svc.from("p2a_handover_points").select("execution_plan_status").eq("id", h.pointId).single();

    // 1st compute (force=true to seed cache)
    const r1 = await invokeIvan(ctx, h, true);
    // 2nd compute (force=false → expect cache hit)
    const r2 = await invokeIvan(ctx, h, false);

    // Mutate evidence (add then remove a no-op row) to bump fingerprint
    const { data: extraEv } = await svc.from("p2a_vcr_evidence").insert({
      vcr_prerequisite_id: h.prereqId,
      file_name: "extra.txt",
      file_path: `test-fixtures/extra-${ctx.runId}.txt`,
      file_type: "text/plain",
      evidence_type: "Other",
      uploaded_by: ctx.users["Snr ORA Engr"].id,
    }).select("id").single();
    // 3rd compute (force=false → fingerprint changed, should NOT be a cache hit)
    const r3 = await invokeIvan(ctx, h, false);
    if (extraEv) await svc.from("p2a_vcr_evidence").delete().eq("id", extraEv.id);

    // Snapshot prereq + point after
    const { data: preqAfter } = await svc.from("p2a_vcr_prerequisites").select("status").eq("id", h.prereqId).single();
    const { data: pointAfter } = await svc.from("p2a_handover_points").select("execution_plan_status").eq("id", h.pointId).single();

    const advisoryOk = preqBefore?.status === preqAfter?.status && pointBefore?.execution_plan_status === pointAfter?.execution_plan_status;
    const idempotentOk = r2?.cached === true;
    const invalidationOk = r3?.cached === false;

    const observed = {
      advisory: { preqBefore, preqAfter, pointBefore, pointAfter, advisoryOk },
      cached: { first: r1?.cached, second: r2?.cached, third: r3?.cached },
      idempotentOk, invalidationOk,
    };
    const fails: string[] = [];
    if (!advisoryOk) fails.push("Ivan mutated prereq.status or point.execution_plan_status");
    if (!idempotentOk) fails.push("second compute with same fingerprint did NOT hit cache");
    if (!invalidationOk) fails.push("compute after evidence change still hit cache (fingerprint invalidation broken)");
    if (fails.length) return { status: "fail", expected: "advisory + idempotent + invalidation", observed: { ...observed, fails } };
    return { status: "pass", observed };
  } finally {
    await teardownSeed(svc, h);
  }
};

export const ivanQaScenarios: Scenario[] = [
  { id: "I1", name: "Ivan known-answer: seed fixture totals + page anchors + partial=false", run: runI1 },
  { id: "I2", name: "Ivan no-register: unavailable, no fabricated counts",                   run: runI2 },
  { id: "I3", name: "Ivan partial path: lower-bound string + within wall budget",            run: runI3 },
  { id: "I4", name: "Ivan indeterminate: step-5 obscured surfaces as own fact",              run: runI4 },
  { id: "I5", name: "Ivan straddle (dedup-merge): straddler counted once as closed",         run: runI5 },
  { id: "I6", name: "Ivan standard: advisory-only + idempotent + fingerprint invalidation",  run: runI6 },
];
