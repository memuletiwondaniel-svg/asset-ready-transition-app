// Rules R1–R22. R1–R5 implemented this turn; R6+ remain `pending`.
//
// Discipline: every assertion is against ./lib/spec.ts (the catalog), NEVER
// against what the production code happens to do. When the live code
// diverges, the scenario emits status:"fail" with expected = SPEC and
// observed = DB row, so the acceptance table shows the gap. We do not edit
// SPEC to make a red row turn green.
//
// Per-role JWT clients exercise Mig 6 INSERT/UPDATE policies + Mig 8
// harness restrictive facet on every approval write.
import type { Scenario } from "../lib/types.ts";
import { SPEC } from "../lib/spec.ts";
import { clientAs } from "../lib/provision.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.52.0";

const pending: Scenario["run"] = async () => ({ status: "pending" as const });

// ── helpers ────────────────────────────────────────────────────────────────
const svcOf = (ctx: any): SupabaseClient => ctx.serviceClient as SupabaseClient;

async function findTask(
  svc: SupabaseClient,
  projectId: string,
  action: string,
  userId?: string,
) {
  let q = svc
    .from("user_tasks")
    .select("id,user_id,title,status,type,priority,metadata,created_at")
    .filter("metadata->>source", "eq", "ora_workflow")
    .filter("metadata->>project_id", "eq", projectId)
    .filter("metadata->>action", "eq", action);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw new Error(`findTask(${action}): ${error.message}`);
  return data ?? [];
}

function expandTitle(tmpl: string, projCode: string, activity = ""): string {
  return tmpl.replace("{projCode}", projCode).replace("{activity}", activity);
}

// Assert that the trigger seeded an orp_approvals row with the shape the
// Mig 6 UPDATE policy expects: status=PENDING, approver_user_id = resolved
// user, cycle=1. Returns null on OK, mismatch string on failure. A missing
// or wrong-shape seed surfaces as the cause of an R3/R4/R5 fail, not as a
// downstream task-count mystery.
async function assertSeed(
  svc: SupabaseClient,
  planId: string,
  role: string,
  expectedUserId: string,
): Promise<string | null> {
  const { data, error } = await svc
    .from("orp_approvals")
    .select("status,approver_user_id,cycle")
    .eq("orp_plan_id", planId)
    .eq("approver_role", role)
    .eq("cycle", 1)
    .maybeSingle();
  if (error) return `seed lookup error: ${error.message}`;
  if (!data) return `seed missing for role=${role} cycle=1`;
  if (data.status !== "PENDING" && data.status !== "APPROVED") {
    return `seed status=${data.status} (expected PENDING or APPROVED)`;
  }
  if (data.approver_user_id !== expectedUserId) {
    return `seed approver_user_id=${data.approver_user_id} (expected ${expectedUserId})`;
  }
  return null;
}

async function ensureOrpPlan(svc: SupabaseClient, ctx: any): Promise<string> {
  const existing = await svc
    .from("orp_plans")
    .select("id")
    .eq("project_id", ctx.project.id)
    .eq("is_active", true)
    .maybeSingle();
  if (existing.data?.id) return existing.data.id as string;
  const sr = ctx.users["Sr ORA Engr"];
  const { data, error } = await svc
    .from("orp_plans")
    .insert({
      project_id: ctx.project.id,
      phase: "ASSESS_SELECT",
      ora_engineer_id: sr.id,
      created_by: sr.id,
      status: "DRAFT",
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`ensureOrpPlan: ${error.message}`);
  // One leaf activity so R5 has something to generate.
  await svc.from("ora_plan_activities").insert({
    orp_plan_id: data!.id,
    name: "Develop Operations Manual",
    activity_code: "ORA-01",
    status: "NOT_STARTED",
    completion_percentage: 0,
  });
  return data!.id as string;
}

// ── R1 ─────────────────────────────────────────────────────────────────────
const runR1: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const spec = SPEC.R1;
  const e = spec.expects[0];
  const sr = ctx.users[e.assigneeRole];
  const rows = await findTask(svc, ctx.project.id, e.action, sr.id);
  if (rows.length === 0) {
    return {
      status: "fail",
      expected: { count: ">=1", action: e.action, assignee: e.assigneeRole },
      observed: { count: 0, note: "no create_ora_plan task created for Sr ORA Engr after team assignment" },
    };
  }
  const task = rows[0];
  const expectedTitle = expandTitle(e.title, ctx.project.code);
  const mismatches: string[] = [];
  if (task.title !== expectedTitle) {
    mismatches.push(`title: expected "${expectedTitle}", got "${task.title}"`);
  }
  if (task.status !== spec.status) {
    mismatches.push(`status: expected "${spec.status}", got "${task.status}"`);
  }
  if (mismatches.length > 0) {
    return {
      status: "fail",
      expected: { title: expectedTitle, status: spec.status },
      observed: { title: task.title, status: task.status, mismatches },
    };
  }
  return { status: "pass", observed: { taskId: task.id } };
};


// ── R2 ─────────────────────────────────────────────────────────────────────
const runR2: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const spec = SPEC.R2;
  const e = spec.expects[0];
  const planId = await ensureOrpPlan(svc, ctx);
  const sr = ctx.users["Sr ORA Engr"];
  const srClient = clientAs(ctx.anonUrl, ctx.anonKey, sr.jwt);
  const { error: upErr, count: upCount } = await srClient
    .from("orp_plans")
    .update({ status: "PENDING_APPROVAL" }, { count: "exact" })
    .eq("id", planId);
  if (upErr) {
    return { status: "fail", expected: "submit allowed for Sr ORA Engr", observed: upErr.message };
  }
  if ((upCount ?? 0) === 0) {
    return { status: "fail", expected: "Sr ORA Engr submit affects 1 row", observed: "0 rows updated — RLS denied silently" };
  }
  const oraLead = ctx.users[e.assigneeRole];
  const seedErr = await assertSeed(svc, planId, "ORA Lead", oraLead.id);
  if (seedErr) {
    return { status: "fail", expected: "ORA Lead orp_approvals seed after submit", observed: seedErr };
  }
  const rows = await findTask(svc, ctx.project.id, e.action, oraLead.id);
  if (rows.length === 0) {
    return {
      status: "fail",
      expected: { count: ">=1", title: expandTitle(e.title, ctx.project.code), assignee: e.assigneeRole },
      observed: { count: 0, note: "no trigger creates 'review_ora_plan' task for ORA Lead on submit" },
    };
  }
  return { status: "pass", observed: { taskId: rows[0].id } };

};

// ── R3 + R4 share setup: ORA Lead approves; expect PHL & DPD review tasks ─
// 10c trigger create_ora_lead_review_task seeds the ORA Lead PENDING row on
// orp_plans.status='PENDING_APPROVAL'. We only UPDATE it here via per-role
// JWT to exercise the Mig 6 UPDATE policy.
async function approveAsOraLead(ctx: any, planId: string): Promise<string | null> {
  const oraLead = ctx.users["ORA Lead"];
  const c = clientAs(ctx.anonUrl, ctx.anonKey, oraLead.jwt);
  const { error, count } = await c
    .from("orp_approvals")
    .update({ status: "APPROVED", approved_at: new Date().toISOString() }, { count: "exact" })
    .eq("orp_plan_id", planId)
    .eq("approver_role", "ORA Lead");
  if (error) return error.message;
  if ((count ?? 0) === 0) return "0 rows updated — RLS denied silently (profiles.role / has_role)";
  return null;
}

function buildReviewRule(rule: "R3" | "R4"): Scenario["run"] {
  return async (ctx) => {
    const svc = svcOf(ctx);
    const spec = SPEC[rule];
    const e = spec.expects[0];
    const planId = await ensureOrpPlan(svc, ctx);
    const { data: existing } = await svc
      .from("orp_approvals")
      .select("status")
      .eq("orp_plan_id", planId)
      .eq("approver_role", "ORA Lead")
      .maybeSingle();
    if (!existing || existing.status !== "APPROVED") {
      const err = await approveAsOraLead(ctx, planId);
      if (err) {
        return { status: "fail", expected: "ORA Lead UPDATE APPROVED allowed", observed: err };
      }
    }
    const assignee = ctx.users[e.assigneeRole];
    const seedErr = await assertSeed(svc, planId, e.assigneeRole, assignee.id);
    if (seedErr) {
      return { status: "fail", expected: `${e.assigneeRole} seed after ORA Lead approval`, observed: seedErr };
    }
    const rows = await findTask(svc, ctx.project.id, e.action, assignee.id);
    if (rows.length === 0) {
      return {
        status: "fail",
        expected: { title: expandTitle(e.title, ctx.project.code), assignee: e.assigneeRole, status: spec.status },
        observed: { count: 0, note: `no trigger creates review_ora_plan task for ${e.assigneeRole} after ORA Lead approval` },
      };
    }
    return { status: "pass", observed: { taskId: rows[0].id } };

  };
}

// ── R5: join across PHL+DPD approvals → leaf tasks for Sr ORA Engr ────────
// After R3/R4 pass, 10c trigger create_phl_dpd_review_tasks has seeded the
// PHL + DPD PENDING orp_approvals rows. R5 UPDATEs them via per-role JWT;
// the derived-status trigger (10b) flips orp_plans.status='APPROVED' THROUGH
// the gate fn. The leaf-task trigger (10c, on orp_approvals) reads the gate
// and creates the activity tasks. NO direct orp_plans.status write here —
// that would trip the bypass guard (must-lock 4b).
const runR5: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const spec = SPEC.R5;
  const planId = await ensureOrpPlan(svc, ctx);
  for (const role of ["Project Hub Lead", "Dep. Plant Director"] as const) {
    const u = ctx.users[role];
    // Seed assertion BEFORE attempting the UPDATE — a missing seed would
    // make the UPDATE silently affect 0 rows (no RLS error, no row matched)
    // and the failure would surface as "leaf-task trigger didn't fire" when
    // the real cause is upstream.
    const seedErr = await assertSeed(svc, planId, role, u.id);
    if (seedErr) {
      return { status: "fail", expected: `${role} seed present before R5 approval`, observed: seedErr };
    }
    const c = clientAs(ctx.anonUrl, ctx.anonKey, u.jwt);
    const { error, count } = await c
      .from("orp_approvals")
      .update({ status: "APPROVED", approved_at: new Date().toISOString() }, { count: "exact" })
      .eq("orp_plan_id", planId)
      .eq("approver_role", role);
    if (error) {
      return { status: "fail", expected: `${role} UPDATE APPROVED allowed`, observed: error.message };
    }
    if ((count ?? 0) === 0) {
      return { status: "fail", expected: `${role} UPDATE affects 1 row`, observed: "0 rows updated — RLS denied silently" };
    }
  }

  const e = SPEC.R5.expects[0];
  const sr = ctx.users[e.assigneeRole];
  const rows = await findTask(svc, ctx.project.id, e.action, sr.id);
  if (rows.length === 0) {
    return {
      status: "fail",
      expected: { count: ">=1", assignee: e.assigneeRole, gate: spec.trigger },
      observed: { count: 0, note: "leaf-task trigger did not fire after PHL+DPD APPROVED" },
    };
  }

  const t = rows[0];
  const expectedPrefix = `${ctx.project.code}: `;
  const mismatches: string[] = [];
  if (!t.title.startsWith(expectedPrefix)) {
    mismatches.push(`title: expected prefix "${expectedPrefix}", got "${t.title}"`);
  }
  if (t.status !== spec.status) {
    mismatches.push(`status: expected "${spec.status}", got "${t.status}"`);
  }
  if (mismatches.length > 0) {
    return {
      status: "fail",
      expected: { titlePrefix: expectedPrefix, status: spec.status },
      observed: { title: t.title, status: t.status, mismatches },
    };
  }
  return { status: "pass", observed: { taskId: t.id, count: rows.length } };
};

// ══════════════════════════════════════════════════════════════════════════
// P2A WORKFLOW (R6–R12) — spec_v2 chain on p2a_handover_approvers
// ══════════════════════════════════════════════════════════════════════════
// Discriminator: spec rows carry metadata.contract='spec_v2' inside the
// shared source='p2a_handover' namespace, so the 46 legacy rows can't
// satisfy a spec assert by accident (C-narrow).
async function findP2ATask(svc: SupabaseClient, projectId: string, action: string, userId?: string) {
  let q = svc.from("user_tasks")
    .select("id,user_id,title,status,type,priority,dedupe_key,metadata,created_at")
    .filter("metadata->>source", "eq", "p2a_handover")
    .filter("metadata->>contract", "eq", "spec_v2")
    .filter("metadata->>project_id", "eq", projectId)
    .filter("metadata->>action", "eq", action);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw new Error(`findP2ATask(${action}): ${error.message}`);
  return data ?? [];
}

async function assertP2AApproverSeed(svc: SupabaseClient, planId: string, role: string, expectedUserId: string): Promise<string | null> {
  const { data, error } = await svc.from("p2a_handover_approvers")
    .select("status,user_id,cycle,stage")
    .eq("handover_id", planId).eq("stage", "P2A").eq("role_name", role).eq("cycle", 1).maybeSingle();
  if (error) return `seed lookup error: ${error.message}`;
  if (!data) return `seed missing for role=${role} stage=P2A cycle=1`;
  if (data.status !== "PENDING" && data.status !== "APPROVED") return `seed status=${data.status} (expected PENDING/APPROVED)`;
  if (data.user_id !== expectedUserId) return `seed user_id=${data.user_id} (expected ${expectedUserId})`;
  return null;
}

async function ensureP2APlan(svc: SupabaseClient, ctx: any): Promise<string> {
  const sr = ctx.users["Sr ORA Engr"];
  const existing = await svc.from("p2a_handover_plans").select("id").eq("project_id", ctx.project.id).eq("created_by", sr.id).maybeSingle();
  if (existing.data?.id) return existing.data.id as string;
  const { data, error } = await svc.from("p2a_handover_plans").insert({
    project_id: ctx.project.id,
    name: `M11 P2A Plan ${ctx.runId}`,
    created_by: sr.id, status: "DRAFT", project_code: ctx.project.code,
  }).select("id").single();
  if (error) throw new Error(`ensureP2APlan: ${error.message}`);
  return data!.id as string;
}

async function ensureP2APoints(svc: SupabaseClient, ctx: any, planId: string) {
  const { data: existing } = await svc.from("p2a_handover_points").select("id,vcr_code").eq("handover_plan_id", planId);
  if ((existing?.length ?? 0) >= 2) return existing as Array<{id:string;vcr_code:string}>;
  const sr = ctx.users["Sr ORA Engr"];
  const { data, error } = await svc.from("p2a_handover_points").insert([
    { handover_plan_id: planId, name: "VCR-01 — System A", vcr_code: "VCR-01", position_x: 100, position_y: 100, created_by: sr.id },
    { handover_plan_id: planId, name: "VCR-02 — System B", vcr_code: "VCR-02", position_x: 200, position_y: 200, created_by: sr.id },
  ]).select("id,vcr_code");
  if (error) throw new Error(`ensureP2APoints: ${error.message}`);
  return data as Array<{id:string;vcr_code:string}>;
}

const runR6: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const sr = ctx.users["Sr ORA Engr"];
  const rows = await findP2ATask(svc, ctx.project.id, "develop_p2a_plan", sr.id);
  if (rows.length === 0) return {
    status: "fail",
    expected: { title: `${ctx.project.code}: Develop P2A Plan`, assignee: "Sr ORA Engr" },
    observed: { count: 0, note: "create_p2a_entry_task did not fire after orp_plan_is_approved=true" },
  };
  const expected = `${ctx.project.code}: Develop P2A Plan`;
  if (rows[0].title !== expected) return { status: "fail", expected: { title: expected }, observed: { title: rows[0].title } };
  return { status: "pass", observed: { taskId: rows[0].id } };
};

const runR7: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const planId = await ensureP2APlan(svc, ctx);
  const { error: upErr } = await svc.from("p2a_handover_plans").update({ status: "PENDING_APPROVAL" }).eq("id", planId);
  if (upErr) return { status: "fail", expected: "submit allowed", observed: upErr.message };
  const oraLead = ctx.users["ORA Lead"];
  const seedErr = await assertP2AApproverSeed(svc, planId, "ORA Lead", oraLead.id);
  if (seedErr) return { status: "fail", expected: "ORA Lead P2A seed after submit", observed: seedErr };
  const rows = await findP2ATask(svc, ctx.project.id, "review_p2a_plan", oraLead.id);
  if (rows.length === 0) return {
    status: "fail",
    expected: { title: `${ctx.project.code}: Review and Approve P2A Plan`, assignee: "ORA Lead" },
    observed: { count: 0, note: "create_p2a_ora_lead_review did not fire" },
  };
  return { status: "pass", observed: { planId, taskId: rows[0].id } };
};

async function approveP2AAsOraLead(ctx: any, planId: string): Promise<string | null> {
  const oraLead = ctx.users["ORA Lead"];
  const c = clientAs(ctx.anonUrl, ctx.anonKey, oraLead.jwt);
  const { error, count } = await c.from("p2a_handover_approvers")
    .update({ status: "APPROVED", approved_at: new Date().toISOString() }, { count: "exact" })
    .eq("handover_id", planId).eq("stage", "P2A").eq("role_name", "ORA Lead");
  if (error) return error.message;
  if ((count ?? 0) === 0) return "0 rows updated — RLS denied silently";
  return null;
}

function buildP2ALeadRule(rule: "R8" | "R9" | "R10" | "R11"): Scenario["run"] {
  const spec = SPEC[rule];
  const role = spec.expects[0].assigneeRole;
  const action = spec.expects[0].action;
  return async (ctx) => {
    const svc = svcOf(ctx);
    const planId = await ensureP2APlan(svc, ctx);
    const { data: existing } = await svc.from("p2a_handover_approvers")
      .select("status").eq("handover_id", planId).eq("stage","P2A").eq("role_name","ORA Lead").maybeSingle();
    if (!existing || existing.status !== "APPROVED") {
      const err = await approveP2AAsOraLead(ctx, planId);
      if (err) return { status: "fail", expected: "ORA Lead UPDATE APPROVED", observed: err };
    }
    const assignee = ctx.users[role];
    const seedErr = await assertP2AApproverSeed(svc, planId, role, assignee.id);
    if (seedErr) return { status: "fail", expected: `${role} seed`, observed: seedErr };
    const rows = await findP2ATask(svc, ctx.project.id, action, assignee.id);
    if (rows.length === 0) return {
      status: "fail",
      expected: { title: `${ctx.project.code}: Review and Approve P2A Plan`, assignee: role },
      observed: { count: 0, note: `no ${action} task for ${role}` },
    };
    return { status: "pass", observed: { taskId: rows[0].id } };
  };
}

const runR12: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const planId = await ensureP2APlan(svc, ctx);
  const points = await ensureP2APoints(svc, ctx, planId);
  for (const role of ["Construction Lead","Commissioning Lead","Project Hub Lead","Dep. Plant Director"] as const) {
    const u = ctx.users[role];
    const seedErr = await assertP2AApproverSeed(svc, planId, role, u.id);
    if (seedErr) return { status: "fail", expected: `${role} seed before R12`, observed: seedErr };
    const { data: row } = await svc.from("p2a_handover_approvers")
      .select("status").eq("handover_id", planId).eq("stage","P2A").eq("role_name", role).maybeSingle();
    if (row?.status === "APPROVED") continue;
    const c = clientAs(ctx.anonUrl, ctx.anonKey, u.jwt);
    const { error, count } = await c.from("p2a_handover_approvers")
      .update({ status: "APPROVED", approved_at: new Date().toISOString() }, { count: "exact" })
      .eq("handover_id", planId).eq("stage","P2A").eq("role_name", role);
    if (error) return { status: "fail", expected: `${role} UPDATE`, observed: error.message };
    if ((count ?? 0) === 0) return { status: "fail", expected: `${role} affects 1 row`, observed: "0 rows — RLS denied" };
  }
  const sr = ctx.users["Sr ORA Engr"];
  const rows = await findP2ATask(svc, ctx.project.id, "develop_vcr_plan", sr.id);
  if (rows.length < points.length) return {
    status: "fail",
    expected: { count: points.length, per: "p2a_handover_points row", assignee: "Sr ORA Engr" },
    observed: { count: rows.length, vcrs: points.map(p => p.vcr_code), got: rows.map((r:any)=>r.title) },
  };
  const titles = new Set(rows.map((r: any) => r.title));
  const missing = points.filter(p => !titles.has(`${ctx.project.code}: Develop ${p.vcr_code} Plan`));
  if (missing.length > 0) return { status: "fail", expected: "one Develop <vcr> Plan per VCR", observed: { missing: missing.map(m=>m.vcr_code) } };
  return { status: "pass", observed: { count: rows.length, vcrs: points.map(p=>p.vcr_code) } };
};

// ══════════════════════════════════════════════════════════════════════════
// VCR WORKFLOW (R13–R18) — spec_v2 chain on p2a_handover_points
// ══════════════════════════════════════════════════════════════════════════
async function getFirstPoint(svc: SupabaseClient, ctx: any): Promise<{id:string;vcr_code:string}> {
  const planId = await ensureP2APlan(svc, ctx);
  const pts = await ensureP2APoints(svc, ctx, planId);
  return pts[0];
}

async function assertVCRApproverSeed(svc: SupabaseClient, pointId: string, role: string, expectedUserId: string): Promise<string | null> {
  const { data, error } = await svc.from("p2a_handover_approvers")
    .select("status,user_id,cycle,stage,point_id")
    .eq("point_id", pointId).eq("stage", "VCR").eq("role_name", role).eq("cycle", 1).maybeSingle();
  if (error) return `seed lookup error: ${error.message}`;
  if (!data) return `VCR seed missing for role=${role} point=${pointId}`;
  if (data.status !== "PENDING" && data.status !== "APPROVED") return `seed status=${data.status}`;
  if (data.user_id !== expectedUserId) return `seed user_id=${data.user_id} (expected ${expectedUserId})`;
  return null;
}

const runR13: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const pt = await getFirstPoint(svc, ctx);
  const { error: upErr } = await svc.from("p2a_handover_points")
    .update({ execution_plan_status: "PENDING_APPROVAL",
              execution_plan_submitted_at: new Date().toISOString(),
              execution_plan_submitted_by: ctx.users["Sr ORA Engr"].id })
    .eq("id", pt.id);
  if (upErr) return { status: "fail", expected: "submit VCR allowed", observed: upErr.message };

  const oraLead = ctx.users["ORA Lead"];
  const seedErr = await assertVCRApproverSeed(svc, pt.id, "ORA Lead", oraLead.id);
  if (seedErr) return { status: "fail", expected: "ORA Lead VCR seed after submit", observed: seedErr };

  const rows = await findP2ATask(svc, ctx.project.id, "review_vcr_plan", oraLead.id);
  const expectedTitle = `${ctx.project.code}: Review and Approve ${pt.vcr_code} Plan`;
  const match = rows.find((r:any)=>r.title === expectedTitle);
  if (!match) return {
    status: "fail",
    expected: { title: expectedTitle, assignee: "ORA Lead" },
    observed: { count: rows.length, got: rows.map((r:any)=>r.title) },
  };
  return { status: "pass", observed: { pointId: pt.id, taskId: match.id } };
};

async function approveVCRApprover(ctx: any, pointId: string, role: string): Promise<string | null> {
  const u = ctx.users[role];
  const c = clientAs(ctx.anonUrl, ctx.anonKey, u.jwt);
  const { error, count } = await c.from("p2a_handover_approvers")
    .update({ status: "APPROVED", approved_at: new Date().toISOString() }, { count: "exact" })
    .eq("point_id", pointId).eq("stage", "VCR").eq("role_name", role);
  if (error) return error.message;
  if ((count ?? 0) === 0) {
    const svc = svcOf(ctx);
    const { data: diag } = await svc.from("p2a_handover_approvers")
      .select("id,handover_id,point_id,stage,role_name,user_id,cycle,status")
      .eq("point_id", pointId).eq("stage", "VCR").eq("role_name", role);
    return `${role} VCR UPDATE 0 rows — diag: caller_uid=${u.id} rows=${JSON.stringify(diag)}`;
  }
  return null;
}

function buildVCRLeadRule(rule: "R14" | "R15" | "R16" | "R17"): Scenario["run"] {
  const spec = SPEC[rule];
  const role = spec.expects[0].assigneeRole;
  const action = spec.expects[0].action;
  return async (ctx) => {
    const svc = svcOf(ctx);
    const pt = await getFirstPoint(svc, ctx);
    const { data: existing } = await svc.from("p2a_handover_approvers")
      .select("status").eq("point_id", pt.id).eq("stage","VCR").eq("role_name","ORA Lead").maybeSingle();
    if (!existing || existing.status !== "APPROVED") {
      const err = await approveVCRApprover(ctx, pt.id, "ORA Lead");
      if (err) return { status: "fail", expected: "ORA Lead VCR APPROVED", observed: err };
    }
    const assignee = ctx.users[role];
    const seedErr = await assertVCRApproverSeed(svc, pt.id, role, assignee.id);
    if (seedErr) return { status: "fail", expected: `${role} VCR seed`, observed: seedErr };

    const rows = await findP2ATask(svc, ctx.project.id, action, assignee.id);
    const expectedTitle = `${ctx.project.code}: Review and Approve ${pt.vcr_code} Plan`;
    const match = rows.find((r:any)=>r.title === expectedTitle);
    if (!match) return {
      status: "fail",
      expected: { title: expectedTitle, assignee: role },
      observed: { count: rows.length, got: rows.map((r:any)=>r.title) },
    };
    return { status: "pass", observed: { taskId: match.id } };
  };
}

const DELIVERABLE_SPEC = [
  { action: "deliver_training",             title: "Deliver Training for" },
  { action: "deliver_procedures",           title: "Deliver Procedures for" },
  { action: "deliver_critical_docs",        title: "Deliver Critical Documents for" },
  { action: "deliver_procedures_registers", title: "Deliver Procedures & Registers for" },
  { action: "complete_witness_hold",        title: "Complete Witness and Hold Points for" },
] as const;

const runR18: Scenario["run"] = async (ctx) => {
  const svc = svcOf(ctx);
  const pt = await getFirstPoint(svc, ctx);
  for (const role of ["Construction Lead","Commissioning Lead","Project Hub Lead","Dep. Plant Director"] as const) {
    const seedErr = await assertVCRApproverSeed(svc, pt.id, role, ctx.users[role].id);
    if (seedErr) return { status: "fail", expected: `${role} VCR seed before R18`, observed: seedErr };
    const { data: row } = await svc.from("p2a_handover_approvers")
      .select("status").eq("point_id", pt.id).eq("stage","VCR").eq("role_name", role).maybeSingle();
    if (row?.status === "APPROVED") continue;
    const err = await approveVCRApprover(ctx, pt.id, role);
    if (err) return { status: "fail", expected: `${role} UPDATE`, observed: err };
  }

  const sr = ctx.users["Sr ORA Engr"];
  const missing: string[] = [];
  const childCounts: Record<string, number> = {};
  const progress: Record<string, number | null> = {};
  for (const d of DELIVERABLE_SPEC) {
    const rows = await findP2ATask(svc, ctx.project.id, d.action, sr.id);
    const expectedTitle = `${ctx.project.code}: ${d.title} ${pt.vcr_code}`;
    const parent = rows.find((r:any)=>r.title === expectedTitle);
    if (!parent) { missing.push(d.action); continue; }
    const { count, error: cErr } = await svc.from("user_tasks")
      .select("id", { count: "exact", head: true })
      .eq("parent_task_id", parent.id);
    if (cErr) return { status: "fail", expected: "child count query", observed: cErr.message };
    childCounts[d.action] = count ?? 0;
    const { data: parentRow } = await svc.from("user_tasks").select("progress_percentage").eq("id", parent.id).maybeSingle();
    progress[d.action] = parentRow?.progress_percentage ?? null;
  }
  if (missing.length > 0) return {
    status: "fail",
    expected: { parents: DELIVERABLE_SPEC.map(d=>d.action), assignee: "Sr ORA Engr" },
    observed: { missing },
  };
  const badChild = Object.entries(childCounts).filter(([,n]) => n !== 2);
  if (badChild.length > 0) return {
    status: "fail",
    expected: "2 sub-tasks per deliverable parent (rollup denominator > 0)",
    observed: { childCounts },
  };
  const badProgress = Object.entries(progress).filter(([,p]) => (p ?? 0) !== 0);
  if (badProgress.length > 0) return {
    status: "fail",
    expected: "all deliverable parents at progress=0 (no children completed)",
    observed: { progress },
  };
  return { status: "pass", observed: { pointId: pt.id, vcr: pt.vcr_code, parents: 5, subTasks: childCounts, progress } };
};

// ──────────────────────────────────────────────────────────────────────────
export const ruleScenarios: Scenario[] = [
  { id: "R1",  name: "Project created → Develop ORA Plan → Sr ORA Engr",                 run: runR1 },
  { id: "R2",  name: "Sr ORA Engr submits → Review/Approve ORA Plan → ORA Lead",         dependsOn: ["R1"], run: runR2 },
  { id: "R3",  name: "ORA Lead approves → review task → Project Hub Lead",               dependsOn: ["R2"], run: buildReviewRule("R3") },
  { id: "R4",  name: "ORA Lead approves → review task → Dep. Plant Director",            dependsOn: ["R2"], run: buildReviewRule("R4") },
  { id: "R5",  name: "Both PHL+DPD approve → leaf-activity tasks → Sr ORA Engr",         dependsOn: ["R3", "R4"], run: runR5 },

  { id: "R6",  name: "ORA approved → Develop P2A Plan → Sr ORA Engr",                    dependsOn: ["R5"], run: runR6 },
  { id: "R7",  name: "Sr ORA Engr submits P2A → Review P2A Plan → ORA Lead",             dependsOn: ["R6"], run: runR7 },
  { id: "R8",  name: "ORA Lead approves P2A → review → Construction Lead",               dependsOn: ["R7"], run: buildP2ALeadRule("R8") },
  { id: "R9",  name: "ORA Lead approves P2A → review → Commissioning Lead",              dependsOn: ["R7"], run: buildP2ALeadRule("R9") },
  { id: "R10", name: "ORA Lead approves P2A → review → Project Hub Lead",                dependsOn: ["R7"], run: buildP2ALeadRule("R10") },
  { id: "R11", name: "ORA Lead approves P2A → review → Dep. Plant Director",             dependsOn: ["R7"], run: buildP2ALeadRule("R11") },
  { id: "R12", name: "4-of-4 leads approve P2A → Develop VCR-XX Plan per VCR → Sr ORA Engr", dependsOn: ["R8","R9","R10","R11"], run: runR12 },

  { id: "R13", name: "Sr ORA Engr submits VCR → review → ORA Lead",                       dependsOn: ["R12"], run: runR13 },
  { id: "R14", name: "ORA Lead approves VCR → review → Construction Lead",                dependsOn: ["R13"], run: buildVCRLeadRule("R14") },
  { id: "R15", name: "ORA Lead approves VCR → review → Commissioning Lead",               dependsOn: ["R13"], run: buildVCRLeadRule("R15") },
  { id: "R16", name: "ORA Lead approves VCR → review → Project Hub Lead",                 dependsOn: ["R13"], run: buildVCRLeadRule("R16") },
  { id: "R17", name: "ORA Lead approves VCR → review → Dep. Plant Director",              dependsOn: ["R13"], run: buildVCRLeadRule("R17") },
  { id: "R18", name: "4-of-4 leads approve VCR → 5 deliverable parents (+2 sub-tasks) → Sr ORA Engr",
               dependsOn: ["R14","R15","R16","R17"], run: runR18 },

  // chunk 3 pending
  { id: "R19", name: "VCR approved → checklist scoped to Sr ORA Engr",                    dependsOn: ["R18"], run: pending },
  { id: "R20", name: "VCR approved → 2 CMMS deliverables → CMMS Lead",                    dependsOn: ["R18"], run: pending },
  { id: "R21", name: "VCR approved → checklist scoped to Construction Lead",              dependsOn: ["R18"], run: pending },
  { id: "R22", name: "VCR approved → Commissioning Lead checklist + ITP rollup",          dependsOn: ["R18"], run: pending },
];
