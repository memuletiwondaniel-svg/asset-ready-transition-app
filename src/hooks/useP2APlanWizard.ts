import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
    // Update status
    await client
      .from('p2a_handover_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', planId);
  } else {
    // Create new plan
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

  // Save systems and track ID mapping
  const systemIdMap: Record<string, string> = {};

  if (state.systems.length > 0) {
    for (const system of state.systems) {
      const { data: savedSystem, error } = await client
        .from('p2a_systems')
        .upsert({
          handover_plan_id: planId,
          system_id: system.system_id,
          name: system.name,
          is_hydrocarbon: system.is_hydrocarbon,
        }, { onConflict: 'handover_plan_id,system_id' })
        .select()
        .single();

      if (!error && savedSystem) {
        systemIdMap[system.id] = savedSystem.id;
      }
    }
  }

  // Save phases and track ID mapping
  const phaseIdMap: Record<string, string> = {};

  if (state.phases.length > 0) {
    // Delete existing phases
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

  // Delete existing VCRs (handover points) and their system mappings for this plan
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

  // Create VCRs (handover points)
  for (let i = 0; i < state.vcrs.length; i++) {
    const vcr = state.vcrs[i];
    const phaseId = state.vcrPhaseAssignments[vcr.id];
    const realPhaseId = phaseId ? phaseIdMap[phaseId] : null;

    // Generate VCR code
    const { data: vcrCode } = await supabase.rpc('generate_vcr_code', {
      p_project_code: projectCode,
    });

    const { data: savedVCR, error } = await client
      .from('p2a_handover_points')
      .insert({
        handover_plan_id: planId,
        phase_id: realPhaseId,
        vcr_code: vcrCode || `VCR-${String(i + 1).padStart(3, '0')}-${projectCode}`,
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
      // Create system mappings for this VCR
      const mappedKeys = state.mappings[vcr.id] || [];
      if (mappedKeys.length > 0) {
        const parentSystemIds = new Set<string>();
        for (const key of mappedKeys) {
          const parentId = key.includes('::sub::') ? key.split('::sub::')[0] : key;
          parentSystemIds.add(parentId);
        }

        const systemAssignments = Array.from(parentSystemIds)
          .filter(tempId => systemIdMap[tempId])
          .map(tempId => ({
            handover_point_id: savedVCR.id,
            system_id: systemIdMap[tempId],
            assigned_by: user.id,
          }));

        if (systemAssignments.length > 0) {
          await client.from('p2a_handover_point_systems').insert(systemAssignments);
        }
      }
    }
  }

  // Save approvers
  if (state.approvers.length > 0) {
    // Delete existing approvers
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

  const updateState = useCallback(<K extends keyof P2APlanWizardState>(
    key: K,
    value: P2APlanWizardState[K]
  ) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['p2a-handover-plan'] });
    queryClient.invalidateQueries({ queryKey: ['p2a-plan-by-project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-vcrs', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-orp-plans', projectId] });
  };

  // Save draft (creates plan without submitting for approval)
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

  // Submit for approval (creates plan and triggers workflow)
  const submitForApproval = useMutation({
    mutationFn: async () => {
      return persistPlanToDatabase(projectId, projectCode, state, 'ACTIVE');
    },
    onSuccess: () => {
      invalidateQueries();
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

  return {
    state,
    updateState,
    resetState,
    saveDraft: saveDraft.mutateAsync,
    submitForApproval: submitForApproval.mutateAsync,
    isSaving: saveDraft.isPending,
    isSubmitting: submitForApproval.isPending,
  };
}
