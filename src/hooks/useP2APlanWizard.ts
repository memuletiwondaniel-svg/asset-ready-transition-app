import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { WizardSystem } from '@/components/widgets/p2a-wizard/steps/SystemsImportStep';
import { WizardVCR } from '@/components/widgets/p2a-wizard/steps/VCRCreationStep';
import { WizardPhase } from '@/components/widgets/p2a-wizard/steps/VCRSequencingStep';
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

  // Save draft (creates plan without submitting for approval)
  const saveDraft = useMutation({
    mutationFn: async () => {
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
      } else {
        // Create new plan
        const { data: newPlan, error: planError } = await client
          .from('p2a_handover_plans')
          .insert({
            project_id: projectId,
            name: `P2A Handover Plan - ${projectCode}`,
            status: 'DRAFT',
            created_by: user.id,
          })
          .select()
          .single();

        if (planError) throw planError;
        planId = newPlan.id;
      }

      // Save systems
      if (state.systems.length > 0) {
        const systemRecords = state.systems.map(s => ({
          handover_plan_id: planId,
          system_id: s.system_id,
          name: s.name,
          description: s.description || null,
          is_hydrocarbon: s.is_hydrocarbon,
        }));

        await client.from('p2a_systems').upsert(systemRecords, {
          onConflict: 'handover_plan_id,system_id',
        });
      }

      // Save phases
      if (state.phases.length > 0) {
        const phaseRecords = state.phases.map(p => ({
          handover_plan_id: planId,
          name: p.name,
          display_order: p.display_order,
        }));

        // Delete existing phases and recreate
        await client.from('p2a_phases').delete().eq('handover_plan_id', planId);
        await client.from('p2a_phases').insert(phaseRecords);
      }

      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-plan'] });
      queryClient.invalidateQueries({ queryKey: ['project-vcrs', projectId] });
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
        // Update status to IN_REVIEW
        await client
          .from('p2a_handover_plans')
          .update({ status: 'ACTIVE' }) // Using ACTIVE as IN_REVIEW
          .eq('id', planId);
      } else {
        // Create new plan with IN_REVIEW status
        const { data: newPlan, error: planError } = await client
          .from('p2a_handover_plans')
          .insert({
            project_id: projectId,
            name: `P2A Handover Plan - ${projectCode}`,
            status: 'ACTIVE', // Using ACTIVE as IN_REVIEW
            created_by: user.id,
          })
          .select()
          .single();

        if (planError) throw planError;
        planId = newPlan.id;
      }

      // Get or create systems with real IDs
      const systemIdMap: Record<string, string> = {};
      
      if (state.systems.length > 0) {
        for (const system of state.systems) {
          const { data: savedSystem, error } = await client
            .from('p2a_systems')
            .upsert({
              handover_plan_id: planId,
              system_id: system.system_id,
              name: system.name,
              description: system.description || null,
              is_hydrocarbon: system.is_hydrocarbon,
            }, { onConflict: 'handover_plan_id,system_id' })
            .select()
            .single();

          if (!error && savedSystem) {
            systemIdMap[system.id] = savedSystem.id;
          }
        }
      }

      // Save phases and get real IDs
      const phaseIdMap: Record<string, string> = {};
      
      if (state.phases.length > 0) {
        // Delete existing phases
        await client.from('p2a_phases').delete().eq('handover_plan_id', planId);
        
        for (const phase of state.phases) {
          const { data: savedPhase, error } = await client
            .from('p2a_phases')
            .insert({
              handover_plan_id: planId,
              name: phase.name,
              display_order: phase.display_order,
            })
            .select()
            .single();

          if (!error && savedPhase) {
            phaseIdMap[phase.id] = savedPhase.id;
          }
        }
      }

      // Create VCRs (handover points)
      const vcrIdMap: Record<string, string> = {};
      
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
          vcrIdMap[vcr.id] = savedVCR.id;

          // Create system mappings for this VCR
          // Keys can be direct system IDs or composite subsystem keys (systemId::sub::subsystemId)
          const mappedKeys = state.mappings[vcr.id] || [];
          if (mappedKeys.length > 0) {
            // Extract unique parent system IDs from both direct and composite keys
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

      // Create approvers
      if (state.approvers.length > 0) {
        const approverRecords = state.approvers.map(a => ({
          handover_id: planId,
          role_name: a.role_name,
          display_order: a.display_order,
          status: 'PENDING' as const,
        }));

        await client.from('p2a_handover_approvers').insert(approverRecords);
      }

      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-plan'] });
      queryClient.invalidateQueries({ queryKey: ['project-vcrs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans', projectId] });
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
