// M11 harness: shared types.
//
// status semantics:
//   pass    - scenario ran and assertions held
//   fail    - scenario ran and at least one assertion did not hold
//   blocked - an upstream scenario this one depends on did NOT pass; this
//             scenario was NOT executed. Recorder reports the upstream id(s)
//             via `blockedBy` so the table shows WHY it didn't run.
//   pending - scaffold-only; no implementation yet.
//   error   - scenario threw an unexpected exception (infra failure, not a
//             test assertion). Distinguished from `fail` so we don't mask
//             real bugs as expected workflow failures.
export type ScenarioStatus = "pass" | "fail" | "blocked" | "pending" | "error";

export interface ScenarioResult {
  id: string;            // e.g. "R1", "A"
  name: string;          // short human label
  status: ScenarioStatus;
  observed?: unknown;    // what we saw
  expected?: unknown;    // what we expected
  blockedBy?: string[];  // upstream ids that failed/blocked
  error?: string;        // populated when status === "error"
  durationMs?: number;
}

export interface RunContext {
  runId: string;          // unique per harness invocation; stamped on all rows
  serviceClient: unknown; // service-role client for provisioning / teardown
  anonUrl: string;        // for minting per-role user clients
  anonKey: string;
  users: Record<string, { id: string; email: string; jwt: string }>; // role -> user
  project: { id: string; code: string };                              // shared base project
  results: Map<string, ScenarioResult>;                               // accumulator
}

export interface Scenario {
  id: string;
  name: string;
  // ids of scenarios that must be `pass` before this one runs
  dependsOn?: string[];
  run: (ctx: RunContext) => Promise<Omit<ScenarioResult, "id" | "name" | "status"> & { status?: ScenarioStatus }>;
}
