import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DisciplineAssurance } from './hooks/useVCRDisciplineAssurance';
import { VCRItemDetailSheet, type VCRItemBasic } from './VCRItemDetailSheet';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assurance: DisciplineAssurance | null;
  handoverPointId: string;
  projectId?: string;
  roleName?: string; // fallback when assurance is null (PENDING row)
  roleId?: string | null;
  fallbackHolderName?: string | null;
  fallbackAvatarUrl?: string | null;
}

const resolveAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400' },
  QUALIFICATION_APPROVED: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400' },
  QUALIFICATION_REQUESTED: { label: 'Qualification', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400' },
  REJECTED: { label: 'Returned', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400' },
  READY_FOR_REVIEW: { label: 'Under review', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400' },
};
const statusPill = (status: string) => STATUS_META[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };

export const DisciplineStatementDrawer: React.FC<Props> = ({
  open,
  onOpenChange,
  assurance,
  handoverPointId,
  projectId,
  roleName,
  roleId,
  fallbackHolderName,
  fallbackAvatarUrl,
}) => {
  const [selectedItem, setSelectedItem] = useState<VCRItemBasic | null>(null);

  const effectiveRoleName = assurance?.discipline_role_name || roleName || 'Discipline';
  const effectiveRoleId = assurance?.discipline_role_id ?? roleId ?? null;
  const displayName = assurance?.reviewer?.full_name || fallbackHolderName || 'Unassigned';
  const avatar =
    resolveAvatarUrl(assurance?.reviewer?.avatar_url) ||
    resolveAvatarUrl(fallbackAvatarUrl) ||
    null;
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '·';

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['vcr-discipline-decisions', handoverPointId, effectiveRoleId, effectiveRoleName],
    enabled: open && !!handoverPointId,
    queryFn: async () => {
      // Prereqs for this delivering discipline (match by role id when available, else by name)
      let q: any = (supabase as any)
        .from('p2a_vcr_prerequisites')
        .select('id, vcr_item_id, status')
        .eq('handover_point_id', handoverPointId);
      if (effectiveRoleId) q = q.eq('delivering_party_id', effectiveRoleId);
      else q = q.eq('delivering_party_name', effectiveRoleName);
      const { data: preqs } = await q;
      const rows = (preqs || []) as { id: string; vcr_item_id: string; status: string }[];
      if (rows.length === 0) return [];
      const itemIds = rows.map((r) => r.vcr_item_id).filter(Boolean);
      const { data: items } = await (supabase as any)
        .from('vcr_items')
        .select('id, vcr_item, topic, category_id, vcr_item_categories!vcr_items_category_id_fkey(name, code)')
        .in('id', itemIds);
      const itemMap = new Map<string, any>();
      (items || []).forEach((i: any) => itemMap.set(i.id, i));
      return rows
        .map((r) => {
          const it = itemMap.get(r.vcr_item_id);
          if (!it) return null;
          const code = it.vcr_item_categories?.code || 'ITEM';
          return {
            prereqId: r.id,
            status: r.status,
            id: it.id,
            title: it.vcr_item,
            topic: it.topic as string | null,
            categoryName: (it.vcr_item_categories?.name as string) || '',
            categoryCode: code,
            itemCode: `${code}-${String((it.display_order ?? 0)).padStart(2, '0')}`,
          };
        })
        .filter(Boolean) as any[];
    },
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto !z-modal-critical">
          <SheetHeader>
            <SheetTitle className="sr-only">Discipline statement</SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-3 mt-2">
            <Avatar className="h-11 w-11 ring-2 ring-background shadow-sm">
              {avatar && <AvatarImage src={avatar} alt={displayName} />}
              <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{effectiveRoleName}</p>
            </div>
          </div>

          {assurance ? (
            <div className="mt-5 rounded-lg bg-muted/40 border border-border/50 p-4">
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {assurance.assurance_statement}
              </p>
              <p className="mt-3 text-right text-[11px] text-muted-foreground">
                {format(new Date(assurance.submitted_at), 'dd MMM yyyy, HH:mm')}
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground italic">
              Statement not yet submitted.
            </div>
          )}

          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              Decisions ({decisions.length})
            </p>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : decisions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No items assigned to this discipline.</p>
            ) : (
              <div className="space-y-1">
                {decisions.map((d: any) => {
                  const pill = statusPill(d.status);
                  return (
                    <button
                      key={d.prereqId}
                      onClick={() =>
                        setSelectedItem({
                          id: d.id,
                          vcr_item: d.title,
                          topic: d.topic,
                          category_name: d.categoryName,
                          category_code: d.categoryCode,
                          status: d.status,
                          prerequisite_id: d.prereqId,
                          itemCode: d.itemCode,
                        })
                      }
                      className="w-full text-left rounded-md border border-border/50 bg-card hover:bg-accent/40 hover:border-primary/30 transition-colors px-3 py-2.5 flex items-start gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground leading-snug">
                          <span className="font-mono text-[10.5px] text-muted-foreground mr-1.5">{d.itemCode}</span>
                          {d.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {d.categoryName}
                          {d.topic ? <> · {d.topic}</> : null}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', pill.className)}>
                        {pill.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <VCRItemDetailSheet
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(o) => { if (!o) setSelectedItem(null); }}
        vcrId={handoverPointId}
        projectIdOverride={projectId}
      />
    </>
  );
};
