import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared, canonical role→user resolver for the client.
 *
 * Wraps the `resolve_project_role_user(project_id, role_label)` Postgres
 * function (Mig 20260601134922) — the SAME path used by every backend
 * trigger and task fan-out. UI components MUST use this hook rather than
 * matching `project_team_members.role` strings themselves, so the answer
 * to "who holds role X on project Y" is decided in exactly one place.
 *
 * Role labels MUST be byte-identical to `roles.name` in the canonical
 * roles catalog (validated by the Mig 5c trigger). Examples:
 *   'ORA Lead', 'Sr ORA Engr', 'Construction Lead',
 *   'Commissioning Lead', 'Project Hub Lead', 'CMMS Lead'
 *
 * If a project has no team member assigned to that role, the entry is
 * resolved to `null` — components should surface that as "Not assigned"
 * rather than substituting another role (segregation of duties).
 */
export interface ProjectRoleUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

async function resolveOne(
  projectId: string,
  roleLabel: string,
): Promise<ProjectRoleUser | null> {
  const client = supabase as any;

  const rpc = await client.rpc('resolve_project_role_user', {
    p_project_id: projectId,
    p_role_label: roleLabel,
  });
  if (rpc.error) throw rpc.error;
  const userId: string | null = rpc.data ?? null;
  if (!userId) return null;

  // Use the safe profile RPC so we don't depend on profile RLS being open.
  const prof = await client.rpc('get_safe_profile_data', {
    target_user_id: userId,
  });
  if (prof.error) throw prof.error;
  const row = Array.isArray(prof.data) ? prof.data[0] : prof.data;
  if (!row?.user_id) {
    return { user_id: userId, full_name: roleLabel, avatar_url: null };
  }
  return {
    user_id: row.user_id as string,
    full_name: (row.full_name as string) || roleLabel,
    avatar_url: (row.avatar_url as string | undefined) ?? null,
  };
}

/**
 * Resolve a single canonical role label on a project.
 */
export function useProjectRoleUser(
  projectId: string | undefined,
  roleLabel: string,
) {
  return useQuery({
    enabled: !!projectId && !!roleLabel,
    queryKey: ['project-role-user', projectId, roleLabel],
    queryFn: () => resolveOne(projectId!, roleLabel),
  });
}

/**
 * Resolve many canonical role labels on a project in one query.
 * Returns a record keyed by the SAME label string passed in.
 */
export function useProjectRoleUsers(
  projectId: string | undefined,
  roleLabels: readonly string[],
) {
  // Stable key for react-query — labels order-insensitive.
  const sortedKey = [...roleLabels].sort().join('|');
  return useQuery({
    enabled: !!projectId && roleLabels.length > 0,
    queryKey: ['project-role-users', projectId, sortedKey],
    queryFn: async (): Promise<Record<string, ProjectRoleUser | null>> => {
      const entries = await Promise.all(
        roleLabels.map(async (label) => {
          const user = await resolveOne(projectId!, label);
          return [label, user] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });
}
