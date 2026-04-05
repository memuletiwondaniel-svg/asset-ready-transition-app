import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SelmaKPI {
  kpi_name: string;
  kpi_value: number;
  sample_size: number;
  metadata: any;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface SelmaInteraction {
  id: string;
  query_text: string | null;
  intent_detected: string | null;
  outcome: string;
  total_latency_ms: number;
  cascade_depth: number;
  documents_found: number;
  tool_calls: string[];
  error_details: string | null;
  created_at: string;
}

export interface SelmaStrategy {
  id: string;
  strategy_type: string;
  trigger_pattern: string;
  learned_value: any;
  confidence: number;
  times_applied: number;
  success_rate: number;
  source: string;
  is_active: boolean;
  created_at: string;
}

export function useSelmaKPIs(days = 30) {
  return useQuery({
    queryKey: ['selma-kpis', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('selma_kpi_snapshots')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SelmaKPI[];
    },
  });
}

export function useSelmaLatestKPIs() {
  return useQuery({
    queryKey: ['selma-latest-kpis'],
    queryFn: async () => {
      // Get most recent snapshot per KPI
      const { data, error } = await supabase
        .from('selma_kpi_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      
      // Deduplicate: keep latest per kpi_name
      const latest = new Map<string, SelmaKPI>();
      for (const row of (data || []) as SelmaKPI[]) {
        if (!latest.has(row.kpi_name)) {
          latest.set(row.kpi_name, row);
        }
      }
      return Object.fromEntries(latest);
    },
  });
}

export function useSelmaInteractions(limit = 50) {
  return useQuery({
    queryKey: ['selma-interactions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('selma_interaction_metrics')
        .select('id, query_text, intent_detected, outcome, total_latency_ms, cascade_depth, documents_found, tool_calls, error_details, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as SelmaInteraction[];
    },
  });
}

export function useSelmaFailures(limit = 20) {
  return useQuery({
    queryKey: ['selma-failures', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('selma_interaction_metrics')
        .select('id, query_text, intent_detected, outcome, total_latency_ms, cascade_depth, error_details, created_at')
        .in('outcome', ['no_results', 'error', 'download_failed', 'timeout'])
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as SelmaInteraction[];
    },
  });
}

export function useSelmaStrategies() {
  return useQuery({
    queryKey: ['selma-strategies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('selma_learned_strategies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SelmaStrategy[];
    },
  });
}

export async function toggleStrategy(id: string, isActive: boolean) {
  const { error } = await supabase
    .from('selma_learned_strategies')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export function useSelmaKPITrend(kpiName: string, days = 30) {
  return useQuery({
    queryKey: ['selma-kpi-trend', kpiName, days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('selma_kpi_snapshots')
        .select('kpi_value, sample_size, period_start, created_at')
        .eq('kpi_name', kpiName)
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as { kpi_value: number; sample_size: number; period_start: string; created_at: string }[];
    },
  });
}

// ─── Knowledge Training hooks ───

export interface TrainingQueueItem {
  id: string;
  type_code: string;
  type_name: string | null;
  status: string;
  priority: number;
  documents_sampled: any;
  last_attempt: string | null;
  error_details: string | null;
  created_at: string;
}

export interface DocumentTypeKnowledge {
  id: string;
  type_code: string;
  type_name: string;
  purpose: string | null;
  typical_structure: string[];
  key_themes: string[];
  handover_relevance: string | null;
  cross_references: string[];
  selma_tips: string | null;
  confidence: number;
  documents_analyzed: number;
  last_trained_at: string | null;
  sample_projects: string[];
}

export interface ResolutionFailure {
  id: string;
  query_text: string;
  cleaned_query: string;
  levenshtein_top3: Array<{ acronym: string; type_code: string; full_name: string; similarity: string }>;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved: boolean;
  resolved_as: string | null;
  created_at: string;
}

export function useSelmaTrainingQueue() {
  return useQuery({
    queryKey: ['selma-training-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('selma_training_queue')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return (data || []) as TrainingQueueItem[];
    },
  });
}

export function useSelmaKnowledge() {
  return useQuery({
    queryKey: ['selma-knowledge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('selma_document_type_knowledge')
        .select('*')
        .order('confidence', { ascending: false });
      if (error) throw error;
      return (data || []) as DocumentTypeKnowledge[];
    },
  });
}

// ─── Resolution Failures (P2 self-improvement) ───

export function useSelmaResolutionFailures(unresolvedOnly = true) {
  return useQuery({
    queryKey: ['selma-resolution-failures', unresolvedOnly],
    queryFn: async () => {
      let query = supabase
        .from('selma_resolution_failures')
        .select('*')
        .order('occurrence_count', { ascending: false })
        .limit(50);
      if (unresolvedOnly) {
        query = query.eq('resolved', false);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ResolutionFailure[];
    },
  });
}

// ─── Audit Trail ───

export function useSelmaAuditTrail(limit = 50) {
  return useQuery({
    queryKey: ['selma-audit-trail', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('selma_interaction_metrics')
        .select('id, query_text, intent_detected, outcome, total_latency_ms, documents_found, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        query_text: string | null;
        intent_detected: string | null;
        outcome: string;
        total_latency_ms: number;
        documents_found: number;
        created_at: string;
      }>;
    },
  });
}
