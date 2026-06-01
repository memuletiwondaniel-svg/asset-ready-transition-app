// Cross-cutting A–H. Real probes; honest fails when product impl missing.
import type { Scenario, RunContext } from "../lib/types.ts";
import { clientAs } from "../lib/provision.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.52.0";

const svcOf = (ctx: RunContext): SupabaseClient => ctx.serviceClient as SupabaseClient;

// ── A: shared queries — projection parity with src/lib/queries/oraTasks.ts ──
// Mirrors the production SELECT shape; if R1's task isn't returned by this
// exact projection the UI can't see it either.
const SHARED_SELECT = "id, user_id, title, status, type, priority, metadata, created_at";
const runA: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const { data, error } = await svc.from("user_tasks").select(SHARED_SELECT)
    .filter("metadata->>source", "eq", "ora_workflow")
    .filter("metadata->>project_id", "eq", ctx.project.id)
    .filter("metadata->>action", "eq", "create_ora_plan");
  if (error) return { status: "fail", expected: "shared SELECT projection from src/lib/queries/oraTasks.ts", observed: error.message };
  if (!data || data.length === 0) return { status: "fail", expected: "R1 task visible via shared SELECT", observed: "0 rows" };
  const needed = ["id","user_id","title","status","type","priority","metadata","created_at"];
  const missing = needed.filter(k => !(k in data[0]));
  if (missing.length > 0) return { status: "fail", expected: "projection includes all OraWorkflowTaskRow keys", observed: { missing } };
  return { status: "pass", observed: { sharedSelect: SHARED_SELECT, sampleRowKeys: Object.keys(data[0]) } };
};

// ── B: vcr_plan_is_approved gate — 0-of-4 false, 4-of-4 true ────────────────
const runB: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const { data: pts } = await svc.from("p2a_handover_points")
    .select("id,vcr_code,handover_plan_id").order("vcr_code", { ascending: true });
  const projPts = (pts ?? []).filter((p: any) => p.handover_plan_id);
  if (projPts.length < 2) return { status: "fail", expected: "2 VCR points to compare", observed: { found: projPts.length } };
  const approvedPt = projPts[0];
  const unapprovedPt = projPts[1];
  const { data: g1 } = await svc.rpc("vcr_plan_is_approved", { _point_id: approvedPt.id });
  const { data: g2 } = await svc.rpc("vcr_plan_is_approved", { _point_id: unapprovedPt.id });
  if (g1 !== true) return { status: "fail", expected: "approved point → gate=true", observed: { gate: g1, pointId: approvedPt.id } };
  if (g2 !== false) return { status: "fail", expected: "unapproved point → gate=false", observed: { gate: g2, pointId: unapprovedPt.id } };
  return { status: "pass", observed: { approved: g1, unapproved: g2 } };
};

// ── C: scoping — three roles, three different checklist sets (2/1/1) ──────
const runC: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const { data: pts } = await svc.from("p2a_handover_points")
    .select("id,vcr_code").order("vcr_code", { ascending: true }).limit(1);
  const pt = pts?.[0];
  if (!pt) return { status: "fail", expected: "first VCR point", observed: "none" };
  const rolesToCheck = ["Sr ORA Engr", "Construction Lead", "Commissioning Lead"] as const;
  const counts: Record<string, number> = {};
  const dpIds: Record<string, string[]> = {};
  for (const role of rolesToCheck) {
    const u = ctx.users[role];
    const { data } = await svc.from("user_tasks").select("id,metadata")
      .filter("metadata->>action", "eq", "complete_checklist")
      .filter("metadata->>point_id", "eq", pt.id)
      .eq("user_id", u.id);
    counts[role] = data?.length ?? 0;
    dpIds[role] = (data ?? []).map((r: any) => r.metadata?.delivering_party_id);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return { status: "fail", expected: "complete_checklist tasks scoped per role", observed: { counts } };
  if (counts["Sr ORA Engr"] === counts["Construction Lead"]) {
    return { status: "fail", expected: "Sr ORA Engr count != Construction Lead count (role-specific cardinality, not generic)", observed: { counts } };
  }
  const allIds = Object.values(dpIds).flat();
  if (new Set(allIds).size !== allIds.length) {
    return { status: "fail", expected: "delivering_party_id sets disjoint across roles", observed: { dpIds } };
  }
  return { status: "pass", observed: { counts, totalTasks: total } };
};


// ── D: rollup — cancelled_superseded excluded from denominator ──────────────
const runD: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  // Find an R18 deliverable parent w/ 2 children
  const { data: parents } = await svc.from("user_tasks")
    .select("id").filter("metadata->>action", "eq", "deliver_training")
    .filter("metadata->>project_id", "eq", ctx.project.id).limit(1);
  const parentId = parents?.[0]?.id;
  if (!parentId) return { status: "fail", expected: "R18 deliverable parent", observed: "none" };
  const { data: kids } = await svc.from("user_tasks").select("id,status").eq("parent_task_id", parentId).order("created_at", { ascending: true });
  if (!kids || kids.length !== 2) return { status: "fail", expected: "2 children", observed: { count: kids?.length } };
  // Mark child[0] cancelled_superseded, child[1] completed → expect parent = 100% (1/1)
  await svc.from("user_tasks").update({ status: "cancelled_superseded" }).eq("id", kids[0].id);
  await svc.from("user_tasks").update({ status: "completed" }).eq("id", kids[1].id);
  // Re-read parent progress
  const { data: parentAfter } = await svc.from("user_tasks").select("progress_percentage").eq("id", parentId).maybeSingle();
  const progress = parentAfter?.progress_percentage ?? null;
  if (progress !== 100) return {
    status: "fail",
    expected: "rollup excludes cancelled_superseded from denominator → 1/1 = 100%",
    observed: { progress, note: "no rollup engine recomputing parent progress_percentage on child status change" },
  };
  return { status: "pass", observed: { parentId, progress } };
};

// ── E: rejection cascade — Revise task + sibling cancellations atomic ───────
const runE: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const { data: pts } = await svc.from("p2a_handover_points")
    .select("id,handover_plan_id").order("vcr_code", { ascending: true }).limit(1);
  const pt = pts?.[0];
  if (!pt) return { status: "fail", expected: "first VCR point", observed: "none" };
  // Try a fresh REJECT on the unapproved point's P2A plan via Construction Lead
  const planId = pt.handover_plan_id;
  const constr = ctx.users["Construction Lead"];
  const c = clientAs(ctx.anonUrl, ctx.anonKey, constr.jwt);
  // Skip if already APPROVED (it is — R12 approved). Test via direct DB on a sibling
  const sr = ctx.users["Sr ORA Engr"];
  // Look for any 'revise_p2a_plan' or 'revise_vcr_plan' task for Sr ORA Engr — should be 0 since no rejection happened
  const { data: revise } = await svc.from("user_tasks").select("id")
    .filter("metadata->>action", "in", '("revise_p2a_plan","revise_vcr_plan")')
    .eq("user_id", sr.id);
  // E is impl-validation: we report pending unless we trigger one. Skip the destructive REJECT (would corrupt R6-R22 deps).
  return { status: "fail", expected: "Reject path produces Revise task + cancels sibling pendings atomically", observed: { note: "harness does not exercise REJECT (would corrupt R6–R22 chain); product trigger sync_p2a_rejection_to_plan exists but cascade-to-Revise-task untested. Marked fail pending dedicated REJECT scenario in isolated runId.", reviseFound: revise?.length ?? 0 } };
};

// ── F: dedupe_key idempotency — replay APPROVE → no duplicate user_tasks ────
const runF: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  // Count current review_p2a_plan tasks for ORA Lead, replay the APPROVE, recount.
  const oraLead = ctx.users["ORA Lead"];
  const before = await svc.from("user_tasks").select("id", { count: "exact", head: true })
    .filter("metadata->>source", "eq", "p2a_handover")
    .filter("metadata->>project_id", "eq", ctx.project.id);
  const c = clientAs(ctx.anonUrl, ctx.anonKey, oraLead.jwt);
  // No-op UPDATE that fires the trigger again (APPROVED→APPROVED).
  await c.from("p2a_handover_approvers")
    .update({ approved_at: new Date().toISOString() })
    .eq("stage", "P2A").eq("role_name", "ORA Lead").eq("status", "APPROVED");
  const after = await svc.from("user_tasks").select("id", { count: "exact", head: true })
    .filter("metadata->>source", "eq", "p2a_handover")
    .filter("metadata->>project_id", "eq", ctx.project.id);
  if ((before.count ?? 0) !== (after.count ?? 0)) return {
    status: "fail", expected: "replay APPROVE → same count (dedupe_key idempotent)",
    observed: { before: before.count, after: after.count, delta: (after.count ?? 0) - (before.count ?? 0) },
  };
  return { status: "pass", observed: { count: after.count } };
};

// ── G: revision diff — ORA-Lead-only re-approve; diff by (source_plan_id, source_business_key) ──
const runG: Scenario["run"] = async () => {
  return { status: "fail", expected: "revise approved P2A → ORA-Lead-only re-approval gate + diff reconcile (kept/new/superseded) on (source_plan_id, source_business_key)", observed: { note: "no product trigger implements ORA-Lead-only re-approval gate or diff reconciliation across versions. Schema (source_plan_id, source_business_key, source_plan_version) is present on user_tasks but no engine consumes it." } };
};

// ── H: RLS — wrong-role write deny, DELETE deny, legacy gate auto-true ──────
const runH: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const sr = ctx.users["Sr ORA Engr"];
  const fails: string[] = [];

  // (1) wrong-role write deny: Sr ORA Engr tries to UPDATE ORA Lead's approval row
  const { data: pts } = await svc.from("p2a_handover_points")
    .select("id,handover_plan_id").order("vcr_code", { ascending: true }).limit(1);
  const pt = pts?.[0];
  if (pt) {
    const cSr = clientAs(ctx.anonUrl, ctx.anonKey, sr.jwt);
    const { error: wrErr, count: wrCount } = await cSr.from("p2a_handover_approvers")
      .update({ comments: "tamper" }, { count: "exact" })
      .eq("point_id", pt.id).eq("stage", "VCR").eq("role_name", "ORA Lead");
    if (!wrErr && (wrCount ?? 0) > 0) fails.push(`wrong-role UPDATE succeeded (${wrCount} rows)`);
  }

  // (2) DELETE deny: Sr ORA Engr tries to DELETE an approval row
  const cSr2 = clientAs(ctx.anonUrl, ctx.anonKey, sr.jwt);
  const { error: delErr, count: delCount } = await cSr2.from("p2a_handover_approvers")
    .delete({ count: "exact" })
    .eq("point_id", pt?.id ?? "00000000-0000-0000-0000-000000000000");
  if (!delErr && (delCount ?? 0) > 0) fails.push(`DELETE succeeded (${delCount} rows)`);

  // (3) legacy gate_model: set plan to legacy → vcr_plan_is_approved returns true regardless
  if (pt) {
    const { error: gErr } = await svc.from("p2a_handover_points").update({ gate_model: "legacy" }).eq("id", pt.id);
    if (gErr) fails.push(`set legacy failed: ${gErr.message}`);
    const { data: gateLegacy } = await svc.rpc("vcr_plan_is_approved", { _point_id: pt.id });
    if (gateLegacy !== true) fails.push(`legacy gate returned ${gateLegacy}, expected true`);
    // restore
    await svc.from("p2a_handover_points").update({ gate_model: "spec_v2" }).eq("id", pt.id);
  }

  if (fails.length > 0) return { status: "fail", expected: "wrong-role denied + DELETE denied + legacy gate=true", observed: { failures: fails } };
  return { status: "pass", observed: { wrongRoleDeny: "ok", deleteDeny: "ok", legacyGate: true } };
};

export const crossCuttingScenarios: Scenario[] = [
  { id: "A", name: "Visibility: shared SELECT projection (oraTasks.ts) returns R1 task with full row shape", dependsOn: ["R1"], run: runA },
  { id: "B", name: "Gate: vcr_plan_is_approved — approved point true, unapproved point false",               dependsOn: ["R18"], run: runB },
  { id: "C", name: "Scoping: complete_checklist tasks exist per role (R19/R21/R22a coverage)",                dependsOn: ["R18"], run: runC },
  { id: "D", name: "Aggregation: rollup excludes cancelled_superseded from denominator",                       dependsOn: ["R18"], run: runD },
  { id: "E", name: "Rejection cascade: revise task + sibling pendings cancelled atomically",                   dependsOn: ["R18"], run: runE },
  { id: "F", name: "Idempotency: replay APPROVE → no duplicate user_tasks (dedupe_key)",                       dependsOn: ["R18"], run: runF },
  { id: "G", name: "Versioning: revised plan ORA-Lead-only re-approval + diff reconcile",                      dependsOn: ["R18"], run: runG },
  { id: "H", name: "RLS: wrong-role deny + DELETE deny + legacy gate_model auto-true",                         dependsOn: ["R18"], run: runH },
];
