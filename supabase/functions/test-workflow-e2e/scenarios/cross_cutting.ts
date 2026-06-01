// Cross-cutting A–H. All scaffold-only this turn (status: "pending").
//
// IMPORTANT design note for A (visibility):
//   The intent is "task created in step X is visible in My Tasks AND the
//   Gantt AND ora_activity_plan_v" — testing the APP, not the harness. If
//   all three reads in the harness are just `SELECT FROM ora_activity_plan_v`
//   then A is tautological. To avoid that, A's implementation (next turn)
//   will invoke the SAME query bodies used by the production hooks
//   (useORMTasks / useUserORPActivities / Gantt query). Until those query
//   bodies are extracted into shared pure functions in src/lib/, A stays
//   `pending` rather than passing trivially. Recorded here so the next
//   implementer doesn't fall into the easy-pass trap.
import type { Scenario } from "../lib/types.ts";

const pending: Scenario["run"] = async () => ({ status: "pending" as const });

export const crossCuttingScenarios: Scenario[] = [
  { id: "A", name: "Visibility: every task surfaces in view + My Tasks + Gantt (via real hook queries)", run: pending },
  { id: "B", name: "Partial approval ≠ full approval (gate fn returns false until all spec roles)",     run: pending },
  { id: "C", name: "Scoping: VCR bundle / deliverable tasks scoped to correct delivering party",        run: pending },
  { id: "D", name: "Aggregation: deliverable parent counts children incl. cancelled_superseded excl.",  run: pending },
  { id: "E", name: "Rejection cascade: revise task + sibling pendings cancelled atomically",            run: pending },
  { id: "F", name: "Idempotency: replay approval event → no duplicate user_tasks (dedupe_key)",         run: pending },
  { id: "G", name: "Versioning: revised plan re-approve by ORA Lead only; diff reconcile correct",      run: pending },
  { id: "H", name: "RLS: wrong-role denied, DELETE denied, legacy plan (gate_model=legacy) auto-true",  run: pending },
];
