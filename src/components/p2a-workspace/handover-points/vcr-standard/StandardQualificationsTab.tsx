import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Plus, Paperclip } from 'lucide-react';
import { useVCRQualifications, VCRQualification } from '../../hooks/useVCRQualifications';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import { normalizeCategoryCode } from './standardStatus';

interface Props { handoverPointId: string }

/* ---------- Lifecycle chip (Draft / Under review / Approved / Rejected) ---------- */

type Lifecycle = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

const lifecycleOf = (q: VCRQualification): Lifecycle => {
  if (q.status === 'APPROVED') return 'APPROVED';
  if (q.status === 'REJECTED') return 'REJECTED';
  return q.submitted_at ? 'PENDING' : 'DRAFT';
};

const lifecycleChip = (lc: Lifecycle): { label: string; className: string } => {
  switch (lc) {
    case 'APPROVED': return { label: 'Approved',     className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'REJECTED': return { label: 'Rejected',     className: 'bg-red-50 text-red-700 border-red-200' };
    case 'PENDING':  return { label: 'Under review', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'DRAFT':    return { label: 'Draft',        className: 'bg-slate-100 text-muted-foreground border-slate-200' };
  }
};

/* ---------- Item-ID chip (tinted monospace) ---------- */

const ItemChip: React.FC<{ code: string }> = ({ code }) => (
  <span
    className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600"
    style={{ background: '#EEF2F7' }}
  >
    {code}
  </span>
);

const itemCodeFor = (q: VCRQualification): string | null => {
  if (!q.prerequisite) return null;
  const cat = normalizeCategoryCode(q.prerequisite.category);
  if (cat === 'XX') return null;
  return formatVcrItemCode(cat, q.prerequisite.display_order ?? 0);
};

/* ---------- Detail drawer ---------- */

interface DrawerProps {
  qual: VCRQualification | null;
  onOpenChange: (open: boolean) => void;
  approverName: string | null;
  approverRole: string | null;
  approverAvatar: string | null;
}

const QualificationDetailDrawer: React.FC<DrawerProps> = ({
  qual, onOpenChange, approverName, approverRole, approverAvatar,
}) => {
  if (!qual) return null;
  const lc = lifecycleOf(qual);
  const chip = lifecycleChip(lc);
  const itemCode = itemCodeFor(qual);

  return (
    <Sheet open={!!qual} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground mb-1">
                Qualification
              </div>
              <SheetTitle className="text-[15px] leading-snug flex items-center gap-2 flex-wrap">
                {itemCode && <ItemChip code={itemCode} />}
                <span>{qual.prerequisite?.summary || 'Ad-hoc qualification'}</span>
              </SheetTitle>
              <SheetDescription className="text-[12px] mt-1">
                {qual.reason}
              </SheetDescription>
            </div>
            <span className={cn('flex-none text-[10.5px] font-bold rounded-full border px-2 py-0.5 mt-0.5', chip.className)}>
              {chip.label}
            </span>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5 text-sm">
            <DrawerField label="Reason" value={qual.reason} />
            {qual.mitigation && <DrawerField label="Mitigation" value={qual.mitigation} />}
            {qual.follow_up_action && <DrawerField label="Follow-up action" value={qual.follow_up_action} />}
            {qual.target_date && (
              <DrawerField label="Target close-out" value={format(new Date(qual.target_date), 'dd-MMM-yyyy')} />
            )}
            {qual.reviewer_comments && <DrawerField label="Ruling comments" value={qual.reviewer_comments} />}

            <Separator />

            <div className="space-y-2">
              <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Raised by</div>
              <div className="text-xs text-muted-foreground">
                {qual.action_owner_name || '—'}
                {qual.submitted_at && ` · ${format(new Date(qual.submitted_at), 'dd-MMM-yyyy')}`}
              </div>
            </div>

            {lc === 'APPROVED' && (
              <div className="space-y-2">
                <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Approver</div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {approverAvatar && <AvatarImage src={approverAvatar} />}
                    <AvatarFallback className="text-[10px]">
                      {(approverName || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{approverName || qual.reviewed_by || '—'}</div>
                    {approverRole && <div className="text-[11px] text-muted-foreground truncate">{approverRole}</div>}
                    {qual.reviewed_at && (
                      <div className="text-[11px] text-muted-foreground">
                        Approved {format(new Date(qual.reviewed_at), 'dd-MMM-yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {qual.evidence && qual.evidence.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Evidence</div>
                <ul className="space-y-1">
                  {qual.evidence.map(e => (
                    <li key={e.id} className="flex items-center gap-2 text-xs">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{e.file_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

const DrawerField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="space-y-1">
    <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">{label}</div>
    <div className="text-sm text-foreground whitespace-pre-wrap">{value}</div>
  </div>
);

/* ---------- Main tab ---------- */

export const StandardQualificationsTab: React.FC<Props> = ({ handoverPointId }) => {
  const { qualifications, isLoading } = useVCRQualifications(handoverPointId);
  const { data: profiles } = useProfileUsers();
  const [openId, setOpenId] = React.useState<string | null>(null);

  const profileById = React.useMemo(() => {
    const m = new Map<string, { full_name: string; role?: string; avatar_url?: string }>();
    (profiles || []).forEach(p => m.set(p.user_id, { full_name: p.full_name, role: p.role, avatar_url: p.avatar_url }));
    return m;
  }, [profiles]);

  const openCount = qualifications.filter(q => q.status === 'PENDING').length;
  const approvedCount = qualifications.filter(q => q.status === 'APPROVED').length;
  const summary = [
    openCount ? `${openCount} open` : null,
    approvedCount ? `${approvedCount} approved` : null,
  ].filter(Boolean).join(' · ') || 'None raised';

  const openQual = qualifications.find(q => q.id === openId) || null;
  const openApprover = openQual?.reviewed_by ? profileById.get(openQual.reviewed_by) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Qualifications · {summary}
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1">
          <Plus className="h-3.5 w-3.5" /> Raise qualification
        </Button>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!isLoading && qualifications.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No qualifications raised for this VCR.
        </Card>
      )}

      {qualifications.map((q, idx) => {
        const lc = lifecycleOf(q);
        const chip = lifecycleChip(lc);
        const qId = `Q-${String(idx + 1).padStart(3, '0')}`;
        const itemCode = itemCodeFor(q);
        const approver = q.reviewed_by ? profileById.get(q.reviewed_by) : null;

        return (
          <Card
            key={q.id}
            onClick={() => setOpenId(q.id)}
            className="p-4 cursor-pointer transition-colors hover:bg-muted/40"
          >
            {/* Top row: muted Q-ID + status chip */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10.5px] font-normal" style={{ color: '#B4BECC' }}>
                {qId}
              </span>
              <span className={cn('text-[10.5px] font-bold px-2 py-0.5 rounded-full border', chip.className)}>
                {chip.label}
              </span>
            </div>

            {/* Headline: item chip + description (chip omitted for ad-hoc) */}
            <div className="text-sm leading-snug mb-1.5 flex items-baseline gap-2 flex-wrap">
              {itemCode && <ItemChip code={itemCode} />}
              <span className="font-medium">
                {q.prerequisite?.summary || 'Ad-hoc qualification'}
              </span>
            </div>

            {/* Subtext: unlabeled muted reason */}
            <div className="text-xs text-muted-foreground leading-relaxed">
              {q.reason}
            </div>

            {/* Footer: approver + conditional approved date */}
            <Separator className="mt-3 mb-2.5" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-6 w-6">
                  {approver?.avatar_url && <AvatarImage src={approver.avatar_url} />}
                  <AvatarFallback className="text-[9px]">
                    {(approver?.full_name || q.reviewed_by || '—').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-medium truncate">
                    {approver?.full_name || q.reviewed_by || 'Awaiting approver'}
                  </div>
                  {approver?.role && (
                    <div className="text-[10.5px] text-muted-foreground truncate">{approver.role}</div>
                  )}
                </div>
              </div>
              {lc === 'APPROVED' && q.reviewed_at && (
                <div className="text-[11px] text-muted-foreground shrink-0">
                  {format(new Date(q.reviewed_at), 'dd-MMM-yyyy')}
                </div>
              )}
            </div>
          </Card>
        );
      })}

      <QualificationDetailDrawer
        qual={openQual}
        onOpenChange={(o) => { if (!o) setOpenId(null); }}
        approverName={openApprover?.full_name || null}
        approverRole={openApprover?.role || null}
        approverAvatar={openApprover?.avatar_url || null}
      />
    </div>
  );
};
