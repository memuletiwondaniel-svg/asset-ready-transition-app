// Canonical SPEC for rules R1–R22. This is the contract the harness asserts
// against. It is intentionally INDEPENDENT of what the production code
// happens to do — the recorder's "never adapts to current behavior" rule
// hinges on this file being read-only catalog truth.
//
// Each rule entry encodes:
//   trigger      : the event that should fire it
//   title        : exact title format (placeholders {projCode}, {activity})
//   assigneeRole : the canonical role-catalog name that should hold the task
//   status       : initial user_tasks.status enum value
//   action       : metadata.action verb on user_tasks
//
// When the code diverges from any field, the scenario emits a `fail` with
// `expected` = this entry and `observed` = whatever the DB had.

export interface RuleSpec {
  id: string;
  trigger: string;
  title: string;          // {projCode} replaced at assertion time, never mutated to match code
  assigneeRole: string;   // EXACT roles.name catalog label
  status: "pending";      // SPEC initial status for all rule-generated tasks
  action: string;         // user_tasks.metadata.action
}

export const SPEC: Record<string, RuleSpec> = {
  R1: {
    id: "R1",
    trigger: "INSERT public.projects",
    title: "{projCode}: Develop ORA Plan",
    assigneeRole: "Sr ORA Engr",
    status: "pending",
    action: "create_ora_plan",
  },
  R2: {
    id: "R2",
    trigger: "UPDATE public.orp_plans SET status='PENDING_APPROVAL' (Sr ORA Engr submit)",
    title: "{projCode}: Review and Approve ORA Plan",
    assigneeRole: "ORA Lead",
    status: "pending",
    action: "review_ora_plan",
  },
  R3: {
    id: "R3",
    trigger: "UPDATE orp_approvals SET status='APPROVED' WHERE approver_role='ORA Lead'",
    title: "{projCode}: Review and Approve ORA Plan",
    assigneeRole: "Project Hub Lead",
    status: "pending",
    action: "review_ora_plan",
  },
  R4: {
    id: "R4",
    trigger: "UPDATE orp_approvals SET status='APPROVED' WHERE approver_role='ORA Lead'",
    title: "{projCode}: Review and Approve ORA Plan",
    assigneeRole: "Dep. Plant Director",
    status: "pending",
    action: "review_ora_plan",
  },
  R5: {
    id: "R5",
    trigger:
      "BOTH orp_approvals(Project Hub Lead)=APPROVED AND orp_approvals(Dep. Plant Director)=APPROVED via orp_plan_is_approved()",
    title: "{projCode}: {activity}",
    assigneeRole: "Sr ORA Engr",
    status: "pending",
    action: "complete_ora_activity",
  },
};
