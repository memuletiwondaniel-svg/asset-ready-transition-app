import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { WizardSystem } from '@/components/widgets/p2a-wizard/steps/SystemsImportStep';
import { WizardVCR } from '@/components/widgets/p2a-wizard/steps/VCRCreationStep';
import { WizardPhase } from '@/components/widgets/p2a-wizard/steps/PhasesStep';
import { WizardApprover } from '@/components/widgets/p2a-wizard/steps/ApprovalSetupStep';

export interface P2APlanWizardState {
  systems: WizardSystem[];
  vcrs: WizardVCR[];
  phases: WizardPhase[];
  approvers: WizardApprover[];
  mappings: Record<string, string[]>; // vcrId -> systemIds[]
  vcrPhaseAssignments: Record<string, string>; // vcrId -> phaseId
  vcrOrder: string[];
}

const initialState: P2APlanWizardState = {
  systems: [],
  vcrs: [],
  phases: [],
  approvers: [],
  mappings: {},
  vcrPhaseAssignments: {},
  vcrOrder: [],
};

/**
 * Load saved wizard data from the database and reconstruct the wizard state.
 */
async function loadDraftFromDatabase(projectId: string): Promise<{ state: P2APlanWizardState; hasDraft: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Get the plan
  const { data: plan } = await client
    .from('p2a_handover_plans')
    .select('id, status')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!plan) {
    return { state: initialState, hasDraft: false };
  }

  const planId = plan.id;

  // Load systems
  const { data: dbSystems } = await client
    .from('p2a_systems')
    .select('id, system_id, name, is_hydrocarbon, completion_percentage')
    .eq('handover_plan_id', planId);

  const systemIds = (dbSystems || []).map((s: any) => s.id);

  // Load subsystems for all systems in one query
  let subsystemsBySystem: Record<string, any[]> = {};
  if (systemIds.length > 0) {
    const { data: dbSubsystems } = await client
      .from('p2a_subsystems')
      .select('id, system_id, subsystem_id, name, completion_percentage')
      .in('system_id', systemIds);

    for (const sub of (dbSubsystems || [])) {
      if (!subsystemsBySystem[sub.system_id]) {
        subsystemsBySystem[sub.system_id] = [];
      }
      subsystemsBySystem[sub.system_id].push(sub);
    }
  }

  const systems: WizardSystem[] = (dbSystems || []).map((s: any) => ({
    id: s.id,
    system_id: s.system_id,
    name: s.name,
    description: '',
    is_hydrocarbon: s.is_hydrocarbon ?? false,
    progress: s.completion_percentage ?? 0,
    subsystems: (subsystemsBySystem[s.id] || []).map((sub: any) => ({
      id: sub.id,
      system_id: sub.subsystem_id,
      name: sub.name,
      progress: sub.completion_percentage ?? 0,
    })),
  }));

  // Load phases
  const { data: dbPhases } = await client
    .from('p2a_project_phases')
    .select('id, name, description, display_order')
    .eq('handover_plan_id', planId)
    .order('display_order', { ascending: true });

  const phases: WizardPhase[] = (dbPhases || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    display_order: p.display_order,
    milestoneIds: [],
  }));

  // Load VCRs (handover points)
  const { data: dbVCRs } = await client
    .from('p2a_handover_points')
    .select('id, vcr_code, name, description, phase_id')
    .eq('handover_plan_id', planId)
    .order('vcr_code', { ascending: true });

  const vcrs: WizardVCR[] = (dbVCRs || []).map((v: any) => ({
    id: v.id,
    name: v.name,
    reason: v.description || '',
    targetMilestone: '',
    code: v.vcr_code,
  }));

  // Build VCR-phase assignments
  const vcrPhaseAssignments: Record<string, string> = {};
  for (const v of (dbVCRs || [])) {
    if (v.phase_id) {
      vcrPhaseAssignments[v.id] = v.phase_id;
    }
  }

  // Load system-VCR mappings and convert to UI-compatible keys
  const mappings: Record<string, string[]> = {};
  if (vcrs.length > 0) {
    const vcrIds = vcrs.map(v => v.id);
    const { data: dbMappings } = await client
      .from('p2a_handover_point_systems')
      .select('handover_point_id, system_id, subsystem_id')
      .in('handover_point_id', vcrIds);

    // Build lookups
    const systemById = new Map(systems.map(s => [s.id, s]));
    // Build subsystem DB UUID → text ID lookup from raw DB data
    const subsystemUUIDToTextId = new Map<string, { textId: string; parentSystemId: string }>();
    for (const [parentDbId, subs] of Object.entries(subsystemsBySystem)) {
      // Find the wizard system that corresponds to this DB system
      const wizardSystem = systems.find(s => s.id === parentDbId);
      if (wizardSystem) {
        for (const sub of subs) {
          subsystemUUIDToTextId.set(sub.id, { textId: sub.subsystem_id, parentSystemId: wizardSystem.id });
        }
      }
    }

    for (const m of (dbMappings || [])) {
      if (!mappings[m.handover_point_id]) {
        mappings[m.handover_point_id] = [];
      }

      if (m.subsystem_id) {
        // Specific subsystem mapping — create the exact composite key
        const lookup = subsystemUUIDToTextId.get(m.subsystem_id);
        if (lookup) {
          const compositeKey = `${lookup.parentSystemId}::sub::${lookup.textId}`;
          if (!mappings[m.handover_point_id].includes(compositeKey)) {
            mappings[m.handover_point_id].push(compositeKey);
          }
        }
      } else {
        // Full system mapping (no subsystem)
        const system = systemById.get(m.system_id);
        if (system && system.subsystems && system.subsystems.length > 0) {
          // Expand to all subsystem composite keys
          for (const sub of system.subsystems) {
            const compositeKey = `${system.id}::sub::${sub.system_id}`;
            if (!mappings[m.handover_point_id].includes(compositeKey)) {
              mappings[m.handover_point_id].push(compositeKey);
            }
          }
        } else {
          // System without subsystems — use raw ID
          mappings[m.handover_point_id].push(m.system_id);
        }
      }
    }
  }

  // Load approvers
  const { data: dbApprovers } = await client
    .from('p2a_handover_approvers')
    .select('id, role_name, display_order, user_id')
    .eq('handover_id', planId)
    .order('display_order', { ascending: true });

  const approvers: WizardApprover[] = (dbApprovers || []).map((a: any) => ({
    id: a.id,
    role_name: a.role_name,
    display_order: a.display_order,
    user_id: a.user_id || undefined,
  }));

  return {
    state: {
      systems,
      vcrs,
      phases,
      approvers,
      mappings,
      vcrPhaseAssignments,
      vcrOrder: vcrs.map(v => v.id),
    },
    hasDraft: true,
  };
}

/**
 * Core save logic that persists the full wizard state to the database.
 * Used by both saveDraft and submitForApproval.
 */
async function persistPlanToDatabase(
  projectId: string,
  projectCode: string,
  state: P2APlanWizardState,
  status: 'DRAFT' | 'ACTIVE',
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  // Check if plan already exists
  const { data: existingPlan } = await client
    .from('p2a_handover_plans')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  let planId: string;

  if (existingPlan) {
    planId = existingPlan.id;
    await client
      .from('p2a_handover_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', planId);
  } else {
    const { data: newPlan, error: planError } = await client
      .from('p2a_handover_plans')
      .insert({
        project_id: projectId,
        name: `P2A Handover Plan - ${projectCode}`,
        status,
        created_by: user.id,
      })
      .select()
      .single();

    if (planError) throw planError;
    planId = newPlan.id;
  }

  // Save systems: delete existing (and their subsystems) then re-insert
  const systemIdMap: Record<string, string> = {};
  // Maps composite wizard keys (systemId::sub::subSystemId) → DB subsystem UUID
  const subsystemIdMap: Record<string, string> = {};

  // Get existing system UUIDs to delete their subsystems first
  const { data: existingSystems } = await client
    .from('p2a_systems')
    .select('id')
    .eq('handover_plan_id', planId);

  if (existingSystems && existingSystems.length > 0) {
    const existingSystemIds = existingSystems.map((s: any) => s.id);
    await client.from('p2a_subsystems').delete().in('system_id', existingSystemIds);
  }

  // Delete existing systems for this plan
  await client.from('p2a_systems').delete().eq('handover_plan_id', planId);

  if (state.systems.length > 0) {
    for (const system of state.systems) {
      const { data: savedSystem, error } = await client
        .from('p2a_systems')
        .insert({
          handover_plan_id: planId,
          system_id: system.system_id,
          name: system.name,
          is_hydrocarbon: system.is_hydrocarbon,
          completion_percentage: Math.round(system.progress || 0),
        })
        .select()
        .single();

      if (!error && savedSystem) {
        systemIdMap[system.id] = savedSystem.id;

        // Insert subsystems for this system and build subsystemIdMap
        if (system.subsystems && system.subsystems.length > 0) {
          const subsystemRecords = system.subsystems.map((sub: any) => ({
            system_id: savedSystem.id,
            subsystem_id: sub.system_id,
            name: sub.name,
            completion_percentage: Math.round(sub.progress || 0),
          }));
          const { data: savedSubs } = await client
            .from('p2a_subsystems')
            .insert(subsystemRecords)
            .select();

          // Build composite key → DB UUID map
          if (savedSubs) {
            for (const savedSub of savedSubs) {
              const compositeKey = `${system.id}::sub::${savedSub.subsystem_id}`;
              subsystemIdMap[compositeKey] = savedSub.id;
            }
          }
        }
      }
    }
  }

  // Save phases and track ID mapping
  const phaseIdMap: Record<string, string> = {};

  if (state.phases.length > 0) {
    await client.from('p2a_project_phases').delete().eq('handover_plan_id', planId);

    for (const phase of state.phases) {
      const { data: savedPhase, error } = await client
        .from('p2a_project_phases')
        .insert({
          handover_plan_id: planId,
          name: phase.name,
          description: phase.description || null,
          display_order: phase.display_order,
        })
        .select()
        .single();

      if (!error && savedPhase) {
        phaseIdMap[phase.id] = savedPhase.id;
      }
    }
  }

  // Delete existing VCRs and their system mappings
  const { data: existingVCRs } = await client
    .from('p2a_handover_points')
    .select('id')
    .eq('handover_plan_id', planId);

  if (existingVCRs && existingVCRs.length > 0) {
    const existingVCRIds = existingVCRs.map((v: any) => v.id);
    await client.from('p2a_handover_point_systems')
      .delete()
      .in('handover_point_id', existingVCRIds);
    await client.from('p2a_handover_points')
      .delete()
      .eq('handover_plan_id', planId);
  }

  // Create VCRs using the same code format as the wizard UI
  // Format: VCR-{projectCode}-{seq} e.g. VCR-DP300-001
  const cleanProjectCode = projectCode.replace(/-/g, '');

  for (let i = 0; i < state.vcrs.length; i++) {
    const vcr = state.vcrs[i];
    const phaseId = state.vcrPhaseAssignments[vcr.id];
    const realPhaseId = phaseId ? phaseIdMap[phaseId] : null;

    // Use the wizard-generated code if available, otherwise generate it
    const vcrCode = vcr.code || `VCR-${cleanProjectCode}-${String(i + 1).padStart(3, '0')}`;

    const { data: savedVCR, error } = await client
      .from('p2a_handover_points')
      .insert({
        handover_plan_id: planId,
        phase_id: realPhaseId,
        vcr_code: vcrCode,
        name: vcr.name,
        description: vcr.reason || null,
        position_x: 0,
        position_y: i * 100,
        status: 'PENDING',
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && savedVCR) {
      const mappedKeys = state.mappings[vcr.id] || [];


      if (mappedKeys.length > 0) {
        // Use a dedup map keyed by "systemId|subsystemId" to avoid unique constraint violations
        const dedupMap = new Map<string, {
          handover_point_id: string;
          system_id: string;
          subsystem_id?: string;
          assigned_by: string;
        }>();

        for (const key of mappedKeys) {
          if (key.includes('::sub::')) {
            // Subsystem-level mapping
            const parentId = key.split('::sub::')[0];
            const dbSystemId = systemIdMap[parentId];
            const dbSubsystemId = subsystemIdMap[key];
            if (dbSystemId) {
              const dedupKey = `${dbSystemId}|${dbSubsystemId || ''}`;
              dedupMap.set(dedupKey, {
                handover_point_id: savedVCR.id,
                system_id: dbSystemId,
                subsystem_id: dbSubsystemId || undefined,
                assigned_by: user.id,
              });
            }
          } else {
            // Full system mapping
            const dbSystemId = systemIdMap[key];
            if (dbSystemId) {
              const dedupKey = `${dbSystemId}|`;
              dedupMap.set(dedupKey, {
                handover_point_id: savedVCR.id,
                system_id: dbSystemId,
                assigned_by: user.id,
              });
            }
          }
        }

        const systemAssignments = Array.from(dedupMap.values());
        if (systemAssignments.length > 0) {
          const { error: assignError } = await client.from('p2a_handover_point_systems').insert(systemAssignments);
          if (assignError) {
            console.error(`[P2A-PERSIST] Insert error for VCR "${vcr.name}":`, assignError);
          }
        }
      }
    }
  }

  // Save approvers
  if (state.approvers.length > 0) {
    await client.from('p2a_handover_approvers').delete().eq('handover_id', planId);

    const approverRecords = state.approvers.map(a => ({
      handover_id: planId,
      role_name: a.role_name,
      display_order: a.display_order,
      status: 'PENDING' as const,
    }));

    await client.from('p2a_handover_approvers').insert(approverRecords);
  }

  // Verify the plan is readable
  const { data: verified } = await client
    .from('p2a_handover_plans')
    .select('id')
    .eq('id', planId)
    .single();

  if (!verified) {
    throw new Error('Plan saved but not readable - check RLS policies');
  }

  return planId;
}

export function useP2APlanWizard(projectId: string, projectCode: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<P2APlanWizardState>(initialState);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const updateState = useCallback(<K extends keyof P2APlanWizardState>(
    key: K,
    value: P2APlanWizardState[K]
  ) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
    setDraftLoaded(false);
  }, []);

  /**
   * Load a saved draft from the database into the wizard state.
   * Returns true if a draft was found and loaded, false otherwise.
   */
  const loadDraft = useCallback(async (): Promise<boolean> => {
    try {
      const { state: loadedState, hasDraft } = await loadDraftFromDatabase(projectId);
      if (hasDraft) {
        setState(loadedState);
        setDraftLoaded(true);
      }
      return hasDraft;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return false;
    }
  }, [projectId]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['p2a-handover-plan'] });
    queryClient.invalidateQueries({ queryKey: ['p2a-plan-by-project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-vcrs', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-orp-plans', projectId] });
    // Invalidate workspace queries so systems/VCRs reflect wizard assignments
    queryClient.invalidateQueries({ queryKey: ['p2a-systems'] });
    queryClient.invalidateQueries({ queryKey: ['p2a-handover-points'] });
    queryClient.invalidateQueries({ queryKey: ['p2a-phases'] });
    queryClient.invalidateQueries({ queryKey: ['p2a-subsystems'] });
  };

  const saveDraft = useMutation({
    mutationFn: async () => {
      return persistPlanToDatabase(projectId, projectCode, state, 'DRAFT');
    },
    onSuccess: () => {
      invalidateQueries();
      toast({
        title: 'Draft saved',
        description: 'Your P2A Handover Plan has been saved as draft.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving draft',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const submitForApproval = useMutation({
    mutationFn: async () => {
      const planId = await persistPlanToDatabase(projectId, projectCode, state, 'ACTIVE');

      // Create user_tasks for Phase 1 approvers (display_order 1-3)
      // Phase 2 approvers (display_order 4-5) get tasks once Phase 1 is complete
      const phase1Approvers = state.approvers.filter(a => a.display_order <= 3 && a.user_id);

      if (phase1Approvers.length > 0) {
        const client = supabase as any;
        const taskRecords = phase1Approvers.map(approver => ({
          user_id: approver.user_id!,
          title: `Review & Approve P2A Handover Plan – ${projectCode}`,
          description: `You have been assigned as ${approver.role_name} to review and approve the P2A Handover Plan for project ${projectCode}. Please review the plan and provide your approval.`,
          type: 'approval',
          priority: 'high',
          status: 'pending',
          metadata: {
            plan_id: planId,
            project_id: projectId,
            project_code: projectCode,
            approver_role: approver.role_name,
            approval_phase: 1,
            source: 'p2a_handover',
          },
        }));

        const { error: taskError } = await client.from('user_tasks').insert(taskRecords);
        if (taskError) {
          console.error('[P2A] Failed to create approval tasks:', taskError);
        }
      }

      return planId;
    },
    onSuccess: () => {
      invalidateQueries();
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      toast({
        title: 'Plan submitted for approval',
        description: 'Approvers have been notified and can review the plan.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error submitting plan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteDraft = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      // Get the plan
      const { data: plan } = await client
        .from('p2a_handover_plans')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (!plan) throw new Error('No draft plan found');

      const planId = plan.id;

      // Delete in order: system mappings -> VCRs -> phases -> systems -> approvers -> plan
      const { data: existingVCRs } = await client
        .from('p2a_handover_points')
        .select('id')
        .eq('handover_plan_id', planId);

      if (existingVCRs && existingVCRs.length > 0) {
        const vcrIds = existingVCRs.map((v: any) => v.id);
        await client.from('p2a_handover_point_systems').delete().in('handover_point_id', vcrIds);
        await client.from('p2a_handover_points').delete().eq('handover_plan_id', planId);
      }

      await client.from('p2a_project_phases').delete().eq('handover_plan_id', planId);
      await client.from('p2a_systems').delete().eq('handover_plan_id', planId);
      await client.from('p2a_handover_approvers').delete().eq('handover_id', planId);
      await client.from('p2a_handover_plans').delete().eq('id', planId);

      return planId;
    },
    onSuccess: () => {
      invalidateQueries();
      setState(initialState);
      setDraftLoaded(false);
      toast({
        title: 'Draft deleted',
        description: 'Your P2A Handover Plan draft has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting draft',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    state,
    updateState,
    resetState,
    loadDraft,
    draftLoaded,
    saveDraft: saveDraft.mutateAsync,
    submitForApproval: submitForApproval.mutateAsync,
    deleteDraft: deleteDraft.mutateAsync,
    isSaving: saveDraft.isPending,
    isSubmitting: submitForApproval.isPending,
    isDeleting: deleteDraft.isPending,
  };
}
