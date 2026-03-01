import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ORA_ROLE_VARIANTS = [
  'Snr ORA Engr', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr. ORA Engr',
  'Senior ORA Engr.', 'Senior ORA Engineer',
];

/**
 * When all discipline statements are submitted AND all VCR checklist items are closed,
 * auto-creates a task for the Snr ORA Engineer to add the interdisciplinary statement
 * and submit the VCR for approval.
 */
async function checkAndCreateFinalizationTask(handoverPointId: string, queryClient: QueryClient) {
  const client = supabase as any;

  // 1. Check if all expected disciplines have statements
  const { data: prereqs } = await client
    .from('p2a_vcr_prerequisites')
    .select('delivering_party_id')
    .eq('handover_point_id', handoverPointId)
    .not('delivering_party_id', 'is', null);

  const uniqueRoleIds = [...new Set((prereqs || []).map((p: any) => p.delivering_party_id))];
  if (uniqueRoleIds.length === 0) return;

  const { data: statements } = await client
    .from('vcr_discipline_assurance')
    .select('discipline_role_id, discipline_role_name, statement_type')
    .eq('handover_point_id', handoverPointId)
    .eq('statement_type', 'discipline');

  const submittedRoleIds = new Set((statements || []).map((s: any) => s.discipline_role_id));
  const allDisciplinesSubmitted = uniqueRoleIds.every((id: string) => submittedRoleIds.has(id));
  if (!allDisciplinesSubmitted) return;

  // 2. Check if all VCR items are closed (ACCEPTED or QUALIFICATION_APPROVED)
  const { data: allPrereqs } = await client
    .from('p2a_vcr_prerequisites')
    .select('status')
    .eq('handover_point_id', handoverPointId);

  const closedStatuses = ['ACCEPTED', 'QUALIFICATION_APPROVED', 'NA'];
  const allItemsClosed = (allPrereqs || []).length > 0 &&
    (allPrereqs || []).every((p: any) => closedStatuses.includes(p.status));

  if (!allItemsClosed) return;

  // 3. Check for existing finalization task (duplicate prevention)
  const { data: existingTask } = await client
    .from('user_tasks')
    .select('id')
    .eq('type', 'vcr_finalization')
    .filter('metadata->>vcr_id', 'eq', handoverPointId)
    .eq('status', 'pending')
    .limit(1);

  if (existingTask?.length > 0) return;

  // 4. Find project_id via handover plan chain
  const { data: vcr } = await client
    .from('p2a_handover_points')
    .select('handover_plan_id, vcr_code, name')
    .eq('id', handoverPointId)
    .single();

  if (!vcr) return;

  const { data: plan } = await client
    .from('p2a_handover_plans')
    .select('project_id, project_code')
    .eq('id', vcr.handover_plan_id)
    .single();

  if (!plan?.project_id) return;

  // 5. Find Snr ORA Engineer
  const { data: members } = await client
    .from('user_projects')
    .select('user_id, role')
    .eq('project_id', plan.project_id);

  const oraEngineer = (members || []).find((m: any) => ORA_ROLE_VARIANTS.includes(m.role));
  if (!oraEngineer) return;

  // 6. Create the finalization task
  const vcrLabel = `${vcr.vcr_code}: ${vcr.name}`;
  await client.from('user_tasks').insert({
    user_id: oraEngineer.user_id,
    title: `Finalize VCR – ${vcrLabel}`,
    description: `All discipline assurance statements and VCR checklist items are complete for ${vcrLabel}. Add the Interdisciplinary Assurance Statement and submit the VCR for approval.`,
    type: 'vcr_finalization',
    priority: 'High',
    status: 'pending',
    metadata: {
      vcr_id: handoverPointId,
      vcr_code: vcr.vcr_code,
      vcr_name: vcr.name,
      project_id: plan.project_id,
      project_code: plan.project_code,
      action: 'add_interdisciplinary_and_submit',
      source: 'vcr_assurance',
    },
  });

  queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
  console.log(`[VCR Assurance] Created finalization task for ${vcrLabel}`);
}

/** Exported alias for external callers (e.g., VCRItemDetailSheet) */
export const checkVCRFinalizationReadiness = checkAndCreateFinalizationTask;

export interface DisciplineAssurance {
  id: string;
  handover_point_id: string;
  discipline_role_id: string | null;
  discipline_role_name: string;
  reviewer_user_id: string | null;
  assurance_statement: string;
  statement_type: 'discipline' | 'interdisciplinary';
  submitted_at: string;
  created_at: string;
  updated_at: string;
  reviewer?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ExpectedDiscipline {
  role_id: string;
  role_name: string;
  submitted: boolean;
  assurance?: DisciplineAssurance;
}

export const useVCRDisciplineAssurance = (handoverPointId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ['vcr-discipline-assurance', handoverPointId];

  // Fetch assurance statements
  const { data: statements = [], isLoading: isLoadingStatements } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!handoverPointId) return [];

      const { data, error } = await supabase
        .from('vcr_discipline_assurance')
        .select('*')
        .eq('handover_point_id', handoverPointId)
        .order('submitted_at', { ascending: true });

      if (error) throw error;

      // Enrich with reviewer profiles
      const userIds = (data || [])
        .map(s => s.reviewer_user_id)
        .filter(Boolean) as string[];

      let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (profileData) {
          profiles = Object.fromEntries(
            profileData.map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
          );
        }
      }

      return (data || []).map(s => ({
        ...s,
        statement_type: s.statement_type as 'discipline' | 'interdisciplinary',
        reviewer: s.reviewer_user_id ? profiles[s.reviewer_user_id] || null : null,
      })) as DisciplineAssurance[];
    },
    enabled: !!handoverPointId,
  });

  // Fetch expected disciplines from VCR prerequisites
  const { data: expectedDisciplines = [], isLoading: isLoadingDisciplines } = useQuery({
    queryKey: ['vcr-expected-disciplines', handoverPointId],
    queryFn: async () => {
      if (!handoverPointId) return [];

      const { data, error } = await supabase
        .from('p2a_vcr_prerequisites')
        .select('delivering_party_id, delivering_party_name')
        .eq('handover_point_id', handoverPointId)
        .not('delivering_party_id', 'is', null);

      if (error) throw error;

      // Deduplicate by delivering_party_id
      const seen = new Map<string, string>();
      for (const item of data || []) {
        if (item.delivering_party_id && !seen.has(item.delivering_party_id)) {
          seen.set(item.delivering_party_id, item.delivering_party_name || 'Unknown');
        }
      }

      return Array.from(seen.entries()).map(([roleId, roleName]) => {
        const assurance = statements.find(
          s => s.statement_type === 'discipline' && (s.discipline_role_id === roleId || s.discipline_role_name === roleName)
        );
        return {
          role_id: roleId,
          role_name: roleName,
          submitted: !!assurance,
          assurance,
        } as ExpectedDiscipline;
      });
    },
    enabled: !!handoverPointId && !isLoadingStatements,
  });

  // Submit/upsert an assurance statement
  const submitMutation = useMutation({
    mutationFn: async (params: {
      handoverPointId: string;
      disciplineRoleId?: string | null;
      disciplineRoleName: string;
      assuranceStatement: string;
      statementType: 'discipline' | 'interdisciplinary';
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      const { data, error } = await supabase
        .from('vcr_discipline_assurance')
        .upsert(
          {
            handover_point_id: params.handoverPointId,
            discipline_role_id: params.disciplineRoleId || null,
            discipline_role_name: params.disciplineRoleName,
            reviewer_user_id: userId,
            assurance_statement: params.assuranceStatement,
            statement_type: params.statementType,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'handover_point_id,discipline_role_name' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['vcr-expected-disciplines', handoverPointId] });

      // When a discipline statement is submitted, check if all are now complete
      // If so, auto-create a task for the Snr ORA Eng to finalize VCR
      if (variables.statementType === 'discipline' && handoverPointId) {
        try {
          await checkAndCreateFinalizationTask(handoverPointId, queryClient);
        } catch (e) {
          console.warn('[VCR Assurance] Failed to check finalization task:', e);
        }
      }
    },
  });

  const interdisciplinaryStatement = statements.find(s => s.statement_type === 'interdisciplinary');
  const disciplineStatements = statements.filter(s => s.statement_type === 'discipline');

  return {
    statements,
    disciplineStatements,
    interdisciplinaryStatement,
    expectedDisciplines,
    isLoading: isLoadingStatements || isLoadingDisciplines,
    submitAssurance: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
};
