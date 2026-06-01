// Project-scoped role assignment for the harness.
//
// Many ORA/P2A task-creation triggers resolve "which user holds role X on
// this project" via public.project_team_members(role). Without these rows,
// R3/R4 (and most downstream rules) would assign-to-nobody and look like a
// false fail. Provisioned via service-role at run start; swept by run_id.
//
// IMPORTANT: project_team_members.role is FREE TEXT — the production
// resolver in auto_create_ora_plan_task / auto_create_ora_leaf_tasks does a
// case-insensitive substring match (e.g. 'snr ora', 'senior ora'). We write
// the canonical roles.name label here; if the prod resolver doesn't match
// that label, that's a code-vs-catalog finding the scenarios surface.
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
}
