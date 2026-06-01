// Teardown sweeps strictly by run scope.
//
// Two scoping keys:
//   1. auth.users — by email LIKE 'm11-<runId>-%@test.local' (deterministic)
//   2. data rows — by project_id within the harness project (resolved up-front)
//
// We delete child rows before parents to avoid FK violations. user_tasks are
// scoped by metadata->>project_id; approvals via plan->project_id.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.52.0";

export async function sweepByRunId(
  svc: SupabaseClient,
  runId: string,
  projectIds: string[],
): Promise<{ deleted: Record<string, number>; errors: string[] }> {
  const deleted: Record<string, number> = {};
  const errors: string[] = [];
  const safe = async (label: string, fn: () => Promise<{ count?: number | null; error: { message: string } | null }>) => {
    try {
      const { count, error } = await fn();
      if (error) errors.push(`${label}: ${error.message}`);
      else deleted[label] = count ?? 0;
    } catch (e) {
      errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (projectIds.length > 0) {
    // user_tasks scoped by metadata->>project_id (one project at a time — IN on JSON not portable)
    for (const pid of projectIds) {
      await safe(`user_tasks(${pid})`, () =>
        svc.from("user_tasks").delete({ count: "exact" }).filter("metadata->>project_id", "eq", pid) as any,
      );
    }
    // approvals via plan FK — let CASCADE on plans handle them
    await safe("orp_plans", () =>
      svc.from("orp_plans").delete({ count: "exact" }).in("project_id", projectIds) as any,
    );
    await safe("p2a_handover_plans", () =>
      svc.from("p2a_handover_plans").delete({ count: "exact" }).in("project_id", projectIds) as any,
    );
    await safe("projects", () =>
      svc.from("projects").delete({ count: "exact" }).in("id", projectIds) as any,
    );
  }

  // auth.users — find by email pattern then delete one by one (admin API has no bulk delete)
  try {
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const pattern = new RegExp(`^m11-${runId}-.+@test\\.local$`);
    const toDelete = (list?.users ?? []).filter((u) => u.email && pattern.test(u.email));
    let userCount = 0;
    for (const u of toDelete) {
      const { error } = await svc.auth.admin.deleteUser(u.id);
      if (error) errors.push(`deleteUser(${u.email}): ${error.message}`);
      else userCount++;
    }
    deleted.users = userCount;
  } catch (e) {
    errors.push(`listUsers: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { deleted, errors };
}
