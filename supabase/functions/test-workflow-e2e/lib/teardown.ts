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

  // Collect harness user_ids BEFORE deleting membership/users so we can
  // sweep profiles by an explicit id list. profiles.user_id is ON DELETE
  // CASCADE from auth.users, but we delete profiles explicitly first so
  // any failure is visible in `errors` instead of masked by the cascade —
  // same defense-in-depth pattern as harness_users below.
  let harnessUserIds: string[] = [];
  try {
    const { data: hu } = await svc
      .from("harness_users")
      .select("user_id")
      .eq("run_id", runId);
    harnessUserIds = (hu ?? []).map((r: any) => r.user_id as string);
  } catch (e) {
    errors.push(`harness_users lookup: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (harnessUserIds.length > 0) {
    await safe("profiles", () =>
      svc.from("profiles").delete({ count: "exact" }).in("user_id", harnessUserIds) as any,
    );
  }

  // Sweep harness_users by run_id explicitly. ON DELETE CASCADE on user_id
  // would also catch these when auth.users rows are deleted below, but the
  // explicit sweep guarantees zero orphan membership rows even if a user
  // delete fails partway. Run BEFORE auth.users deletion so a failure here
  // is visible in `errors` rather than masked by the cascade.
  await safe("harness_users", () =>
    svc.from("harness_users").delete({ count: "exact" }).eq("run_id", runId) as any,
  );


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
