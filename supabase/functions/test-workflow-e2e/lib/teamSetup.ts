// Project-scoped role assignment + identity wiring for the harness.
//
// Two writes per canonical user:
//   1. project_team_members(role=<canonical name>)    — project-scoped role
//      resolution used by ORA/P2A task-generation triggers.
//   2. profiles.role = roles.id matching roles.name=<canonical name> — the
//      identity contract that current_user_has_role() reads. Mig 6's UPDATE
//      policy on orp_approvals gates on this. Without it, every per-JWT
//      UPDATE silently affects 0 rows and downstream rules look red for the
//      wrong reason. We resolve via the SAME lookup current_user_has_role
//      uses (roles.name + is_active + NOT is_retired) so a catalog drift
//      surfaces here, not at an approval write.
//
// Provisioned via service-role at run start; profiles row itself is created
// by the handle_new_user() trigger on auth.users INSERT (we only UPDATE).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.52.0";

export async function assignTeamRoles(
  svc: SupabaseClient,
  projectId: string,
  users: Record<string, { id: string }>,
): Promise<void> {
  const rows = Object.entries(users).map(([role, u]) => ({
    project_id: projectId,
    user_id: u.id,
    role, // exact catalog label
  }));
  const { error } = await svc.from("project_team_members").insert(rows);
  if (error) throw new Error(`assignTeamRoles: ${error.message}`);

  // Resolve roles.id for each canonical name, then write profiles.role.
  // One round-trip for the lookup so a missing/retired catalog row fails
  // loudly here rather than as a silent has_role=false at UPDATE time.
  const names = Object.keys(users);
  const { data: roleRows, error: roleErr } = await svc
    .from("roles")
    .select("id,name")
    .in("name", names)
    .eq("is_active", true)
    .eq("is_retired", false);
  if (roleErr) throw new Error(`assignTeamRoles roles lookup: ${roleErr.message}`);
  const byName = new Map<string, string>((roleRows ?? []).map((r: any) => [r.name, r.id]));
  const missing = names.filter((n) => !byName.has(n));
  if (missing.length > 0) {
    throw new Error(`assignTeamRoles: roles catalog missing/inactive: ${missing.join(", ")}`);
  }
  for (const [name, u] of Object.entries(users)) {
    const { error: upErr } = await svc
      .from("profiles")
      .update({ role: byName.get(name) })
      .eq("user_id", u.id);
    if (upErr) throw new Error(`assignTeamRoles profile(${name}): ${upErr.message}`);
  }
}
