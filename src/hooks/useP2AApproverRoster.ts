import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FIXED_APPROVER_ROLES, type WizardApprover } from '@/components/widgets/p2a-wizard/steps/ApprovalSetupStep';

/**
 * Shared canonical resolver for the P2A approver roster.
 *
 * SINGLE source of truth used by both:
 *   - ApprovalSetupStep (wizard roster)
 *   - SubmissionSuccessDialog (post-submit / re-opened status modal)
 *   - DB triggers create_p2a_ora_lead_review / create_p2a_lead_reviews
 *
 * All five roles resolve through the SQL function
 * `resolve_p2a_approver_profile(project, role)` which itself delegates to
 * the two existing resolvers (resolve_project_role_user for the 4 leads,
 * find_deputy_plant_director for the deputy). There is no duplicated
 * deputy lookup on the client — the triggers and the roster must agree
 * by construction.
 */

export function useP2AApproverRoster(projectId?: string, _plantNameInput?: string) {
  const query = useQuery({
    enabled: !!projectId,
    queryKey: ['p2a-approver-roster', projectId],
    queryFn: async (): Promise<WizardApprover[]> => {
      const client = supabase as any;
      const entries = await Promise.all(
        FIXED_APPROVER_ROLES.map(async (role) => {
          const { data, error } = await client.rpc('resolve_p2a_approver_profile', {
            p_project_id: projectId,
            p_role_label: role.label,
          });
          if (error) {
            console.error('[useP2AApproverRoster] resolve failed for', role.label, error);
            return {
              id: `approver-${role.key}`,
              role_name: role.label,
              display_order: role.order,
              status: 'PENDING' as const,
            };
          }
          const row = Array.isArray(data) ? data[0] : data;
          return {
            id: `approver-${role.key}`,
            role_name: role.label,
            display_order: role.order,
            status: 'PENDING' as const,
            user_id: row?.user_id,
            user_name: row?.full_name,
            user_avatar: row?.avatar_url ?? undefined,
          };
        }),
      );
      return entries;
    },
  });

  return { roster: query.data ?? [], isLoading: query.isLoading };
}
