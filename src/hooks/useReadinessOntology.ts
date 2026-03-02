import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReadinessNode {
  id: string;
  project_id: string;
  node_type: string;
  source_table: string;
  source_id: string;
  label: string;
  description: string | null;
  status: string;
  completion_pct: number;
  weight: number;
  module: string;
  phase: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReadinessDependency {
  id: string;
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  dependency_type: string;
  description: string | null;
  is_critical: boolean;
  created_at: string;
}

export interface ORIScore {
  id: string;
  project_id: string;
  overall_score: number;
  module_scores: Record<string, any>;
  node_count: number;
  completed_count: number;
  blocked_count: number;
  at_risk_count: number;
  confidence_level: string;
  snapshot_type: string;
  calculated_at: string;
}

export const useReadinessNodes = (projectId: string | null) => {
  return useQuery({
    queryKey: ['readiness-nodes', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('readiness_nodes')
        .select('*')
        .eq('project_id', projectId)
        .order('module', { ascending: true });
      if (error) throw error;
      return data as ReadinessNode[];
    },
    enabled: !!projectId,
  });
};

export const useReadinessDependencies = (projectId: string | null) => {
  return useQuery({
    queryKey: ['readiness-dependencies', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('readiness_dependencies')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data as ReadinessDependency[];
    },
    enabled: !!projectId,
  });
};

export const useORIScores = (projectId: string | null) => {
  return useQuery({
    queryKey: ['ori-scores', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('ori_scores')
        .select('*')
        .eq('project_id', projectId)
        .order('calculated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as ORIScore[];
    },
    enabled: !!projectId,
  });
};

export const useLatestORIScore = (projectId: string | null) => {
  return useQuery({
    queryKey: ['ori-score-latest', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('ori_scores')
        .select('*')
        .eq('project_id', projectId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ORIScore | null;
    },
    enabled: !!projectId,
  });
};

export const useSyncReadinessNodes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.rpc('sync_readiness_nodes', {
        p_project_id: projectId,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['readiness-nodes', projectId] });
      toast.success(`Synced ${count} readiness nodes`);
    },
    onError: (err: any) => {
      toast.error('Failed to sync readiness nodes: ' + err.message);
    },
  });
};

export const useCalculateORI = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, weightProfileId }: { projectId: string; weightProfileId?: string }) => {
      const { data, error } = await supabase.rpc('calculate_ori_score', {
        p_project_id: projectId,
        p_weight_profile_id: weightProfileId || null,
        p_snapshot_type: 'manual',
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ori-scores', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['ori-score-latest', variables.projectId] });
      toast.success(`ORI Score calculated: ${(data as any).overall_score}%`);
    },
    onError: (err: any) => {
      toast.error('Failed to calculate ORI: ' + err.message);
    },
  });
};

export const useAllProjectORIScores = () => {
  return useQuery({
    queryKey: ['ori-scores-all-projects'],
    queryFn: async () => {
      // Get latest score per project using distinct on
      const { data, error } = await supabase
        .from('ori_scores')
        .select('*, projects:project_id(id, project_title, project_id_prefix, project_id_number)')
        .order('calculated_at', { ascending: false });
      if (error) throw error;
      
      // Deduplicate: keep only the latest score per project
      const latestByProject = new Map<string, any>();
      for (const score of data || []) {
        if (!latestByProject.has(score.project_id)) {
          latestByProject.set(score.project_id, score);
        }
      }
      return Array.from(latestByProject.values());
    },
  });
};
