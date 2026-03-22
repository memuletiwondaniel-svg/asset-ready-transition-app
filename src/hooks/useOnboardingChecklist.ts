import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';

export interface ChecklistItem {
  key: string;
  label: string;
  route: string;
}

const ROLE_CHECKLISTS: Record<string, ChecklistItem[]> = {
  'senior-ora-engineer': [
    { key: 'create-project', label: 'Create your first project', route: '/projects' },
    { key: 'build-ora-plan', label: 'Build an ORA Plan', route: '/operation-readiness' },
    { key: 'assign-team', label: 'Assign team members', route: '/projects' },
    { key: 'complete-activity', label: 'Complete your first activity', route: '/my-tasks' },
  ],
  'director': [
    { key: 'review-ori-dashboard', label: 'Review your ORI dashboard', route: '/executive-dashboard' },
    { key: 'check-approvals', label: 'Check pending approvals', route: '/my-tasks' },
    { key: 'ask-copilot', label: 'Ask Bob CoPilot a question', route: '/ask-orsh' },
  ],
  'ops-manager': [
    { key: 'review-pssrs', label: 'Review active PSSRs', route: '/pssr' },
    { key: 'check-p2a', label: 'Check P2A handover status', route: '/projects' },
    { key: 'view-tasks', label: 'View My Tasks', route: '/my-tasks' },
  ],
  'default': [
    { key: 'complete-profile', label: 'Complete your profile', route: '/users' },
    { key: 'explore-tasks', label: 'Explore My Tasks', route: '/my-tasks' },
    { key: 'ask-copilot', label: 'Ask Bob CoPilot a question', route: '/ask-orsh' },
  ],
};

const SENIOR_ORA_ROLES = ['Snr ORA Engr', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr. ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'];
const DIRECTOR_ROLES = ['P&E Director', 'P&M Director', 'HSE Director', 'HSSE Director', 'BNGL Director', 'CS Director', 'UQ Director', 'KAZ Director', 'NRNGL Director', 'Plant Director', 'Dep. Plant Director', 'Deputy Plant Director'];
const OPS_MANAGER_ROLES = ['Ops Manager', 'Operations Manager', 'Ops Mgr'];

function getChecklistForRole(role: string | null | undefined): ChecklistItem[] {
  if (!role) return ROLE_CHECKLISTS['default'];
  const lower = role.toLowerCase();
  if (SENIOR_ORA_ROLES.some(r => r.toLowerCase() === lower)) return ROLE_CHECKLISTS['senior-ora-engineer'];
  if (DIRECTOR_ROLES.some(r => r.toLowerCase() === lower)) return ROLE_CHECKLISTS['director'];
  if (OPS_MANAGER_ROLES.some(r => r.toLowerCase() === lower)) return ROLE_CHECKLISTS['ops-manager'];
  return ROLE_CHECKLISTS['default'];
}

export const useOnboardingChecklist = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { data: roleData, isLoading: roleLoading } = useCurrentUserRole();
  const queryClient = useQueryClient();

  const checklistItems = getChecklistForRole(roleData?.role);

  // Fetch onboarding_completed from profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['onboarding-completed', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', userId!)
        .single();
      return data;
    },
  });

  // Fetch progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['onboarding-progress', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await (supabase
        .from('user_onboarding_progress' as any)
        .select('checklist_key, completed')
        .eq('user_id', userId!) as any);
      return (data || []) as { checklist_key: string; completed: boolean }[];
    },
  });

  const completedKeys = new Set(
    (progress || []).filter(p => p.completed).map(p => p.checklist_key)
  );

  const completedCount = checklistItems.filter(i => completedKeys.has(i.key)).length;
  const allDone = completedCount === checklistItems.length;
  const isOnboardingDismissed = profileData?.onboarding_completed === true;

  // Toggle a checklist item
  const toggleItem = useMutation({
    mutationFn: async (key: string) => {
      const isCompleted = completedKeys.has(key);
      if (isCompleted) {
        // Unmark
        await (supabase
          .from('user_onboarding_progress' as any)
          .update({ completed: false, completed_at: null })
          .eq('user_id', userId!)
          .eq('checklist_key', key) as any);
      } else {
        // Upsert as completed
        await (supabase
          .from('user_onboarding_progress' as any)
          .upsert({
            user_id: userId,
            checklist_key: key,
            completed: true,
            completed_at: new Date().toISOString(),
          }, { onConflict: 'user_id,checklist_key' }) as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', userId] });
    },
  });

  // Dismiss onboarding permanently
  const dismissOnboarding = useMutation({
    mutationFn: async () => {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true } as any)
        .eq('user_id', userId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-completed', userId] });
    },
  });

  return {
    checklistItems,
    completedKeys,
    completedCount,
    totalCount: checklistItems.length,
    allDone,
    isOnboardingDismissed,
    isLoading: roleLoading || profileLoading || progressLoading,
    toggleItem: toggleItem.mutate,
    dismissOnboarding: dismissOnboarding.mutate,
  };
};
