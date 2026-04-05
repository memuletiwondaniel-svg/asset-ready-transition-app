import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FredKPI {
  kpi_name: string;
  kpi_value: number;
  sample_size: number;
  metadata: any;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface FredInteraction {
  id: string;
  query_text: string | null;
  tool_used: string | null;
  project_code: string | null;
  subsystem_code: string | null;
  outcome: string;
  result_count: number;
  latency_ms: number;
  error_details: string | null;
  created_at: string;
}

export interface FredResolutionFailure {
  id: string;
  query_text: string;
  cleaned_query: string;
  closest_matches: any[];
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved: boolean;
  resolved_as: string | null;
  created_at: string;
}

export function useFredLatestKPIs() {
  return useQuery({
    queryKey: ['fred-latest-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fred_kpi_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const latest = new Map<string, FredKPI>();
      for (const row of (data || []) as unknown as FredKPI[]) {
        if (!latest.has(row.kpi_name)) latest.set(row.kpi_name, row);
      }
      return Object.fromEntries(latest);
    },
  });
}

export function useFredInteractions(limit = 50) {
  return useQuery({
    queryKey: ['fred-interactions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fred_interaction_metrics')
        .select('id, query_text, tool_used, project_code, subsystem_code, outcome, result_count, latency_ms, error_details, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as FredInteraction[];
    },
  });
}

export function useFredResolutionFailures(unresolvedOnly = true) {
  return useQuery({
    queryKey: ['fred-resolution-failures', unresolvedOnly],
    queryFn: async () => {
      let query = supabase
        .from('fred_resolution_failures')
        .select('*')
        .order('occurrence_count', { ascending: false })
        .limit(50);
      if (unresolvedOnly) query = query.eq('resolved', false);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as FredResolutionFailure[];
    },
  });
}

export function useFredKPITrend(kpiName: string, days = 30) {
  return useQuery({
    queryKey: ['fred-kpi-trend', kpiName, days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('fred_kpi_snapshots')
        .select('kpi_value, sample_size, period_start, created_at')
        .eq('kpi_name', kpiName)
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as { kpi_value: number; sample_size: number; period_start: string; created_at: string }[];
    },
  });
}

// --- Training Knowledge Hooks ---

export interface FredTrainingQueueItem {
  id: string;
  file_path: string;
  category: string;
  status: string;
  priority: number;
  error_details: string | null;
  created_at: string;
}

export interface FredDomainKnowledge {
  id: string;
  category: string;
  knowledge_type: string;
  title: string;
  content: any;
  source_file: string | null;
  confidence: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface FredTrainingDocument {
  id: string;
  file_name: string;
  file_path: string;
  category: string;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export function useFredTrainingQueue() {
  return useQuery({
    queryKey: ['fred-training-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fred_training_queue')
        .select('*')
        .order('priority', { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as FredTrainingQueueItem[];
    },
  });
}

export function useFredDomainKnowledge() {
  return useQuery({
    queryKey: ['fred-domain-knowledge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fred_domain_knowledge')
        .select('*')
        .order('confidence', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as FredDomainKnowledge[];
    },
  });
}

export function useFredTrainingDocuments() {
  return useQuery({
    queryKey: ['fred-training-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fred_training_documents')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as FredTrainingDocument[];
    },
  });
}

export const FRED_TRAINING_CATEGORIES = [
  { value: 'losh_drawings', label: 'LOSH Drawings' },
  { value: 'completions_procedure', label: 'Completions Management Procedure' },
  { value: 'logic_way', label: 'The Logic Way' },
  { value: 'csu_masterclass', label: 'CSU Masterclass' },
  { value: 'blank_itrs', label: 'Blank ITRs' },
  { value: 'repetitive_failure', label: 'Managing Repetitive Failure' },
  { value: 'lessons_learnt', label: 'Commissioning Lessons Learnt' },
  { value: 'flaws_database', label: 'Flaws Database' },
  { value: 'csi_database', label: 'CSI Database' },
  { value: 'ctps', label: 'Commissioning Test Procedures (CTPs)' },
  { value: 'sat_fat_sit', label: 'SAT/FAT/SIT Reports' },
  { value: 'csu_plans', label: 'CSU Plans' },
  { value: 'hazop_omar', label: 'HAZOP/OMAR Reports' },
] as const;
