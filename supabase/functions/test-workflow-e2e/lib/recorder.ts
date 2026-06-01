// Scenario recorder.
//
// Enforces the pass/fail/blocked/error distinction the rest of the harness
// relies on. Critically, a scenario whose `dependsOn` list contains any
// non-`pass` id is reported as `blocked` (with `blockedBy`) and is NOT
// executed — so a downstream rule never silently fails because of an
// upstream gap, and the acceptance table shows exactly why each rule
// didn't run.
import type { RunContext, Scenario, ScenarioResult } from "./types.ts";

export async function runScenario(scn: Scenario, ctx: RunContext): Promise<ScenarioResult> {
  const t0 = Date.now();
  const deps = scn.dependsOn ?? [];
  const blockedBy = deps.filter((d) => {
    const r = ctx.results.get(d);
    return !r || r.status !== "pass";
  });

  if (blockedBy.length > 0) {
    const res: ScenarioResult = {
      id: scn.id,
      name: scn.name,
      status: "blocked",
      blockedBy,
      durationMs: 0,
    };
    ctx.results.set(scn.id, res);
    return res;
  }

  try {
    const partial = await scn.run(ctx);
    const res: ScenarioResult = {
      id: scn.id,
      name: scn.name,
      status: partial.status ?? "pass",
      observed: partial.observed,
      expected: partial.expected,
      durationMs: Date.now() - t0,
    };
    ctx.results.set(scn.id, res);
    return res;
  } catch (e) {
    const res: ScenarioResult = {
      id: scn.id,
      name: scn.name,
      status: "error",
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      durationMs: Date.now() - t0,
    };
    ctx.results.set(scn.id, res);
    return res;
  }
}
