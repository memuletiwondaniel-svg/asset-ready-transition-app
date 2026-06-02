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
  if (!kids || kids.length < 2) return { status: "fail", expected: ">=2 children", observed: { count: kids?.length } };
  // Mark first child cancelled_superseded; complete the rest → expect 100%
  // (denominator excludes superseded, so N-1 completed of N-1 active = 100).
  await svc.from("user_tasks").update({ status: "cancelled_superseded" }).eq("id", kids[0].id);
  for (const k of kids.slice(1)) {
    await svc.from("user_tasks").update({ status: "completed" }).eq("id", k.id);
  }
  const { data: parentAfter } = await svc.from("user_tasks").select("progress_percentage").eq("id", parentId).maybeSingle();
  const progress = parentAfter?.progress_percentage ?? null;
  if (progress !== 100) return {
    status: "fail",
    expected: `rollup excludes cancelled_superseded → ${kids.length - 1}/${kids.length - 1} = 100%`,
    observed: { progress, totalChildren: kids.length, supersededCount: 1, completedCount: kids.length - 1 },
  };
  return { status: "pass", observed: { parentId, totalChildren: kids.length, supersededCount: 1, completedCount: kids.length - 1, progress } };
};

// ── E: rejection cascade — Revise task + sibling cancellations atomic ───────
// Isolated reject sandbox at ORA / P2A / VCR. Each level uses FRESH
// plans/points so the R6–R22 chain (plan #1 / point VCR-01) is untouched.
// Spec cross_cutting.E: REJECT must (1) cancel sibling PENDING approver
// rows of the same cycle and (2) create a "Revise <Plan>" user_task for
// Sr ORA Engr. If the product cascade doesn't fire, this RED-fails by
// design — caller fixes at root, scenario is unchanged.
const runE: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const sr = ctx.users["Sr ORA Engr"];
  const oraLead = ctx.users["ORA Lead"];
  const phl = ctx.users["Project Hub Lead"];
  const constr = ctx.users["Construction Lead"];
  const results: Record<string, any> = {};

  const tryApprove = async (jwt: string, table: string, build: (q: any) => any): Promise<string | null> => {
    const c = clientAs(ctx.anonUrl, ctx.anonKey, jwt);
    const { error, count } = await build(c.from(table).update({ status: "APPROVED", approved_at: new Date().toISOString() }, { count: "exact" }));
    if (error) return error.message;
    if ((count ?? 0) === 0) return "0 rows";
    return null;
  };
  const tryReject = async (jwt: string, table: string, build: (q: any) => any, comments: string): Promise<string | null> => {
    const c = clientAs(ctx.anonUrl, ctx.anonKey, jwt);
    const { error, count } = await build(c.from(table).update({ status: "REJECTED", approved_at: new Date().toISOString(), comments }, { count: "exact" }));
    if (error) return error.message;
    if ((count ?? 0) === 0) return "0 rows";
    return null;
  };

  // ────────────────────────────────── E-ORA ────────────────────────────────
  {
    const { data: planE, error: pErr } = await svc.from("orp_plans").insert({
      project_id: ctx.project.id, phase: "ASSESS_SELECT",
      ora_engineer_id: sr.id, created_by: sr.id, status: "DRAFT", is_active: false,
    }).select("id").single();
    if (pErr) return { status: "fail", expected: "E-ORA isolated plan create", observed: pErr.message };
    await svc.from("ora_plan_activities").insert({
      orp_plan_id: planE.id, name: "E-ORA sandbox", activity_code: "ORA-E1",
      status: "NOT_STARTED", completion_percentage: 0,
    });
    await svc.from("orp_plans").update({ status: "PENDING_APPROVAL" }).eq("id", planE.id);
    const aErr = await tryApprove(oraLead.jwt, "orp_approvals",
      (q) => q.eq("orp_plan_id", planE.id).eq("approver_role", "ORA Lead"));
    if (aErr) return { status: "fail", expected: "E-ORA ORA Lead APPROVE", observed: aErr };
    const rErr = await tryReject(phl.jwt, "orp_approvals",
      (q) => q.eq("orp_plan_id", planE.id).eq("approver_role", "Project Hub Lead"), "E-ORA reject");
    if (rErr) return { status: "fail", expected: "E-ORA PHL REJECT", observed: rErr };
    const { data: dpd } = await svc.from("orp_approvals")
      .select("status").eq("orp_plan_id", planE.id).eq("approver_role", "Dep. Plant Director").eq("cycle", 1).maybeSingle();
    const { data: revise } = await svc.from("user_tasks").select("id,title,status")
      .filter("metadata->>action", "eq", "revise_ora_plan")
      .filter("metadata->>plan_id", "eq", planE.id)
      .eq("user_id", sr.id);
    results.ORA = {
      planId: planE.id,
      siblingDpd: dpd ? dpd.status : "deleted",
      siblingsCancelled: !dpd || dpd.status !== "PENDING",
      reviseTaskCount: revise?.length ?? 0,
      reviseTaskTitle: revise?.[0]?.title ?? null,
    };
  }

  // ────────────────────────────────── E-P2A ────────────────────────────────
  {
    const { data: planE, error: pErr } = await svc.from("p2a_handover_plans").insert({
      project_id: ctx.project.id, name: `E-P2A sandbox ${ctx.runId}`,
      created_by: sr.id, status: "DRAFT", project_code: ctx.project.code,
    }).select("id").single();
    if (pErr) return { status: "fail", expected: "E-P2A isolated plan create", observed: pErr.message };
    await svc.from("p2a_handover_plans").update({ status: "PENDING_APPROVAL" }).eq("id", planE.id);
    const aErr = await tryApprove(oraLead.jwt, "p2a_handover_approvers",
      (q) => q.eq("handover_id", planE.id).eq("stage", "P2A").eq("role_name", "ORA Lead"));
    if (aErr) return { status: "fail", expected: "E-P2A ORA Lead APPROVE", observed: aErr };
    const rErr = await tryReject(constr.jwt, "p2a_handover_approvers",
      (q) => q.eq("handover_id", planE.id).eq("stage", "P2A").eq("role_name", "Construction Lead"),
      "E-P2A reject");
    if (rErr) return { status: "fail", expected: "E-P2A Construction Lead REJECT", observed: rErr };
    const { data: siblings } = await svc.from("p2a_handover_approvers")
      .select("role_name,status").eq("handover_id", planE.id).eq("stage", "P2A").eq("cycle", 1)
      .in("role_name", ["Commissioning Lead", "Project Hub Lead", "Dep. Plant Director"]);
    const stillPending = (siblings ?? []).filter((r: any) => r.status === "PENDING");
    const { data: revise } = await svc.from("user_tasks").select("id,title,status")
      .filter("metadata->>action", "eq", "revise_p2a_plan")
      .filter("metadata->>plan_id", "eq", planE.id)
      .eq("user_id", sr.id);
    results.P2A = {
      planId: planE.id,
      siblingsRemaining: siblings?.length ?? 0,
      siblingsStillPending: stillPending.length,
      siblingsCancelled: stillPending.length === 0,
      reviseTaskCount: revise?.length ?? 0,
      reviseTaskTitle: revise?.[0]?.title ?? null,
    };
  }

  // ────────────────────────────────── E-VCR ────────────────────────────────
  // Use VCR-02 (R6–R22 chain only touched VCR-01) on the chain's P2A plan.
  {
    const { data: pts } = await svc.from("p2a_handover_points")
      .select("id,vcr_code,handover_plan_id").order("vcr_code", { ascending: true });
    const pt2 = (pts ?? [])[1];
    if (!pt2) return { status: "fail", expected: "VCR-02 point", observed: { found: pts?.length } };
    await svc.from("p2a_handover_points")
      .update({ execution_plan_status: "PENDING_APPROVAL",
                execution_plan_submitted_at: new Date().toISOString(),
                execution_plan_submitted_by: sr.id })
      .eq("id", pt2.id);
    const aErr = await tryApprove(oraLead.jwt, "p2a_handover_approvers",
      (q) => q.eq("point_id", pt2.id).eq("stage", "VCR").eq("role_name", "ORA Lead"));
    if (aErr) return { status: "fail", expected: "E-VCR ORA Lead APPROVE", observed: aErr };
    const rErr = await tryReject(constr.jwt, "p2a_handover_approvers",
      (q) => q.eq("point_id", pt2.id).eq("stage", "VCR").eq("role_name", "Construction Lead"),
      "E-VCR reject");
    if (rErr) return { status: "fail", expected: "E-VCR Construction Lead REJECT", observed: rErr };
    const { data: siblings } = await svc.from("p2a_handover_approvers")
      .select("role_name,status").eq("point_id", pt2.id).eq("stage", "VCR").eq("cycle", 1)
      .in("role_name", ["Commissioning Lead", "Project Hub Lead", "Dep. Plant Director"]);
    const stillPending = (siblings ?? []).filter((r: any) => r.status === "PENDING");
    const { data: revise } = await svc.from("user_tasks").select("id,title,status,metadata")
      .filter("metadata->>action", "eq", "revise_vcr_plan")
      .filter("metadata->>point_id", "eq", pt2.id)
      .eq("user_id", sr.id);
    const { data: ptAfter } = await svc.from("p2a_handover_points")
      .select("execution_plan_status").eq("id", pt2.id).maybeSingle();
    results.VCR = {
      pointId: pt2.id, vcrCode: pt2.vcr_code,
      siblingsRemaining: siblings?.length ?? 0,
      siblingsStillPending: stillPending.length,
      siblingsCancelled: stillPending.length === 0,
      reviseTaskCount: revise?.length ?? 0,
      reviseTaskTitle: revise?.[0]?.title ?? null,
      pointStatusAfter: ptAfter?.execution_plan_status,
    };
  }

  const levelOk = (r: any) => r.siblingsCancelled === true && (r.reviseTaskCount ?? 0) >= 1;
  const passed = ["ORA", "P2A", "VCR"].filter((k) => levelOk(results[k]));
  const failed = ["ORA", "P2A", "VCR"].filter((k) => !levelOk(results[k]));
  if (failed.length > 0) return {
    status: "fail",
    expected: "all 3 levels: sibling pendings cancelled + Revise task for Sr ORA Engr",
    observed: { passed, failed, details: results },
  };
  return { status: "pass", observed: results };
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
// ── G: revision diff — ORA-Lead-only re-approve; diff by (source_plan_id, source_business_key) ──
// Isolated sandbox like E. Build a fresh ORA plan, full-panel approve, advance
// progress on one task, REVISE: add+remove+rename (key stays). ORA-Lead-only
// re-approve. Assert: unchanged keeps progress; renamed keeps task+progress
// (matched by business key, not label); added has new task; removed is
// cancelled_superseded (not deleted, still queryable); rollup denominators
// correctly exclude superseded.
const runG: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const sr = ctx.users["Sr ORA Engr"];
  const oraLead = ctx.users["ORA Lead"];
  const phl = ctx.users["Project Hub Lead"];
  const dpd = ctx.users["Dep. Plant Director"];

  const approveAs = async (jwt: string, role: string, planId: string): Promise<string | null> => {
    const c = clientAs(ctx.anonUrl, ctx.anonKey, jwt);
    const { error, count } = await c.from("orp_approvals")
      .update({ status: "APPROVED", approved_at: new Date().toISOString() }, { count: "exact" })
      .eq("orp_plan_id", planId).eq("approver_role", role).eq("status", "PENDING");
    if (error) return `${role} approve error: ${error.message}`;
    if ((count ?? 0) === 0) return `${role} approve 0 rows`;
    return null;
  };

  // 1. Create isolated plan + 4 leaf activities (A,B,C,D)
  const { data: plan, error: pErr } = await svc.from("orp_plans").insert({
    project_id: ctx.project.id, phase: "ASSESS_SELECT",
    ora_engineer_id: sr.id, created_by: sr.id, status: "DRAFT", is_active: false, version: 1,
  }).select("id").single();
  if (pErr) return { status: "fail", expected: "G isolated plan", observed: pErr.message };

  const codes = ["G-A", "G-B", "G-C", "G-D"];
  for (const code of codes) {
    const { error: aErr } = await svc.from("ora_plan_activities").insert({
      orp_plan_id: plan.id, name: `${code} original`, activity_code: code,
      status: "NOT_STARTED", completion_percentage: 0,
    });
    if (aErr) return { status: "fail", expected: `seed ${code}`, observed: aErr.message };
  }

  // 2. Full-panel approve v1 (ORA Lead → PHL → DPD).
  await svc.from("orp_plans").update({ status: "PENDING_APPROVAL" }).eq("id", plan.id);
  for (const [jwt, role] of [[oraLead.jwt, "ORA Lead"], [phl.jwt, "Project Hub Lead"], [dpd.jwt, "Dep. Plant Director"]] as const) {
    const err = await approveAs(jwt, role, plan.id);
    if (err) return { status: "fail", expected: `v1 ${role} approve`, observed: err };
  }
  const { data: v1Tasks } = await svc.from("user_tasks")
    .select("id,title,source_business_key,source_plan_version,status,progress_percentage")
    .eq("source_plan_id", plan.id)
    .filter("metadata->>action", "eq", "complete_ora_activity");
  if (!v1Tasks || v1Tasks.length !== 4) {
    return { status: "fail", expected: "4 v1 tasks tagged by source_plan_id", observed: { count: v1Tasks?.length, tasks: v1Tasks } };
  }

  // 3. Advance progress on G-B (will survive unchanged) and G-C (will be renamed).
  const taskB = v1Tasks.find((t: any) => t.source_business_key === "G-B")!;
  const taskC = v1Tasks.find((t: any) => t.source_business_key === "G-C")!;
  const taskD = v1Tasks.find((t: any) => t.source_business_key === "G-D")!;
  await svc.from("user_tasks").update({ progress_percentage: 60, status: "in_progress" }).eq("id", taskB.id);
  await svc.from("user_tasks").update({ progress_percentage: 30 }).eq("id", taskC.id);

  // 4. Revise: REMOVE G-D, RENAME G-C (key stays), ADD G-E. G-A/G-B unchanged.
  await svc.from("ora_plan_activities").delete().eq("orp_plan_id", plan.id).eq("activity_code", "G-D");
  await svc.from("ora_plan_activities").update({ name: "G-C renamed label" })
    .eq("orp_plan_id", plan.id).eq("activity_code", "G-C");
  await svc.from("ora_plan_activities").insert({
    orp_plan_id: plan.id, name: "G-E newly added", activity_code: "G-E",
    status: "NOT_STARTED", completion_percentage: 0,
  });

  // 5. Kick off revision cycle (bumps version, seeds ORA Lead row + task).
  const { data: revData, error: revErr } = await svc.rpc("revise_orp_plan", { p_plan_id: plan.id });
  if (revErr) return { status: "fail", expected: "revise_orp_plan rpc", observed: revErr.message };
  const newVer = (revData as any)?.new_version;
  if (newVer !== 2) return { status: "fail", expected: "new_version=2", observed: revData };

  // 6. ORA-Lead-only re-approve at cycle 2.
  const c = clientAs(ctx.anonUrl, ctx.anonKey, oraLead.jwt);
  const { error: rUErr, count: rUCnt } = await c.from("orp_approvals")
    .update({ status: "APPROVED", approved_at: new Date().toISOString() }, { count: "exact" })
    .eq("orp_plan_id", plan.id).eq("approver_role", "ORA Lead").eq("cycle", 2).eq("status", "PENDING");
  if (rUErr) return { status: "fail", expected: "ORA Lead re-approve v2", observed: rUErr.message };
  if ((rUCnt ?? 0) !== 1) return { status: "fail", expected: "1 ORA Lead v2 row approved", observed: { count: rUCnt } };

  const { data: planAfter } = await svc.from("orp_plans").select("status,version").eq("id", plan.id).maybeSingle();
  if (planAfter?.status !== "APPROVED" || planAfter?.version !== 2) {
    return { status: "fail", expected: "plan APPROVED at v2 from ORA-Lead-only re-approval", observed: planAfter };
  }

  // 7. Diff assertions
  const { data: after } = await svc.from("user_tasks")
    .select("id,title,source_business_key,source_plan_version,status,progress_percentage")
    .eq("source_plan_id", plan.id)
    .filter("metadata->>action", "eq", "complete_ora_activity");
  const byKey: Record<string, any> = {};
  for (const t of after ?? []) byKey[t.source_business_key as string] = t;

  const fails: string[] = [];
  if (!byKey["G-A"] || byKey["G-A"].status === "cancelled_superseded") fails.push("G-A missing/superseded");
  if (byKey["G-A"]?.source_plan_version !== 2) fails.push(`G-A version=${byKey["G-A"]?.source_plan_version}, want 2`);

  if (byKey["G-B"]?.id !== taskB.id) fails.push("G-B task id changed (must match by business key, not recreate)");
  if (byKey["G-B"]?.progress_percentage !== 60) fails.push(`G-B progress=${byKey["G-B"]?.progress_percentage}, want 60 (preserved)`);
  if (byKey["G-B"]?.source_plan_version !== 2) fails.push(`G-B version=${byKey["G-B"]?.source_plan_version}, want 2`);

  if (byKey["G-C"]?.id !== taskC.id) fails.push("G-C task id changed (rename must NOT look like delete+create)");
  if (byKey["G-C"]?.progress_percentage !== 30) fails.push(`G-C progress=${byKey["G-C"]?.progress_percentage}, want 30 (preserved through rename)`);
  if (!String(byKey["G-C"]?.title ?? "").includes("G-C renamed label")) fails.push(`G-C title not refreshed: ${byKey["G-C"]?.title}`);

  const dRow = byKey["G-D"];
  if (!dRow) fails.push("G-D missing (must be retained as cancelled_superseded for audit)");
  else {
    if (dRow.id !== taskD.id) fails.push("G-D task id changed");
    if (dRow.status !== "cancelled_superseded") fails.push(`G-D status=${dRow.status}, want cancelled_superseded`);
  }

  if (!byKey["G-E"]) fails.push("G-E new task not created");
  if (byKey["G-E"]?.source_plan_version !== 2) fails.push(`G-E version=${byKey["G-E"]?.source_plan_version}, want 2`);

  if (fails.length > 0) {
    return { status: "fail", expected: "kept/renamed preserve progress; added created; removed superseded (not deleted)",
             observed: { fails, after: byKey } };
  }

  // 8. PHL should NOT have a v2 review task (ORA-Lead-only gate)
  const { data: phlV2 } = await svc.from("user_tasks").select("id,dedupe_key")
    .filter("metadata->>plan_id", "eq", plan.id)
    .filter("metadata->>approver_role", "eq", "Project Hub Lead")
    .like("dedupe_key", "review_ora_plan:%:Project Hub Lead:2");
  if ((phlV2 ?? []).length > 0) {
    return { status: "fail", expected: "ORA-Lead-only re-approval — no PHL v2 review task", observed: { phlV2Count: phlV2?.length } };
  }

  return { status: "pass", observed: {
    planId: plan.id, newVersion: newVer,
    diff: {
      kept_unchanged: ["G-A", "G-B"], renamed_kept: ["G-C"],
      added: ["G-E"], superseded_not_deleted: ["G-D"],
    },
    progressPreserved: { "G-B": byKey["G-B"]?.progress_percentage, "G-C": byKey["G-C"]?.progress_percentage },
  } };
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
