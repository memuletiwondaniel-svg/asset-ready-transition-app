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


  const HC_TEMPLATE_ID = '363a831c-edb3-4224-a97f-2e8b11fac2dc';
  const NON_HC_TEMPLATE_ID = '2ebe8392-e404-4655-b9eb-46e4e3cb39e8';

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const client = supabase as any;

    try {
      // 1. Resolve active VCR checklist items for this VCR.
      //    Active = template items for the resolved (HC|non-HC) template ∩ NOT is_na overrides.

      // 1a. Hydrocarbon status → template id (mirrors VCRItemsStep logic).
      const { data: linkedSystems, error: lsErr } = await client
        .from('p2a_handover_point_systems')
        .select('system_id')
        .eq('handover_point_id', vcrId);
      if (lsErr) throw lsErr;

      let hasHC = false;
      const sysIds = (linkedSystems || []).map((r: any) => r.system_id).filter(Boolean);
      if (sysIds.length > 0) {
        const { data: sysRows, error: sErr } = await client
          .from('p2a_systems')
          .select('id, is_hydrocarbon')
          .in('id', sysIds);
        if (sErr) throw sErr;
        hasHC = (sysRows || []).some((s: any) => s.is_hydrocarbon === true);
      }
      const activeTemplateId = hasHC ? HC_TEMPLATE_ID : NON_HC_TEMPLATE_ID;

      // 1b. Template items for that template.
      const { data: tplItems, error: tiErr } = await client
        .from('vcr_template_items')
        .select('vcr_item_id')
        .eq('template_id', activeTemplateId);
      if (tiErr) throw tiErr;
      const tplItemIds = (tplItems || []).map((r: any) => r.vcr_item_id).filter(Boolean);

      if (tplItemIds.length === 0) {
        toast.error('No VCR checklist items found for this template.');
        setIsSubmitting(false);
        return;
      }

      // 1c. Fetch the catalog rows (summary + display_order) and the override is_na flags.
      const [{ data: items, error: itemsErr }, { data: overrides, error: ovErr }] = await Promise.all([
        client
          .from('vcr_items')
          .select('id, vcr_item, display_order')
          .in('id', tplItemIds)
          .eq('is_active', true),
        client
          .from('p2a_vcr_item_overrides')
          .select('vcr_item_id, is_na')
          .eq('handover_point_id', vcrId),
      ]);
      if (itemsErr) throw itemsErr;
      if (ovErr) throw ovErr;

      const naSet = new Set(
        (overrides || []).filter((o: any) => o.is_na === true).map((o: any) => o.vcr_item_id),
      );

      const activeItems = (items || [])
        .filter((it: any) => !naSet.has(it.id))
        .map((it: any) => ({
          vcr_item_id: it.id,
          summary: it.vcr_item,
          display_order: it.display_order ?? 0,
        }));

      // 2. Build approver payload from the roster lifted from Step 8.
      const approverPayload = (approversRoster || [])
        .filter(a => !!a.user_id)
        .map(a => ({
          user_id: a.user_id,
          role_key: a.role_key || 'custom',
          role_label: a.role_name,
          approver_order: a.display_order,
        }));

      if (approverPayload.length === 0) {
        toast.error('No approvers configured. Go back to Step 8 and assign approvers before submitting.');
        setIsSubmitting(false);
        return;
      }

      // 3. Atomic RPC: prereq upsert + approver reconcile + status → READY.
      const { data: result, error: rpcErr } = await client.rpc('submit_vcr_plan', {
        p_handover_point_id: vcrId,
        p_items: activeItems,
        p_approvers: approverPayload,
      });
      if (rpcErr) throw rpcErr;

      setConfirmOpen(false);
      toast.success(
        `Submitted for approval — ${result?.items_upserted ?? activeItems.length} checklist items, ${result?.approvers_upserted ?? approverPayload.length} approvers.`,
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
      // Surface the decided-approver-removal guard cleanly.
      if (msg.includes('Cannot remove approvers with recorded decisions')) {
        toast.error('Cannot remove an approver who has already approved or rejected. Restore them in Step 8 to continue.');
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
