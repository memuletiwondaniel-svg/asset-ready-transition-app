import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { VCRApprover } from './ApproversStep';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Check, Minus, ArrowRight, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { computeActiveVcrItems } from '@/lib/vcrActiveItems';
import { buildVcrSubmitApproverPayload, type VcrSubmitApproverPayload } from '@/lib/buildVcrSubmitPayload';

interface VCRConfirmationStepProps {
  vcrId: string;
  vcrName?: string;
  vcrCode?: string;
  onNavigateToStep?: (stepIdx: number) => void;
  onReadyChange?: (ready: boolean) => void;
  submitRequestId?: number;
  approversRoster?: VCRApprover[];
  onSubmitSuccess?: () => void;
}

interface ResolvedApprover {
  role: string;
  user_name?: string;
  user_avatar?: string;
  user_id?: string;
}

const resolveAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

interface ReadinessRow {
  key: string;
  stepIdx: number;            // wizard step index (0-based)
  stepLabel: string;          // "Step 1"
  name: string;
  summary: string;
  required: boolean;
  complete: boolean;
}

export const VCRConfirmationStep: React.FC<VCRConfirmationStepProps> = ({
  vcrId,
  onNavigateToStep,
  onReadyChange,
  submitRequestId,
  approversRoster,
  onSubmitSuccess,
}) => {
  const [submissionNote, setSubmissionNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();


  const { data: stats, isLoading } = useQuery({
    queryKey: ['vcr-review-readiness', vcrId],
    // Always refetch when Step 10 mounts so N/A toggles from Step 9 are reflected.
    refetchOnMount: 'always',
    staleTime: 0,
    queryFn: async () => {
      const client = supabase as any;

      // VCR Checklist readiness uses the SHARED computeActiveVcrItems helper —
      // the SAME function that submit_vcr_plan's p_items payload is built from.
      // One source of truth: if the RPC will materialize N rows, this reports N.
      // We do NOT gate submit on p2a_vcr_prerequisites rows — those are the
      // OUTPUT of submit, never a precondition.
      const computeActiveChecklist = async (): Promise<number> => {
        try {
          const result = await computeActiveVcrItems(vcrId);
          // Debug surface so any divergence between readiness + submit is visible.
          // eslint-disable-next-line no-console
          console.log('[VCR readiness] active checklist', {
            vcrId,
            hasHydrocarbon: result.hasHydrocarbon,
            templateId: result.templateId,
            templateItemCount: result.templateItemCount,
            catalogActiveCount: result.catalogActiveCount,
            naCount: result.naCount,
            activeItems: result.activeItems.length,
          });
          return result.activeItems.length;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[VCR readiness] computeActiveVcrItems failed', e);
          return 0;
        }
      };

      const [
        systems, itp, training, procedures, criticalDocs,
        registers, logsheets, maintenanceTotal, maintenanceApplicable,
        activeChecklist,
      ] = await Promise.all([
        client.from('p2a_handover_point_systems').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
        client.from('p2a_itp_activities').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
        client.from('p2a_vcr_training').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
        client.from('p2a_vcr_procedures').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
        client.from('p2a_vcr_critical_docs').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
        client.from('p2a_vcr_register_selections').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
        client.from('p2a_vcr_logsheets').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
        client.from('p2a_vcr_maintenance_deliverables').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
        client.from('p2a_vcr_maintenance_deliverables').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId).eq('is_applicable', true),
        computeActiveChecklist(),
      ]);

      const systemsCount = systems.count || 0;

      return {
        systems: systemsCount,
        itp: itp.count || 0,
        itpSystems: systemsCount,
        training: training.count || 0,
        procedures: procedures.count || 0,
        criticalDocs: criticalDocs.count || 0,
        registers: registers.count || 0,
        logsheets: logsheets.count || 0,
        maintenanceTotal: maintenanceTotal.count || 0,
        maintenanceApplicable: maintenanceApplicable.count || 0,
        checklist: activeChecklist,
      };
    },
  });

  const { data: approvers } = useQuery<ResolvedApprover[]>({
    queryKey: ['vcr-approvers-summary', vcrId],
    queryFn: async () => {
      const client = supabase as any;
      const { data: hp } = await client
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcrId)
        .maybeSingle();
      if (!hp?.handover_plan_id) return [];
      const { data: plan } = await client
        .from('p2a_handover_plans')
        .select('project_id')
        .eq('id', hp.handover_plan_id)
        .maybeSingle();
      const projectId = plan?.project_id;
      if (!projectId) return [];

      const labels = ['ORA Lead', 'Construction Lead', 'Commissioning Lead', 'Project Hub Lead'];
      const resolved: ResolvedApprover[] = [];
      for (const label of labels) {
        const { data: userId } = await client.rpc('resolve_project_role_user', {
          p_project_id: projectId,
          p_role_label: label,
        });
        if (!userId) {
          resolved.push({ role: label });
          continue;
        }
        const { data: prof } = await client.rpc('get_safe_profile_data', { target_user_id: userId });
        const row = Array.isArray(prof) ? prof[0] : prof;
        resolved.push({
          role: label,
          user_id: userId,
          user_name: row?.full_name,
          user_avatar: row?.avatar_url ?? undefined,
        });
      }

      const { data: project } = await client
        .from('projects')
        .select('plant_id')
        .eq('id', projectId)
        .maybeSingle();
      let plantName: string | null = null;
      if (project?.plant_id) {
        const { data: plant } = await client.from('plant').select('name').eq('id', project.plant_id).maybeSingle();
        plantName = plant?.name || null;
      }
      if (plantName) {
        const { data: deputies } = await client.rpc('find_deputy_plant_director', { plant_name_param: plantName });
        const d = deputies?.[0];
        resolved.push({
          role: 'Dep. Plant Director',
          user_id: d?.user_id,
          user_name: d?.full_name,
          user_avatar: d?.avatar_url ?? undefined,
        });
      } else {
        resolved.push({ role: 'Dep. Plant Director' });
      }

      return resolved;
    },
  });

  // Persisted approvers from vcr_plan_approvers — used as fallback when the
  // user resubmits a CHANGES_REQUESTED plan by jumping straight to Step 10
  // without visiting Step 8 (so approversRoster prop is empty).
  const { data: persistedApprovers } = useQuery<VcrSubmitApproverPayload[]>({
    queryKey: ['vcr-plan-approvers-persisted', vcrId],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from('vcr_plan_approvers')
        .select('user_id, role_key, role_label, approver_order')
        .eq('vcr_id', vcrId)
        .order('approver_order', { ascending: true });
      if (error) {
        console.error('[vcr-plan-approvers-persisted] failed', error);
        return [];
      }
      return (data || [])
        .filter((r: any) => !!r.user_id)
        .map((r: any) => ({
          user_id: r.user_id,
          role_key: r.role_key || 'custom',
          role_label: r.role_label,
          approver_order: r.approver_order ?? 0,
        }));
    },
  });

  const rows: ReadinessRow[] = stats ? [
    {
      key: 'systems', stepIdx: 0, stepLabel: 'Step 1', name: 'Systems',
      required: true,
      complete: stats.systems > 0,
      summary: stats.systems > 0 ? `${stats.systems} system${stats.systems === 1 ? '' : 's'} mapped` : 'No systems mapped',
    },
    {
      key: 'whp', stepIdx: 1, stepLabel: 'Step 2', name: 'Witness & Hold Points',
      required: false,
      complete: stats.itp > 0,
      summary: stats.itp > 0
        ? `${stats.itp} point${stats.itp === 1 ? '' : 's'} across ${stats.itpSystems || 1} system${stats.itpSystems === 1 ? '' : 's'}`
        : 'None added (optional)',
    },
    {
      key: 'training', stepIdx: 2, stepLabel: 'Step 3', name: 'Training',
      required: true,
      complete: stats.training > 0,
      summary: stats.training > 0 ? `${stats.training} training items` : 'No training items',
    },
    {
      key: 'procedures', stepIdx: 3, stepLabel: 'Step 4', name: 'Procedures',
      required: true,
      complete: stats.procedures > 0,
      summary: stats.procedures > 0 ? `${stats.procedures} procedure${stats.procedures === 1 ? '' : 's'}` : 'No procedures',
    },
    {
      key: 'docs', stepIdx: 4, stepLabel: 'Step 5', name: 'Critical Documents',
      required: true,
      complete: stats.criticalDocs > 0,
      summary: stats.criticalDocs > 0
        ? `${stats.criticalDocs} document${stats.criticalDocs === 1 ? '' : 's'} identified`
        : 'No documents identified',
    },
    {
      key: 'reglog', stepIdx: 5, stepLabel: 'Step 6', name: 'Registers & Logsheets',
      required: false,
      complete: (stats.registers + stats.logsheets) > 0,
      summary: (stats.registers + stats.logsheets) > 0
        ? `${stats.registers} Register${stats.registers === 1 ? '' : 's'}, ${stats.logsheets} Logsheet${stats.logsheets === 1 ? '' : 's'}`
        : 'None added',
    },
    {
      key: 'maintenance', stepIdx: 6, stepLabel: 'Step 7', name: 'Maintenance Systems',
      required: false,
      complete: stats.maintenanceApplicable > 0,
      summary: stats.maintenanceApplicable > 0
        ? `${stats.maintenanceApplicable} of ${stats.maintenanceTotal} deliverables marked applicable`
        : 'No deliverables marked applicable',
    },
    {
      key: 'checklist', stepIdx: 8, stepLabel: 'Step 9', name: 'VCR Checklist',
      required: true,
      complete: stats.checklist > 0,
      summary: stats.checklist > 0
        ? `${stats.checklist} active item${stats.checklist === 1 ? '' : 's'} ready to materialize`
        : 'No checklist items (all marked N/A)',
    },
  ] : [];

  const requiredGaps = rows.filter(r => r.required && !r.complete);
  const isReady = stats ? requiredGaps.length === 0 : false;
  const approverCount = approvers?.length || 0;

  const handleSubmitClick = () => {
    if (!isReady) {
      toast.error('Resolve the gaps above before submitting');
      return;
    }
    setConfirmOpen(true);
  };

  useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  useEffect(() => {
    if (submitRequestId && submitRequestId > 0) {
      handleSubmitClick();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitRequestId]);

  if (isLoading || !stats) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }


  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const client = supabase as any;

    try {
      // Build approver payload from the roster lifted from Step 8.
      // NOTE: We no longer send the active checklist set to the RPC. The RPC
      // derives it server-side from p2a_vcr_item_overrides at execution time,
      // so the materialized rows are authoritative regardless of any stale UI.
      // Shared payload builder — also used by the ORA-edit "Save changes"
      // action in review mode. Do NOT inline / fork.
      const approverPayload = buildVcrSubmitApproverPayload(approversRoster);

      if (approverPayload.length === 0) {
        toast.error('No approvers configured. Go back to Step 8 and assign approvers before submitting.');
        setIsSubmitting(false);
        return;
      }

      // Atomic RPC: server computes active set, upserts prereqs, reconciles
      // approvers, flips status → READY. Returns counts for the toast.
      const { data: result, error: rpcErr } = await client.rpc('submit_vcr_plan', {
        p_handover_point_id: vcrId,
        p_approvers: approverPayload,
      });
      if (rpcErr) throw rpcErr;

      setConfirmOpen(false);
      const upserted = result?.items_upserted ?? 0;
      const deleted = result?.items_deleted ?? 0;
      toast.success(
        `Submitted for approval — ${upserted} checklist item${upserted === 1 ? '' : 's'}` +
        (deleted > 0 ? `, ${deleted} removed (newly N/A)` : '') +
        `, ${result?.approvers_upserted ?? approverPayload.length} approvers.`,
      );

      // Refresh readiness + parent caches.
      queryClient.invalidateQueries({ queryKey: ['vcr-review-readiness', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['project-vcrs'] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });

      onSubmitSuccess?.();
    } catch (err: any) {
      console.error('[submit_vcr_plan] failed:', err);
      const msg = err?.message || String(err);
      if (msg.includes('Cannot remove approvers with recorded decisions')) {
        toast.error('Cannot remove an approver who has already approved or rejected. Restore them in Step 8 to continue.');
      } else if (msg.includes('Cannot remove checklist items with recorded approval decisions')) {
        toast.error('Cannot mark an item N/A after it has a recorded approval decision. Restore it in Step 9 to continue.');
      } else if (msg.includes('No active checklist items')) {
        toast.error('Every checklist item is marked N/A. Restore at least one item in Step 9 before submitting.');
      } else {
        toast.error(`Submission failed: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-medium">Review and Submit</h2>
        <p className="text-[13px] text-muted-foreground leading-[1.5] mt-0.5">
          Confirm the VCR Plan is complete and submit for approval.
        </p>
      </div>

      {/* Readiness banner */}
      {isReady ? (
        <div
          className="rounded-md border px-4 py-3.5 flex items-start gap-2.5"
          style={{ backgroundColor: '#E1F5EE', borderColor: '#0F6E56' }}
        >
          <CheckCircle2 className="w-[18px] h-[18px] shrink-0 mt-0.5" style={{ color: '#0F6E56' }} />
          <div>
            <div className="text-[13px] font-medium" style={{ color: '#04342C' }}>Ready to submit</div>
            <div className="text-[12px] leading-[1.5] mt-0.5" style={{ color: '#085041' }}>
              All required content is in place. Submit to send to approvers.
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-md border px-4 py-3.5 flex items-start gap-2.5"
          style={{ backgroundColor: '#FAEEDA', borderColor: '#EF9F27' }}
        >
          <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-0.5" style={{ color: '#854F0B' }} />
          <div>
            <div className="text-[13px] font-medium" style={{ color: '#412402' }}>
              Not ready to submit — {requiredGaps.length} item{requiredGaps.length === 1 ? '' : 's'} need attention
            </div>
            <div className="text-[12px] leading-[1.5] mt-0.5" style={{ color: '#633806' }}>
              Resolve the gaps below before submitting for approval.
            </div>
          </div>
        </div>
      )}

      {/* Plan content */}
      <div>
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Plan content
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          {rows.map((row, idx) => (
            <button
              type="button"
              key={row.key}
              onClick={() => onNavigateToStep?.(row.stepIdx)}
              className={cn(
                'w-full grid items-center gap-3 px-3.5 py-2.5 text-[13px] text-left transition-colors hover:bg-muted/30',
                idx > 0 && 'border-t border-border',
              )}
              style={{ gridTemplateColumns: '24px 1fr auto auto' }}
            >
              <span className="flex items-center justify-center">
                {row.complete ? (
                  <Check className="w-4 h-4" style={{ color: '#0F6E56' }} />
                ) : row.required ? (
                  <AlertCircle className="w-4 h-4" style={{ color: '#BA7517' }} />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
              </span>
              <span className="flex items-baseline gap-2 min-w-0">
                <span className="font-medium text-foreground truncate">{row.name}</span>
                <span className="text-[12px] text-muted-foreground truncate">{row.summary}</span>
              </span>
              <span className="text-[12px] text-muted-foreground">{row.stepLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Approvers */}
      {approvers && approvers.length > 0 && (
        <div>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Approvers ({approvers.length})
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            {approvers.map((a, idx) => (
              <div
                key={`${a.role}-${idx}`}
                className={cn(
                  'grid items-center gap-3 px-3.5 py-2.5',
                  idx > 0 && 'border-t border-border',
                )}
                style={{ gridTemplateColumns: '32px 1fr' }}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={resolveAvatarUrl(a.user_avatar)} />
                  <AvatarFallback
                    className="text-[11px] font-medium"
                    style={{ backgroundColor: '#E6F1FB', color: '#0C447C' }}
                  >
                    {getInitials(a.user_name || a.role)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">{a.user_name || a.role}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{a.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission note (ready state only) */}
      {isReady && (
        <div>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Submission note (optional)
          </div>
          <Textarea
            value={submissionNote}
            onChange={(e) => setSubmissionNote(e.target.value)}
            placeholder="Add context for the approvers (optional)..."
            className="text-[13px] min-h-[50px]"
          />
        </div>
      )}


      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit VCR Plan for approval?</AlertDialogTitle>
            <AlertDialogDescription>
              {approverCount} approver{approverCount === 1 ? '' : 's'} will be notified. This action cannot be undone from the wizard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Confirm submission'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
