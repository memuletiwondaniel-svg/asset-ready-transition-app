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

  // Resolve roles.id for each canonical name. Some harness labels (e.g.
  // 'Sr ORA Engr') are the literal the production triggers compare against
  // on project_team_members.role, but the catalog stores a slightly
  // different display name (e.g. 'Snr. ORA Engr.'). That's a real
  // production drift (4th-role-matching class) and is NOT something the
  // harness should silently paper over. We log unresolved names to stderr
  // so it surfaces in edge-function logs, and skip the profiles.role write
  // for those — RLS UPDATEs on those roles will still 0-row and the
  // count-assertion will fail the scenario at its own line.
  const names = Object.keys(users);
  const { data: roleRows, error: roleErr } = await svc
    .from("roles")
    .select("id,name")
    .in("name", names)
    .eq("is_active", true)
    .eq("is_retired", false);
  if (roleErr) throw new Error(`assignTeamRoles roles lookup: ${roleErr.message}`);
  const byName = new Map<string, string>((roleRows ?? []).map((r: any) => [r.name, r.id]));
  const unresolved = names.filter((n) => !byName.has(n));
  if (unresolved.length > 0) {
    console.warn(`[harness] roles catalog has no exact match for: ${unresolved.join(", ")} — profiles.role left unset; per-JWT RLS for these roles will 0-row`);
  }
  for (const [name, u] of Object.entries(users)) {
    const roleId = byName.get(name);
    if (!roleId) continue;
    const { error: upErr } = await svc
      .from("profiles")
      .update({ role: roleId })
      .eq("user_id", u.id);
    if (upErr) throw new Error(`assignTeamRoles profile(${name}): ${upErr.message}`);
  }
}
