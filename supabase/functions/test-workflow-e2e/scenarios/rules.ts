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
  const sr = ctx.users[spec.assigneeRole];
  // Team rows + project already exist from provisioning. The production
  // trigger auto_create_ora_plan_task is attached to project_team_members
  // (NOT projects) — that itself is a SPEC mismatch we record. The task
  // should already have been created by the team insert in provisioning.
  const rows = await findTask(svc, ctx.project.id, spec.action, sr.id);
  if (rows.length === 0) {
    return {
      status: "fail",
      expected: { count: ">=1", action: spec.action, assignee: spec.assigneeRole },
      observed: { count: 0, note: "no create_ora_plan task created for Sr ORA Engr after team assignment" },
    };
  }
  const task = rows[0];
  const expectedTitle = expandTitle(spec.title, ctx.project.code);
  const mismatches: string[] = [];
  if (task.title !== expectedTitle) {
    mismatches.push(`title: expected "${expectedTitle}", got "${task.title}"`);
  }
  if (task.status !== spec.status) {
    mismatches.push(`status: expected "${spec.status}", got "${task.status}"`);
  }
  // Trigger-event note: SPEC originally said "projects INSERT"; the lean
  // accepted in M10 keeps it on project_team_members INSERT (assignee must
  // exist). The R1 catalog-resolution + title fix is what landed. Event is
  // NOT recorded as a mismatch.
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
  const planId = await ensureOrpPlan(svc, ctx);
  const sr = ctx.users["Sr ORA Engr"];
  // Sr ORA Engr submits via per-role JWT — exercises Mig 6 UPDATE policy.
  const srClient = clientAs(ctx.anonUrl, ctx.anonKey, sr.jwt);
  const { error: upErr } = await srClient
    .from("orp_plans")
    .update({ status: "PENDING_APPROVAL" })
    .eq("id", planId);
  if (upErr) {
    return { status: "fail", expected: "submit allowed for Sr ORA Engr", observed: upErr.message };
  }
  const oraLead = ctx.users[spec.assigneeRole];
  const rows = await findTask(svc, ctx.project.id, spec.action, oraLead.id);
  if (rows.length === 0) {
    return {
      status: "fail",
      expected: { count: ">=1", title: expandTitle(spec.title, ctx.project.code), assignee: spec.assigneeRole },
      observed: { count: 0, note: "no trigger creates 'review_ora_plan' task for ORA Lead on submit" },
    };
  }
  return { status: "pass", observed: { taskId: rows[0].id } };
};

// ── R3 + R4 share setup: ORA Lead approves; expect PHL & DPD review tasks ─
// 10c trigger create_ora_lead_review_task seeds the ORA Lead PENDING row on
// orp_plans.status='PENDING_APPROVAL'. We only UPDATE it here via per-role
// JWT to exercise the Mig 6 UPDATE policy.
async function approveAsOraLead(ctx: any, planId: string) {
  const oraLead = ctx.users["ORA Lead"];
  const c = clientAs(ctx.anonUrl, ctx.anonKey, oraLead.jwt);
  const { error } = await c
    .from("orp_approvals")
    .update({ status: "APPROVED", approved_at: new Date().toISOString() })
    .eq("orp_plan_id", planId)
    .eq("approver_role", "ORA Lead");
  return error?.message ?? null;
}

function buildReviewRule(rule: "R3" | "R4"): Scenario["run"] {
  return async (ctx) => {
    const svc = svcOf(ctx);
    const spec = SPEC[rule];
    const planId = await ensureOrpPlan(svc, ctx);
    // Only seed/approve ORA Lead once (R3 runs first; R4 finds existing APPROVED row).
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
    const assignee = ctx.users[spec.assigneeRole];
    const rows = await findTask(svc, ctx.project.id, spec.action, assignee.id);
    if (rows.length === 0) {
      return {
        status: "fail",
        expected: { title: expandTitle(spec.title, ctx.project.code), assignee: spec.assigneeRole, status: spec.status },
        observed: { count: 0, note: `no trigger creates review_ora_plan task for ${spec.assigneeRole} after ORA Lead approval` },
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
    const c = clientAs(ctx.anonUrl, ctx.anonKey, u.jwt);
    const { error } = await c
      .from("orp_approvals")
      .update({ status: "APPROVED", approved_at: new Date().toISOString() })
      .eq("orp_plan_id", planId)
      .eq("approver_role", role);
    if (error) {
      return { status: "fail", expected: `${role} UPDATE APPROVED allowed`, observed: error.message };
    }
  }

  const sr = ctx.users[spec.assigneeRole];
  const rows = await findTask(svc, ctx.project.id, spec.action, sr.id);
  if (rows.length === 0) {
    return {
      status: "fail",
      expected: { count: ">=1", assignee: spec.assigneeRole, gate: spec.trigger },
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

// ──────────────────────────────────────────────────────────────────────────
export const ruleScenarios: Scenario[] = [
  { id: "R1",  name: "Project created → Develop ORA Plan → Sr ORA Engr",                 run: runR1 },
  { id: "R2",  name: "Sr ORA Engr submits → Review/Approve ORA Plan → ORA Lead",         dependsOn: ["R1"], run: runR2 },
  { id: "R3",  name: "ORA Lead approves → review task → Project Hub Lead",               dependsOn: ["R2"], run: buildReviewRule("R3") },
  { id: "R4",  name: "ORA Lead approves → review task → Dep. Plant Director",            dependsOn: ["R2"], run: buildReviewRule("R4") },
  { id: "R5",  name: "Both PHL+DPD approve → leaf-activity tasks → Sr ORA Engr",         dependsOn: ["R3", "R4"], run: runR5 },

  // pending stubs
  { id: "R6",  name: "P2A task fires on ORA approval (Develop P2A Plan)",                dependsOn: ["R5"], run: pending },
  { id: "R7",  name: "Sr ORA Engr submits P2A → review → Construction Lead",             dependsOn: ["R6"], run: pending },
  { id: "R8",  name: "Sr ORA Engr submits P2A → review → Commissioning Lead",            dependsOn: ["R6"], run: pending },
  { id: "R9",  name: "Sr ORA Engr submits P2A → review → Project Hub Lead",              dependsOn: ["R6"], run: pending },
  { id: "R10", name: "Sr ORA Engr submits P2A → review → Dep. Plant Director",           dependsOn: ["R6"], run: pending },
  { id: "R11", name: "All four P2A approvals → handover tasks created per delivery row", dependsOn: ["R7","R8","R9","R10"], run: pending },
  { id: "R12", name: "P2A approved → Create VCR → CMMS Lead",                            dependsOn: ["R11"], run: pending },
  { id: "R13", name: "CMMS Lead submits VCR → review → Construction Lead",               dependsOn: ["R12"], run: pending },
  { id: "R14", name: "CMMS Lead submits VCR → review → Commissioning Lead",              dependsOn: ["R12"], run: pending },
  { id: "R15", name: "CMMS Lead submits VCR → review → Project Hub Lead",                dependsOn: ["R12"], run: pending },
  { id: "R16", name: "CMMS Lead submits VCR → review → Dep. Plant Director",             dependsOn: ["R12"], run: pending },
  { id: "R17", name: "All four VCR approvals → VCR Bundle tasks per delivering party",   dependsOn: ["R13","R14","R15","R16"], run: pending },
  { id: "R18", name: "VCR Bundle approved by delivering party → deliverable tasks",      dependsOn: ["R17"], run: pending },
  { id: "R19", name: "Deliverable rejected → Revise Deliverable task → owner",           dependsOn: ["R18"], run: pending },
  { id: "R20", name: "All deliverables accepted → VCR finalize task → CMMS Lead",        dependsOn: ["R18"], run: pending },
  { id: "R21", name: "VCR finalized → SOF task → Director (commission-scoped)",          dependsOn: ["R20"], run: pending },
  { id: "R22", name: "SOF signed → ITP handshake task → Operations",                     dependsOn: ["R21"], run: pending },
];
