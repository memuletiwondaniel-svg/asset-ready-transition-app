// Canonical SPEC for rules R1–R22 + cross-cutting invariants. This is the
// contract the harness asserts against. It is intentionally INDEPENDENT of
// what the production code happens to do — the recorder's "never adapts to
// current behavior" rule hinges on this file being read-only catalog truth.
//
// Each rule expects ONE OR MORE generated user_tasks rows. A rule with N
// expected rows is encoded as N entries in `expects`, all keyed by the same
// `id` (R6, R7…). Title placeholders ({projCode}, {vcrCode}) are expanded at
// assertion time, NEVER mutated in this file to match observed behavior.
//
// Fan-out rules (R18/R20/R22) declare multiple titles under the same rule id.
// Scoped rules (R19/R21/R22a) declare `scope` = how delivering-party rows
// are filtered (the actual count is computed at assertion time from
// vcr_item_delivering_parties for the target role).

export type Gate =
  | "none"
  | "ora_lead_approved"             // R3/R4 seed gate
  | "phl_dpd_approved"              // R5 — orp_plan_is_approved()
  | "ora_workflow_complete"         // R6 — ORA approved → P2A entry
  | "sr_ora_engr_submit_p2a"        // R7
  | "ora_lead_approved_p2a"         // R8–R11 seed gate
  | "p2a_plan_is_approved"          // R12 — 4-of-4 lead approvers on P2A
  | "sr_ora_engr_submit_vcr"        // R13
  | "ora_lead_approved_vcr"         // R14–R17 seed gate
  | "vcr_plan_is_approved";         // R18–R22 — 4-of-4 lead approvers on VCR

export interface ExpectedTask {
  /** Exact title; {projCode} and {vcrCode} expanded at assert time. */
  title: string;
  /** EXACT roles.name catalog label resolved via resolve_project_role_user. */
  assigneeRole: string;
  /** user_tasks.metadata.action verb. */
  action: string;
  /** Cardinality of this expected row per rule firing.
   *  - "one"            : exactly one task per rule firing (R1–R11, R13–R17)
   *  - "per_vcr"        : one task per p2a_handover_points row (R12, R18 fan-out parents, R19/R20/R21/R22)
   *  - "per_itp"        : one sub-task per p2a_itp_activities row scoped to handover_point (R22b sub-tasks)
   *  - "per_delivering" : one task per vcr_item_delivering_parties row where role = assigneeRole (R19/R21/R22a)
   */
  cardinality: "one" | "per_vcr" | "per_itp" | "per_delivering";
  /** Has child sub-tasks rolled up into completion %. R18 parents + R20 + R22b. */
  hasSubTasks?: boolean;
  /** If true, the rollup denominator excludes status='cancelled_superseded' (cross-cutting D). */
  excludesCancelledSuperseded?: boolean;
  /** R22b only: leaf reaches 100% ONLY when user_tasks.confirmed_by_sr_ora_engr = true. */
  requiresSrOraConfirmation?: boolean;
}

export interface RuleSpec {
  id: string;
  trigger: string;
  gate: Gate;
  status: "pending";
  expects: ExpectedTask[];
}

const REVIEW_ROLES_LEAD = [
  "Construction Lead",
  "Commissioning Lead",
  "Project Hub Lead",
  "Dep. Plant Director",
] as const;

export const SPEC: Record<string, RuleSpec> = {
  // ── ORA WORKFLOW (R1–R5) ─────────────────────────────────────────────────
  R1: {
    id: "R1",
    trigger: "INSERT project_team_members (Sr ORA Engr assigned)",
    gate: "none",
    status: "pending",
    expects: [{ title: "{projCode}: Develop ORA Plan", assigneeRole: "Sr ORA Engr", action: "create_ora_plan", cardinality: "one" }],
  },
  R2: {
    id: "R2",
    trigger: "UPDATE orp_plans SET status='PENDING_APPROVAL' (Sr ORA Engr submit)",
    gate: "none",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve ORA Plan", assigneeRole: "ORA Lead", action: "review_ora_plan", cardinality: "one" }],
  },
  R3: {
    id: "R3",
    trigger: "UPDATE orp_approvals APPROVED WHERE approver_role='ORA Lead'",
    gate: "ora_lead_approved",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve ORA Plan", assigneeRole: "Project Hub Lead", action: "review_ora_plan", cardinality: "one" }],
  },
  R4: {
    id: "R4",
    trigger: "UPDATE orp_approvals APPROVED WHERE approver_role='ORA Lead'",
    gate: "ora_lead_approved",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve ORA Plan", assigneeRole: "Dep. Plant Director", action: "review_ora_plan", cardinality: "one" }],
  },
  R5: {
    id: "R5",
    trigger: "PHL+DPD APPROVED via orp_plan_is_approved()",
    gate: "phl_dpd_approved",
    status: "pending",
    expects: [{ title: "{projCode}: {activity}", assigneeRole: "Sr ORA Engr", action: "complete_ora_activity", cardinality: "one" }],
  },

  // ── P2A PLAN WORKFLOW (R6–R12) ───────────────────────────────────────────
  R6: {
    id: "R6",
    trigger: "ORA plan APPROVED (orp_plan_is_approved=true) → seed P2A entry task",
    gate: "ora_workflow_complete",
    status: "pending",
    expects: [{ title: "{projCode}: Develop P2A Plan", assigneeRole: "Sr ORA Engr", action: "develop_p2a_plan", cardinality: "one" }],
  },
  R7: {
    id: "R7",
    trigger: "UPDATE p2a_handover_plans SET status='PENDING_APPROVAL' (Sr ORA Engr submit)",
    gate: "sr_ora_engr_submit_p2a",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve P2A Plan", assigneeRole: "ORA Lead", action: "review_p2a_plan", cardinality: "one" }],
  },
  R8: {
    id: "R8",
    trigger: "UPDATE p2a_approval_workflow APPROVED WHERE approver_role='ORA Lead'",
    gate: "ora_lead_approved_p2a",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve P2A Plan", assigneeRole: "Construction Lead", action: "review_p2a_plan", cardinality: "one" }],
  },
  R9: {
    id: "R9",
    trigger: "UPDATE p2a_approval_workflow APPROVED WHERE approver_role='ORA Lead'",
    gate: "ora_lead_approved_p2a",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve P2A Plan", assigneeRole: "Commissioning Lead", action: "review_p2a_plan", cardinality: "one" }],
  },
  R10: {
    id: "R10",
    trigger: "UPDATE p2a_approval_workflow APPROVED WHERE approver_role='ORA Lead'",
    gate: "ora_lead_approved_p2a",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve P2A Plan", assigneeRole: "Project Hub Lead", action: "review_p2a_plan", cardinality: "one" }],
  },
  R11: {
    id: "R11",
    trigger: "UPDATE p2a_approval_workflow APPROVED WHERE approver_role='ORA Lead'",
    gate: "ora_lead_approved_p2a",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve P2A Plan", assigneeRole: "Dep. Plant Director", action: "review_p2a_plan", cardinality: "one" }],
  },
  R12: {
    id: "R12",
    trigger: "4-of-4 lead approvers APPROVED via p2a_plan_is_approved() — one task per p2a_handover_points row",
    gate: "p2a_plan_is_approved",
    status: "pending",
    expects: [{ title: "{projCode}: Develop {vcrCode} Plan", assigneeRole: "Sr ORA Engr", action: "develop_vcr_plan", cardinality: "per_vcr" }],
  },

  // ── VCR PLAN WORKFLOW (R13–R17) ──────────────────────────────────────────
  R13: {
    id: "R13",
    trigger: "UPDATE p2a_handover_points SET execution_plan_status='PENDING_APPROVAL' (Sr ORA Engr submit)",
    gate: "sr_ora_engr_submit_vcr",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve {vcrCode} Plan", assigneeRole: "ORA Lead", action: "review_vcr_plan", cardinality: "per_vcr" }],
  },
  R14: {
    id: "R14",
    trigger: "UPDATE p2a_approval_workflow APPROVED WHERE approver_role='ORA Lead' AND scope=VCR",
    gate: "ora_lead_approved_vcr",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve {vcrCode} Plan", assigneeRole: "Construction Lead", action: "review_vcr_plan", cardinality: "per_vcr" }],
  },
  R15: {
    id: "R15",
    trigger: "(same as R14)",
    gate: "ora_lead_approved_vcr",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve {vcrCode} Plan", assigneeRole: "Commissioning Lead", action: "review_vcr_plan", cardinality: "per_vcr" }],
  },
  R16: {
    id: "R16",
    trigger: "(same as R14)",
    gate: "ora_lead_approved_vcr",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve {vcrCode} Plan", assigneeRole: "Project Hub Lead", action: "review_vcr_plan", cardinality: "per_vcr" }],
  },
  R17: {
    id: "R17",
    trigger: "(same as R14)",
    gate: "ora_lead_approved_vcr",
    status: "pending",
    expects: [{ title: "{projCode}: Review and Approve {vcrCode} Plan", assigneeRole: "Dep. Plant Director", action: "review_vcr_plan", cardinality: "per_vcr" }],
  },

  // ── VCR EXECUTION FAN-OUT (R18–R22) ──────────────────────────────────────
  R18: {
    id: "R18",
    trigger: "4-of-4 VCR lead approvers APPROVED via vcr_plan_is_approved() — 5 deliverable parents per VCR to Sr ORA Engr",
    gate: "vcr_plan_is_approved",
    status: "pending",
    expects: [
      { title: "{projCode}: Deliver Training for {vcrCode}",                assigneeRole: "Sr ORA Engr", action: "deliver_training",            cardinality: "per_vcr", hasSubTasks: true, excludesCancelledSuperseded: true },
      { title: "{projCode}: Deliver Procedures for {vcrCode}",              assigneeRole: "Sr ORA Engr", action: "deliver_procedures",          cardinality: "per_vcr", hasSubTasks: true, excludesCancelledSuperseded: true },
      { title: "{projCode}: Deliver Critical Documents for {vcrCode}",      assigneeRole: "Sr ORA Engr", action: "deliver_critical_docs",       cardinality: "per_vcr", hasSubTasks: true, excludesCancelledSuperseded: true },
      { title: "{projCode}: Deliver Procedures & Registers for {vcrCode}",  assigneeRole: "Sr ORA Engr", action: "deliver_procedures_registers",cardinality: "per_vcr", hasSubTasks: true, excludesCancelledSuperseded: true },
      { title: "{projCode}: Complete Witness and Hold Points for {vcrCode}",assigneeRole: "Sr ORA Engr", action: "complete_witness_hold",       cardinality: "per_vcr", hasSubTasks: true, excludesCancelledSuperseded: true },
    ],
  },
  R19: {
    id: "R19",
    trigger: "vcr_plan_is_approved — checklist task scoped to vcr_item_delivering_parties(role=Sr ORA Engr)",
    gate: "vcr_plan_is_approved",
    status: "pending",
    expects: [{ title: "{projCode}: Complete {vcrCode} Checklist Items", assigneeRole: "Sr ORA Engr", action: "complete_checklist", cardinality: "per_delivering" }],
  },
  R20: {
    id: "R20",
    trigger: "vcr_plan_is_approved — 2 CMMS deliverables per VCR to CMMS Lead",
    gate: "vcr_plan_is_approved",
    status: "pending",
    expects: [
      { title: "{projCode}: Deliver CMMS for {vcrCode}",                assigneeRole: "CMMS Lead", action: "deliver_cmms",   cardinality: "per_vcr", hasSubTasks: true, excludesCancelledSuperseded: true },
      { title: "{projCode}: Deliver 2Y Operating Spares for {vcrCode}", assigneeRole: "CMMS Lead", action: "deliver_spares", cardinality: "per_vcr", hasSubTasks: true, excludesCancelledSuperseded: true },
    ],
  },
  R21: {
    id: "R21",
    trigger: "vcr_plan_is_approved — checklist scoped to vcr_item_delivering_parties(role=Construction Lead)",
    gate: "vcr_plan_is_approved",
    status: "pending",
    expects: [{ title: "{projCode}: Complete {vcrCode} Checklist Items", assigneeRole: "Construction Lead", action: "complete_checklist", cardinality: "per_delivering" }],
  },
  R22: {
    id: "R22",
    trigger: "vcr_plan_is_approved — Commissioning Lead: (a) scoped checklist + (b) ITP rollup gated on Sr ORA Engr confirmation",
    gate: "vcr_plan_is_approved",
    status: "pending",
    expects: [
      { title: "{projCode}: Complete {vcrCode} Checklist Items", assigneeRole: "Commissioning Lead", action: "complete_checklist", cardinality: "per_delivering" },
      { title: "{projCode}: Complete ITP for {vcrCode}",          assigneeRole: "Commissioning Lead", action: "complete_itp",       cardinality: "per_vcr", hasSubTasks: true, excludesCancelledSuperseded: true, requiresSrOraConfirmation: true },
    ],
  },
};

/** Cross-cutting invariants — asserted by crossCuttingScenarios. */
export const CROSS_CUTTING = {
  A: "All 3 reads (ora_activity_plan_v / My Tasks / Gantt) use shared pure fns in src/lib/queries — not hand SELECTs",
  B: "P2A/VCR gates: 1-of-4 approvers → false, 4-of-4 → true",
  C: "R19/R21/R22a each yield exactly the vcr_item_delivering_parties row count for their role on this handover_point",
  D: "Rollup = completed/total; status='cancelled_superseded' excluded from denominator",
  E: "Reject at P2A or VCR level → 'Revise [plan]' task to Sr ORA Engr + sibling pending approvals cancelled atomically",
  F: "Double-fire approval → no duplicate user_tasks (dedupe_key idempotent)",
  G: "Revise approved P2A/VCR: ORA-Lead-only re-approval; diff on (source_plan_id, source_business_key): unchanged kept, new created, removed → cancelled_superseded",
  H: "Wrong-role JWT write denied on all 3 approval tables; DELETE denied; legacy plan (gate_model='legacy') → gate returns true",
} as const;
