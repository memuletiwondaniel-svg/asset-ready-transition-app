import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getLevelFromProgress } from '@/components/admin-tools/agents/training/competencyLevels';
import type { AgentProfile } from '@/data/agentProfiles';

export interface CompetencyArea {
  id: string;
  agent_code: string;
  name: string;
  description: string | null;
  progress: number;
  status: string;
  source: string;
  ai_assessment_notes: string | null;
  linked_session_ids: string[];
  last_assessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetencyUpdate {
  id: string;
  competency_id: string;
  session_id: string | null;
  trigger_type: string;
  previous_progress: number | null;
  new_progress: number | null;
  assessment_notes: string | null;
  created_at: string;
}

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function useAgentCompetencies(agentCode: string, agent?: AgentProfile) {
  const queryClient = useQueryClient();
  const queryKey = ['agent-competencies', agentCode];

  const { data: competencies = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const user = await getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('agent_competency_areas' as any)
        .select('*')
        .eq('agent_code', agentCode)
        .order('created_at', { ascending: true });

      if (error) throw error;
      let rows = (data || []) as unknown as CompetencyArea[];

      // Seed from specializations if no rows exist
      if (rows.length === 0 && agent?.specializations?.length) {
        const seeds = agent.specializations.map(spec => ({
          agent_code: agentCode,
          name: spec,
          progress: 0,
          status: 'not_started',
          source: 'seeded',
        }));
        const { data: inserted, error: insertErr } = await supabase
          .from('agent_competency_areas' as any)
          .insert(seeds)
          .select('*');
        if (!insertErr && inserted) {
          rows = inserted as unknown as CompetencyArea[];
        }
      }

      return rows;
    },
  });

  const overallProgress = competencies.length > 0
    ? Math.round(competencies.reduce((sum, c) => sum + c.progress, 0) / competencies.length)
    : 0;

  const createCompetency = useMutation({
    mutationFn: async (input: { name: string; description?: string; source?: string }) => {
      const { data, error } = await supabase
        .from('agent_competency_areas' as any)
        .insert({
          agent_code: agentCode,
          name: input.name,
          description: input.description || null,
          progress: 0,
          status: 'not_started',
          source: input.source || 'user_defined',
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as CompetencyArea;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateCompetency = useMutation({
    mutationFn: async (input: { id: string; updates: Partial<CompetencyArea> }) => {
      const { data, error } = await supabase
        .from('agent_competency_areas' as any)
        .update(input.updates as any)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as CompetencyArea;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteCompetency = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_competency_areas' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Merge: combine two competencies into one, inheriting session IDs
  const mergeCompetencies = useMutation({
    mutationFn: async (input: { sourceA: CompetencyArea; sourceB: CompetencyArea; newName: string; newDescription?: string; estimatedProgress?: number }) => {
      const mergedSessionIds = [...new Set([
        ...(input.sourceA.linked_session_ids || []),
        ...(input.sourceB.linked_session_ids || []),
      ])];
      const progress = input.estimatedProgress ?? Math.round((input.sourceA.progress + input.sourceB.progress) / 2);
      const status = getLevelFromProgress(progress).key;

      // Insert new merged row
      const { data: newRow, error: insertErr } = await supabase
        .from('agent_competency_areas' as any)
        .insert({
          agent_code: agentCode,
          name: input.newName,
          description: input.newDescription || null,
          progress,
          status,
          source: 'user_defined',
          linked_session_ids: mergedSessionIds,
        })
        .select('*')
        .single();
      if (insertErr) throw insertErr;

      // Insert audit row
      await supabase.from('agent_competency_updates' as any).insert({
        competency_id: (newRow as any).id,
        trigger_type: 'new_competency',
        previous_progress: null,
        new_progress: progress,
        assessment_notes: `Merged from "${input.sourceA.name}" and "${input.sourceB.name}"`,
      });

      // Delete source rows
      await supabase.from('agent_competency_areas' as any).delete().eq('id', input.sourceA.id);
      await supabase.from('agent_competency_areas' as any).delete().eq('id', input.sourceB.id);

      return newRow as unknown as CompetencyArea;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Update description + trigger reassessment (two-step chain)
  const updateDescriptionAndReassess = useMutation({
    mutationFn: async (input: { id: string; newDescription: string }) => {
      // Step 1: Update description
      await supabase
        .from('agent_competency_areas' as any)
        .update({ description: input.newDescription } as any)
        .eq('id', input.id);

      // Step 2: Trigger assessment edge function
      const { data, error } = await supabase.functions.invoke('assess-agent-competencies', {
        body: {
          agent_code: agentCode,
          trigger_type: 'description_change',
          target_competency_id: input.id,
        },
      });
      if (error) throw error;
      
      // Check response for errors
      const result = data as any;
      if (result?.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Fetch updates for a specific competency
  const useCompetencyUpdates = (competencyId: string) => {
    return useQuery({
      queryKey: ['competency-updates', competencyId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('agent_competency_updates' as any)
          .select('*')
          .eq('competency_id', competencyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as unknown as CompetencyUpdate[];
      },
      enabled: !!competencyId,
    });
  };

  return {
    competencies,
    isLoading,
    overallProgress,
    refetch,
    createCompetency,
    updateCompetency,
    deleteCompetency,
    mergeCompetencies,
    updateDescriptionAndReassess,
    useCompetencyUpdates,
  };
}
