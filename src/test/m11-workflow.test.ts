// M11 workflow E2E acceptance runner.
//
// This vitest is the acceptance artifact: it POSTs to the edge function,
// receives the per-scenario results, and prints the pass/fail/blocked table.
// It is gated by env var M11_RUN=1 so normal CI doesn't hit the live DB —
// the harness writes to the live project (under is_test_project=true rows
// enforced by the Mig 8 RLS facet) and the run only makes sense when an
// admin JWT is supplied via M11_ADMIN_JWT.
import { describe, it, expect } from "vitest";

const ENABLED = process.env.M11_RUN === "1";
const ADMIN_JWT = process.env.M11_ADMIN_JWT ?? "";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://kgnrjqjbonuvpxxfvfjq.supabase.co";

type Status = "pass" | "fail" | "blocked" | "pending" | "error";
interface Result {
  id: string;
  name: string;
  status: Status;
  blockedBy?: string[];
  error?: string;
  durationMs?: number;
}

describe.runIf(ENABLED)("M11 workflow E2E", () => {
  it("executes the harness and reports pass/fail/blocked per rule + cross-cutting", async () => {
    expect(ADMIN_JWT, "M11_ADMIN_JWT must be set").not.toBe("");

    const res = await fetch(`${SUPABASE_URL}/functions/v1/test-workflow-e2e`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ADMIN_JWT}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "full" }),
    });
    const body = (await res.json()) as { runId: string; results: Result[]; teardown?: unknown };
    expect(res.status, JSON.stringify(body)).toBe(200);

    // Acceptance table — console.table is the deliverable artifact.
    const table = body.results.map((r) => ({
      id: r.id,
      status: r.status.toUpperCase(),
      name: r.name,
      blockedBy: r.blockedBy?.join(",") ?? "",
      ms: r.durationMs ?? 0,
      error: r.error ?? "",
    }));
    // eslint-disable-next-line no-console
    console.log(`\n=== M11 acceptance table (runId=${body.runId}) ===`);
    // eslint-disable-next-line no-console
    console.table(table);

    const summary = body.results.reduce<Record<Status, number>>(
      (acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc),
      { pass: 0, fail: 0, blocked: 0, pending: 0, error: 0 },
    );
    // eslint-disable-next-line no-console
    console.log("summary:", summary);

    // Soft assertion this turn: no `error` (infra failures) and no `fail`
    // (real assertion failures). `pending` is expected while scenarios are
    // scaffold-only; `blocked` is OK and the table shows why.
    expect(summary.error, "infra errors").toBe(0);
    expect(summary.fail, "assertion failures").toBe(0);
  }, 120_000);
});

// Placeholder so the test file is valid when the harness is disabled.
describe.skipIf(ENABLED)("M11 workflow E2E (disabled)", () => {
  it("is gated by M11_RUN=1", () => {
    expect(ENABLED).toBe(false);
  });
});
