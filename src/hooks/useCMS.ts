import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CompetenceProfile = { id: string; name: string; code: string | null; description: string | null; created_at: string };
export type Competency = { id: string; title: string; description: string | null; created_at: string; knowledge_threshold: number; skill_threshold: number; mastery_threshold: number };
export type ProfileCompetencyLink = { id: string; profile_id: string; competency_id: string; weight: number; required_level: number | null };
export type ActivityType = 'vendor_training'|'ojt'|'assessment'|'certification'|'e_learning'|'mentoring'|'other';
export type ActivityRecordStatus = 'planned'|'in_progress'|'completed'|'failed';
export type CompetenceActivity = { id: string; competency_id: string; title: string; description: string | null; activity_type: ActivityType; provider: string | null; duration_hours: number | null; target_completion_date: string | null; weight: number; sequence_order: number; is_sequence_strict: boolean };
export type PersonActivityRecord = { id: string; activity_id: string; person_id: string; status: ActivityRecordStatus; completed_at: string | null; score: number | null; notes: string | null };
export type CMSPerson = { id: string; first_name: string; last_name: string; staff_id: string; plant_id: string | null; job_title: string | null; profile_id: string | null };
export type PersonProgress = { id: string; person_id: string; competency_id: string; progress: number; status: string; last_assessed_at: string | null; notes: string | null };
export type OverallProgress = { person_id: string; profile_id: string | null; overall_progress: number; total_competencies: number; competent_count: number };

const t = (name: string) => supabase.from(name as any);

export function useCompetenceProfiles() {
  return useQuery({
    queryKey: ['cms','profiles'],
    queryFn: async () => {
      const { data, error } = await t('competence_profiles').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as unknown as CompetenceProfile[];
    },
  });
}

export function useCompetencies() {
  return useQuery({
    queryKey: ['cms','competencies'],
    queryFn: async () => {
      const { data, error } = await t('competencies').select('*').order('title');
      if (error) throw error;
      return (data ?? []) as unknown as Competency[];
    },
  });
}

export function useProfileLinks() {
  return useQuery({
    queryKey: ['cms','profile-links'],
    queryFn: async () => {
      const { data, error } = await t('competence_profile_competencies').select('*');
      if (error) throw error;
      return (data ?? []) as unknown as ProfileCompetencyLink[];
    },
  });
}

export function useActivities() {
  return useQuery({
    queryKey: ['cms','activities'],
    queryFn: async () => {
      const { data, error } = await t('competence_activities').select('*').order('sequence_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CompetenceActivity[];
    },
  });
}

export function usePersonActivityRecords(personId: string | null) {
  return useQuery({
    queryKey: ['cms','person-activity-records', personId],
    enabled: !!personId,
    queryFn: async () => {
      const { data, error } = await t('person_activity_records').select('*').eq('person_id', personId!);
      if (error) throw error;
      return (data ?? []) as unknown as PersonActivityRecord[];
    },
  });
}

export function usePeople() {
  return useQuery({
    queryKey: ['cms','people'],
    queryFn: async () => {
      const { data, error } = await t('cms_people').select('*').order('last_name');
      if (error) throw error;
      return (data ?? []) as unknown as CMSPerson[];
    },
  });
}

export function useOverallProgress() {
  return useQuery({
    queryKey: ['cms','overall-progress'],
    queryFn: async () => {
      const { data, error } = await t('v_person_overall_progress').select('*');
      if (error) throw error;
      return (data ?? []) as unknown as OverallProgress[];
    },
  });
}

export function usePersonProgress(personId: string | null) {
  return useQuery({
    queryKey: ['cms','person-progress', personId],
    enabled: !!personId,
    queryFn: async () => {
      const { data, error } = await t('person_competency_progress').select('*').eq('person_id', personId!);
      if (error) throw error;
      return (data ?? []) as unknown as PersonProgress[];
    },
  });
}

// Mutations
export function useCMSMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cms'] });

  const addProfile = useMutation({
    mutationFn: async (input: { name: string; code?: string; description?: string }) => {
      const { error } = await t('competence_profiles').insert(input as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addCompetency = useMutation({
    mutationFn: async (input: { title: string; description?: string }) => {
      const { error } = await t('competencies').insert(input as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const linkCompetency = useMutation({
    mutationFn: async (input: { profile_id: string; competency_id: string; weight?: number }) => {
      const { error } = await t('competence_profile_competencies').insert(input as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const unlinkCompetency = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t('competence_profile_competencies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addActivity = useMutation({
    mutationFn: async (input: { competency_id: string; title: string; activity_type: ActivityType; description?: string; provider?: string; duration_hours?: number }) => {
      const { error } = await t('competence_activities').insert(input as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addPerson = useMutation({
    mutationFn: async (input: { first_name: string; last_name: string; staff_id: string; job_title?: string; profile_id?: string }) => {
      const { error } = await t('cms_people').insert(input as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const upsertProgress = useMutation({
    mutationFn: async (input: { person_id: string; competency_id: string; progress: number; status: string }) => {
      const { error } = await t('person_competency_progress').upsert(input as any, { onConflict: 'person_id,competency_id' });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addProfile, addCompetency, linkCompetency, unlinkCompetency, addActivity, addPerson, upsertProgress };
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  vendor_training: 'Vendor Training',
  ojt: 'On-the-Job Training',
  assessment: 'Assessment',
  certification: 'Certification',
  e_learning: 'e-Learning',
  mentoring: 'Mentoring',
  other: 'Other',
};

export function statusFromProgress(progress: number): string {
  if (progress >= 85) return 'competent';
  if (progress >= 50) return 'assessed';
  if (progress > 0) return 'in_progress';
  return 'not_started';
}
