import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useVCRQualifications, VCRQualification } from '../../hooks/useVCRQualifications';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import { normalizeCategoryCode } from './standardStatus';
import { QualificationDrawer } from './QualificationDrawer';
import { RaiseQualificationModal } from './RaiseQualificationModal';



interface Props {
  handoverPointId: string;
  vcrCode?: string;
  vcrName?: string;
}

type Lifecycle = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

const lifecycleOf = (q: VCRQualification): Lifecycle => {
  if (q.status === 'APPROVED') return 'APPROVED';
  if (q.status === 'REJECTED') return 'REJECTED';
  if (q.status === 'DRAFT') return 'DRAFT';
  return 'PENDING';
};

const chipStyle = (lc: Lifecycle) => {
  switch (lc) {
    case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
    case 'PENDING':  return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'DRAFT':    return 'bg-slate-100 text-muted-foreground border-slate-200';
  }
};
const chipLabel = (lc: Lifecycle) =>
  lc === 'PENDING' ? 'Under review' : lc === 'DRAFT' ? 'Draft' : lc === 'APPROVED' ? 'Approved' : 'Rejected';

const ItemChip: React.FC<{ code: string }> = ({ code }) => (
  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 whitespace-nowrap shrink-0"
        style={{ background: '#EEF2F7' }}>{code}</span>
);

const itemCodeFor = (q: VCRQualification): string | null => {
  if (!q.prerequisite) return null;
  const cat = normalizeCategoryCode(q.prerequisite.category);
  if (cat === 'XX') return null;
  return formatVcrItemCode(cat, q.prerequisite.display_order ?? 0);
};

export const StandardQualificationsTab: React.FC<Props> = ({ handoverPointId, vcrCode, vcrName }) => {
  const { qualifications, isLoading } = useVCRQualifications(handoverPointId);
  const { prerequisites } = useVCRPrerequisites(handoverPointId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [search, setSearch] = useState('');


  const prereqOptions = useMemo(() => (prerequisites || []).map((p: any) => {
    const cat = normalizeCategoryCode(p.vcr_items?.category?.code ?? p.category);
    const code = cat === 'XX' ? '' : formatVcrItemCode(cat, p.display_order ?? 0);
    return {
      id: p.id,
      code,
      summary: p.summary as string,
      category: cat,
      description: (p.description as string) || '',
    };
  }), [prerequisites]);

  const total = qualifications.length;
  const openCount = qualifications.filter(q => lifecycleOf(q) === 'PENDING').length;
  const approvedCount = qualifications.filter(q => lifecycleOf(q) === 'APPROVED').length;
  const rejectedCount = qualifications.filter(q => lifecycleOf(q) === 'REJECTED').length;
  const draftCount = qualifications.filter(q => lifecycleOf(q) === 'DRAFT').length;

  const summaryLine = [
    `${total} total`,
    openCount ? `${openCount} under review` : null,
    approvedCount ? `${approvedCount} approved` : null,
    rejectedCount ? `${rejectedCount} rejected` : null,
    draftCount ? `${draftCount} draft` : null,
  ].filter(Boolean).join(' · ');

  const headerVcrLabel = `${vcrCode || 'VCR'}${vcrName ? ` (${vcrName})` : ''}`;

  const openQual = qualifications.find(q => q.id === openId) || null;

  // Group order: REJECTED → PENDING → APPROVED → DRAFT (Daniel canon).
  const GROUP_ORDER: Record<Lifecycle, number> = { REJECTED: 0, PENDING: 1, APPROVED: 2, DRAFT: 3 };

  const searchMatches = (q: VCRQualification, needle: string): boolean => {
    if (!needle) return true;
    const n = needle.toLowerCase().trim();
    const qNum = q.q_number ?? 0;
    const qId = `Q-${String(qNum).padStart(3, '0')}`;
    const code = itemCodeFor(q) || '';
    const hay = [
      q.prerequisite?.summary,
      q.custom_title,
      q.reason,
      (q as any).mitigation,
      code,
      qId,
      String(qNum),
    ].filter(Boolean).map(s => String(s).toLowerCase());
    // Also match numeric-only Q lookups like '2' → matches q_number.
    if (/^\d+$/.test(n) && parseInt(n, 10) === qNum) return true;
    return hay.some(s => s.includes(n));
  };

  const visibleQuals = useMemo(() => {
    const filtered = qualifications.filter(q => searchMatches(q, search));
    return [...filtered].sort((a, b) => {
      const ga = GROUP_ORDER[lifecycleOf(a)];
      const gb = GROUP_ORDER[lifecycleOf(b)];
      if (ga !== gb) return ga - gb;
      // Newest first within group — q_number monotonic proxy.
      return (b.q_number ?? 0) - (a.q_number ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualifications, search]);


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Qualifications — {headerVcrLabel}
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">
            {summaryLine || 'None raised'}
          </div>
        </div>
        <Button size="sm" onClick={() => setRaiseOpen(true)} className="h-8 text-[12px] gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Raise Qualification
        </Button>

      </div>

      {/* Search */}
      {qualifications.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search qualifications — question, reason, item, item ID, Q-number…"
            className="h-9 pl-8 text-[12px]"
          />
        </div>
      )}

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!isLoading && qualifications.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No qualifications raised for this VCR.
        </Card>
      )}

      {!isLoading && qualifications.length > 0 && visibleQuals.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No qualifications match “{search.trim()}”.
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {visibleQuals.map(q => {
          const lc = lifecycleOf(q);
          const isDraft = lc === 'DRAFT';
          const qId = `Q-${String(q.q_number ?? 0).padStart(3, '0')}`;
          const code = itemCodeFor(q);
          const dateStr = lc === 'APPROVED' || lc === 'REJECTED'
            ? q.reviewed_at
            : q.submitted_at;

          return (
            <Card
              key={q.id}
              onClick={() => setOpenId(q.id)}
              className={cn(
                'p-4 cursor-pointer transition-colors hover:bg-muted/40 flex flex-col',
                isDraft && 'border-dashed opacity-70 bg-muted/20',
              )}
            >
              {/* Q-number eyebrow + status chip */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10.5px] font-semibold text-muted-foreground/70">{qId}</span>
                <span className={cn('text-[10.5px] font-bold px-2 py-0.5 rounded-full border', chipStyle(lc))}>
                  {chipLabel(lc)}
                </span>
              </div>

              {/* Item chip + prereq question (or custom title) */}
              <div className="text-sm leading-snug mb-1.5 flex items-baseline gap-2 min-w-0">
                {code && <ItemChip code={code} />}
                <span className="font-medium truncate min-w-0">
                  {q.prerequisite?.summary
                    || q.custom_title
                    || 'Ad-hoc qualification'}
                </span>
              </div>

              {/* Reason — one-line truncated on the card; full text in the drawer */}
              <div className="text-xs text-muted-foreground leading-relaxed truncate">
                <span className="font-semibold text-muted-foreground/80">Reason: </span>
                {q.reason}
              </div>

              {/* Card foot — date, right-aligned */}
              {dateStr && (
                <div className="mt-2 flex justify-end">
                  <span className="text-[10.5px] text-muted-foreground">
                    {format(new Date(dateStr), 'dd-MMM-yyyy')}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>



      {/* Drawer */}
      <QualificationDrawer
        qual={openQual}
        vcrCode={vcrCode}
        vcrName={vcrName}
        open={!!openQual}
        onOpenChange={(o) => { if (!o) setOpenId(null); }}
      />

      {/* Raise modal */}
      <RaiseQualificationModal
        open={raiseOpen}
        onOpenChange={setRaiseOpen}
        handoverPointId={handoverPointId}
        vcrCode={vcrCode}
        vcrName={vcrName}
        prereqs={prereqOptions}
      />
    </div>
  );
};
