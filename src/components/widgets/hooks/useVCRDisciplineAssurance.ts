import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['vcr-expected-disciplines', handoverPointId] });
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
