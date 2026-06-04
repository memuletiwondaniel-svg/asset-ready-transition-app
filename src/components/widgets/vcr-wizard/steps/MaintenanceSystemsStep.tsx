import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MAINTENANCE_DELIVERABLES,
  type MaintenanceDeliverableType,
} from '@/lib/vcrMaintenanceDeliverables';

interface MaintenanceSystemsStepProps {
  vcrId: string;
}

interface DeliverableRow {
  id: string;
  deliverable_type: MaintenanceDeliverableType;
  is_applicable: boolean;
  comments: string | null;
}

export const MaintenanceSystemsStep: React.FC<MaintenanceSystemsStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const queryKey = ['vcr-maintenance-deliverables', vcrId];

  const { data: rows = [], isLoading } = useQuery<DeliverableRow[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_maintenance_deliverables')
        .select('id, deliverable_type, is_applicable, comments')
        .eq('handover_point_id', vcrId);
      if (error) throw error;
      return data || [];
    },
  });

  // Index by type for quick lookup
  const byType = useMemo(() => {
    const m = new Map<MaintenanceDeliverableType, DeliverableRow>();
    rows.forEach((r) => m.set(r.deliverable_type, r));
    return m;
  }, [rows]);

  // Local comment drafts so typing isn't laggy
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    rows.forEach((r) => {
      if (!(r.deliverable_type in commentDrafts)) {
        next[r.deliverable_type] = r.comments ?? '';
      }
    });
    if (Object.keys(next).length) setCommentDrafts((p) => ({ ...next, ...p }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const upsert = useMutation({
    mutationFn: async (payload: {
      deliverable_type: MaintenanceDeliverableType;
      is_applicable?: boolean;
      comments?: string | null;
    }) => {
      const existing = byType.get(payload.deliverable_type);
      const { data: { user } } = await supabase.auth.getUser();
      if (existing) {
        const patch: any = {};
        if (payload.is_applicable !== undefined) patch.is_applicable = payload.is_applicable;
        if (payload.comments !== undefined) patch.comments = payload.comments;
        const { error } = await (supabase as any)
          .from('p2a_vcr_maintenance_deliverables')
          .update(patch)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('p2a_vcr_maintenance_deliverables')
          .insert({
            handover_point_id: vcrId,
            deliverable_type: payload.deliverable_type,
            is_applicable: payload.is_applicable ?? false,
            comments: payload.comments ?? null,
            created_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-confirmation-stats', vcrId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save'),
  });

  const handleToggle = (type: MaintenanceDeliverableType, next: boolean) => {
    upsert.mutate({ deliverable_type: type, is_applicable: next });
  };

  const handleCommentBlur = (type: MaintenanceDeliverableType) => {
    const existing = byType.get(type);
    const draft = commentDrafts[type] ?? '';
    if ((existing?.comments ?? '') === draft) return;
    upsert.mutate({ deliverable_type: type, comments: draft || null });
  };

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-start gap-2">
        <Wrench className="w-4 h-4 text-amber-500 mt-0.5" />
        <div>
          <h2 className="text-base font-semibold">Maintenance Systems</h2>
          <p className="text-xs text-muted-foreground">
            Mark which maintenance deliverables apply to this VCR. Add comments where useful.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          {MAINTENANCE_DELIVERABLES.map((def, idx) => {
            const row = byType.get(def.type);
            const applicable = !!row?.is_applicable;
            return (
              <div
                key={def.type}
                className={cn(
                  'px-4 py-3 transition-colors',
                  idx > 0 && 'border-t border-border/40',
                  applicable && 'bg-muted/20'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <Switch
                      checked={applicable}
                      onCheckedChange={(v) => handleToggle(def.type, !!v)}
                      aria-label={`Mark ${def.name} as applicable`}
                      className="h-5 w-9 border border-border data-[state=unchecked]:bg-muted data-[state=checked]:bg-primary/60 [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4 [&>span]:bg-background"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{def.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{def.guidance}</div>
                    {applicable && (
                      <Textarea
                        placeholder="Optional notes — scope, timing, responsibility…"
                        className="mt-2 min-h-[60px] text-xs"
                        value={commentDrafts[def.type] ?? row?.comments ?? ''}
                        onChange={(e) =>
                          setCommentDrafts((p) => ({ ...p, [def.type]: e.target.value }))
                        }
                        onBlur={() => handleCommentBlur(def.type)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
