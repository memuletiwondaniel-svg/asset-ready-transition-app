import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  // Eye removed — filename is already clickable
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useVCRItemInsights } from '@/hooks/useVCRItemInsights';
import { useProjectRoleHolders } from '@/hooks/useProjectRoleHolders';
import { resolveVCRMode } from '@/components/p2a-workspace/handover-points/vcr-standard/vcrMode';

// ─── Public contract ─────────────────────────────────────────────────
export interface VCRItemBasic {
  id: string;
  vcr_item: string;
  topic: string | null;
  category_name: string;
  category_code: string;
  status: string;
  prerequisite_id: string | null;
  itemCode: string;
}

// AI-1 Insights contract (rendered, not computed)
export interface VCRInsightFact {
  label: string;
  value: string;
  tone?: 'neutral' | 'amber' | 'red';
  confidence?: 'verified' | 'ai_read' | 'unavailable';
  sourceHref?: string;
}
export interface VCRInsights {
  state: 'ready' | 'pending' | 'unavailable';
  severity?: 'green' | 'amber' | 'red';
  headline?: string;
  facts?: VCRInsightFact[];
  delivering_action?: string;
  approver_check?: string;
  sources?: { label: string; href: string }[];
}

interface VCRItemDetailSheetProps {
  item: VCRItemBasic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrId: string;
  insights?: VCRInsights;
  /**
   * Optional projectId override. When the sheet is opened from a context
   * outside the project route (e.g. My Tasks), useParams cannot resolve
   * the project context; pass it explicitly so approving-party membership
   * resolves correctly.
   */
  projectIdOverride?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
const getAvatarUrl = (avatarPath: string | null | undefined) => {
  if (!avatarPath) return undefined;
  if (avatarPath.startsWith('http')) return avatarPath;
  return `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${avatarPath}`;
};
const getInitials = (name: string) =>
  (name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

// Status pill copy depends on viewer role
const statusPill = (status: string, viewer: 'delivering' | 'approving' | 'observer') => {
  if (viewer === 'approving' && status === 'READY_FOR_REVIEW') {
    return { label: 'Awaiting your review', tone: 'amber' as const };
  }
  switch (status) {
    case 'ACCEPTED':
      return { label: 'Accepted', tone: 'green' as const };
    case 'QUALIFICATION_APPROVED':
      return { label: 'Qualified', tone: 'green' as const };
    case 'READY_FOR_REVIEW':
      return { label: 'Awaiting review', tone: 'amber' as const };
    case 'IN_PROGRESS':
      return { label: 'In progress', tone: 'amber' as const };
    case 'QUALIFICATION_REQUESTED':
      return { label: 'Qualification raised', tone: 'purple' as const };
    case 'REJECTED':
      return { label: 'Returned', tone: 'red' as const };
    default:
      return { label: 'Not started', tone: 'neutral' as const };
  }
};

const pillToneClass: Record<string, string> = {
  neutral: 'border-border text-muted-foreground bg-background',
  amber: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  green: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
  red: 'border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
  purple: 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800',
};

// ─── DB-backed row shapes ─────────────────────────────────────────
// Evidence persists to p2a_vcr_evidence (the same store the insights
// engine reads), keyed by the item's vcr_prerequisite_id.
type EvidenceRow = {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  file_path: string;
  evidence_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Provenance — manual uploads default to source='manual', confirmed=true.
  // Assai-fetched rows are inserted with source='assai', confirmed=false until
  // the delivering party confirms them as evidence-of-record.
  source: 'manual' | 'assai' | null;
  assai_doc_no: string | null;
  assai_rev: string | null;
  confirmed: boolean | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
};
type CommentRow = {
  id: string;
  author_user_id: string | null;
  body: string;
  action_tag: 'Completed' | 'Returned' | 'Accepted' | 'Qualification raised' | null;
  created_at: string;
};
type AuthorProfile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role_name: string | null;
};

const EVIDENCE_BUCKET = 'p2a-attachments';
const sanitizeFile = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);

// ─── Insights block ────────────────────────────────────────────────
// Clean bordered card, no left taper/accent. Renders one of three states:
//   ready       → title + summary sentence + fact rows + optional deep-link
//   pending     → subtle "checking…" line
//   unavailable → honest empty state with a Compute affordance
// Collapsible header, expanded by default.
const InsightsBlock: React.FC<{
  insights?: VCRInsights;
  viewer: 'delivering' | 'approving' | 'observer';
  onRecompute?: () => void;
  recomputing?: boolean;
}> = ({ insights, viewer, onRecompute, recomputing }) => {
  const [open, setOpen] = useState(true);
  const state = insights?.state ?? 'unavailable';
  const severity = insights?.severity;




  // Readiness badge + tone are driven purely by the computed severity.
  const badge =
    severity === 'green'
      ? { label: 'Ready', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900' }
      : severity === 'amber'
      ? { label: 'Partially complete', className: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900' }
      : severity === 'red'
      ? { label: 'Not ready', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900' }
      : state === 'pending'
      ? { label: 'Checking…', className: 'bg-muted text-muted-foreground border-border' }
      : { label: 'Not yet computed', className: 'bg-muted text-muted-foreground border-border' };

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        Insights
      </h3>

      {/* Subtly toned "computed intelligence" panel — very light blue-grey */}
      <div className="rounded-lg border border-sky-100 dark:border-sky-950/60 bg-[#F5F8FC] dark:bg-sky-950/10 px-4 py-3">
        {/* Row 1: readiness badge (left) + Recompute (right) */}
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
              badge.className,
            )}
          >
            {badge.label}
          </span>
          {onRecompute && (
            <button
              type="button"
              onClick={onRecompute}
              disabled={recomputing}
              className="text-[11px] text-primary hover:underline disabled:opacity-50 shrink-0"
            >
              {recomputing ? 'Recomputing…' : 'Recompute'}
            </button>
          )}
        </div>

        {state === 'pending' && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Readiness check running…
          </div>
        )}

        {state === 'unavailable' && (
          <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
            No readiness signal is available for this item yet.
          </p>
        )}

        {state === 'ready' && (
          <>
            {insights?.headline && (
              <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/85">
                {insights.headline}
              </p>
            )}

            {(insights?.facts?.length ?? 0) > 0 && (
              <div className="mt-3 border-t border-sky-100/70 dark:border-sky-950/50 divide-y divide-sky-100/70 dark:divide-sky-950/50">
                {insights!.facts!.map((f, i) => {
                  // Fact-value colour = the fact's own semantic state.
                  // 'amber' / 'red' mark a genuine gap or risk (incomplete
                  // count, outstanding list, breached threshold). Anything
                  // else — including complete/verified values — renders as
                  // default foreground so a green fact never reads as amber.
                  const toneClass =
                    f.tone === 'red'
                      ? 'text-red-700 dark:text-red-300'
                      : f.tone === 'amber'
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-foreground';
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-[12px] text-muted-foreground">{f.label}</span>
                      <span className={cn('text-[12.5px] font-semibold', toneClass)}>
                        {f.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Deep-links intentionally omitted. The seeded "notification
                register" href was a placeholder — no such ORSH route exists
                — so we do not render a dead link. Re-enable this block only
                once `sources[].href` resolves to a real in-app route. */}

            {viewer === 'delivering' && insights?.delivering_action && (
              <p className="mt-2 pt-2 border-t border-sky-100/70 dark:border-sky-950/50 text-[12px] text-foreground/80">
                {insights.delivering_action}
              </p>
            )}
            {viewer === 'approving' && insights?.approver_check && (
              <p className="mt-2 pt-2 border-t border-sky-100/70 dark:border-sky-950/50 text-[12px] text-foreground/80">
                {insights.approver_check}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};


// ─── Confirmation dialog (4 variants share this shell) ────────────
type ConfirmKind = 'mark_complete' | 'raise_qualification' | 'accept' | 'return';

const ConfirmDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: ConfirmKind | null;
  itemCode: string;
  counterparty: string;
  insights?: VCRInsights;
  busy: boolean;
  onConfirm: (note: string) => void;
}> = ({ open, onOpenChange, kind, itemCode, counterparty, insights, busy, onConfirm }) => {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) setNote('');
  }, [open, kind]);

  if (!kind) return null;

  const advisory =
    insights?.state === 'ready' && insights.severity && insights.severity !== 'green'
      ? insights.headline
      : null;

  const cfg = {
    accept: {
      title: 'Accept this item?',
      body: (
        <>
          Accepts <strong>{itemCode}</strong> as ready for handover. {counterparty} will be notified.
        </>
      ),
      noteLabel: 'Acceptance note',
      noteRequired: false,
      placeholder: 'Add a note (optional)…',
      actionLabel: 'Accept item',
      actionClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      advisoryTone: 'amber' as const,
      advisoryWhenGreen: false,
    },
    return: {
      title: 'Return to delivering party?',
      body: (
        <>
          Returns <strong>{itemCode}</strong> to {counterparty} to complete.
        </>
      ),
      noteLabel: 'What needs to change?',
      noteRequired: true,
      placeholder: 'What should they address?',
      actionLabel: 'Return item',
      actionClass: 'bg-foreground text-background hover:bg-foreground/90',
      advisoryTone: 'info' as const,
      advisoryWhenGreen: true,
    },
    mark_complete: {
      title: 'Mark this item complete?',
      body: (
        <>
          Submits <strong>{itemCode}</strong> to {counterparty} for acceptance.
        </>
      ),
      noteLabel: 'Submission note',
      noteRequired: false,
      placeholder: 'Add a note for the approving party (optional)…',
      actionLabel: 'Mark as complete',
      actionClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      advisoryTone: 'amber' as const,
      advisoryWhenGreen: false,
    },
    raise_qualification: {
      title: 'Raise a qualification?',
      body: (
        <>
          Raises a qualification on <strong>{itemCode}</strong>.
        </>
      ),
      noteLabel: 'Qualification reason',
      noteRequired: true,
      placeholder: 'Describe the residual gap and the agreed mitigation…',
      actionLabel: 'Raise qualification',
      actionClass: 'bg-foreground text-background hover:bg-foreground/90',
      advisoryTone: 'amber' as const,
      advisoryWhenGreen: false,
    },
  }[kind];

  const canConfirm = !busy && (!cfg.noteRequired || note.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cfg.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1 leading-relaxed">
            {cfg.body}
          </DialogDescription>
        </DialogHeader>

        {kind === 'return' && (
          <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Their attached evidence is kept. Your reason goes to them so they know what to fix.
          </div>
        )}

        {advisory && cfg.advisoryTone === 'amber' && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            {advisory}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">{cfg.noteLabel}</label>
            <span className={cn('text-[10px]', cfg.noteRequired ? 'text-red-600' : 'text-muted-foreground')}>
              {cfg.noteRequired ? 'Required' : 'Optional'}
            </span>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={cfg.placeholder}
            rows={3}
            className={cn(cfg.noteRequired && note.trim().length === 0 && 'border-red-300 focus-visible:ring-red-300')}
          />
          <p className="text-[10px] text-muted-foreground">Added to the comment thread.</p>
        </div>

        <DialogFooter className="!justify-between sm:!justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canConfirm}
            onClick={() => onConfirm(note.trim())}
            className={cfg.actionClass}
          >
            {busy ? 'Saving…' : cfg.actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Party unit (avatar · name · role · "delivering"/"approving") ──
const PartyUnit: React.FC<{
  side: 'delivering' | 'approving';
  isYou: boolean;
  name: string;
  role: string;
  avatarUrl?: string | null;
}> = ({ side, isYou, name, role, avatarUrl }) => (
  <div className="flex items-center gap-2 min-w-0">
    <Avatar className="h-7 w-7 shrink-0">
      <AvatarImage src={getAvatarUrl(avatarUrl)} />
      <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
    </Avatar>
    <div className="min-w-0 text-xs leading-tight">
      <span className={cn('truncate', isYou && 'font-semibold')}>{isYou ? 'You' : name}</span>
      <span className="text-muted-foreground"> · {side}</span>
      <span className="text-muted-foreground"> · {role}</span>
    </div>
  </div>
);

// ─── Section label primitive ──────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({
  children,
  right,
}) => (
  <div className="flex items-center justify-between mb-2.5">
    <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/80 font-semibold">{children}</h3>
    {right && <div className="text-[10px] text-muted-foreground">{right}</div>}
  </div>
);

// ─── Main component ───────────────────────────────────────────────
export const VCRItemDetailSheet: React.FC<VCRItemDetailSheetProps> = ({
  item,
  open,
  onOpenChange,
  vcrId,
  insights,
  projectIdOverride,
}) => {
  const { id: routeProjectId } = useParams<{ id: string }>();
  const projectId = projectIdOverride || routeProjectId;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delivering parties are resolved from the item's canonical
  // `delivering_party_role_id` via PTM → roster → org precedence (same
  // path used by the Parties tab / useVCRPartiesRollup). The legacy
  // `vcr_item_delivering_parties` junction table is intentionally NOT
  // consulted here — it is empty for role-driven items and produced the
  // "DELIVERING PARTY (0)" empty state seen before this fix.

  // AI-1 Readiness hook is initialised further down, once the canonical vcr_items id
  // has been resolved (some callers pass a prereq id in item.id, and the insights
  // cache is keyed by the canonical id — see the `canonicalItemIdForInsights` block).

  // ─── Load authored item + per-VCR overrides + approving-roles catalog ──
  const { data: vcrItemDetail } = useQuery({
    queryKey: ['vcr-item-detail-v3', item?.id, item?.prerequisite_id, vcrId],
    queryFn: async () => {
      if (!item) return null;

      // ── Resolve the canonical vcr_items row id ──────────────────
      // Some callers pass the prerequisite id in `item.id` (legacy),
      // others pass the vcr_items id. Always prefer the prereq→
      // vcr_item_id link when available, so the drawer works
      // regardless of which convention the caller uses.
      let canonicalVcrItemId: string | null = item.id;
      if (item.prerequisite_id) {
        const { data: pre } = await (supabase as any)
          .from('p2a_vcr_prerequisites')
          .select('vcr_item_id')
          .eq('id', item.prerequisite_id)
          .maybeSingle();
        if (pre?.vcr_item_id) canonicalVcrItemId = pre.vcr_item_id;
      }
      if (!canonicalVcrItemId) return null;

      const { data } = await supabase
        .from('vcr_items')
        .select(`*, delivering_party:roles!vcr_items_delivering_party_role_id_fkey(id, name)`)
        .eq('id', canonicalVcrItemId)
        .maybeSingle();

      // Per-VCR override row (guidance / required-evidence / topic / party roles / N/A)
      let override: any = null;
      if (vcrId && canonicalVcrItemId) {
        const { data: ov } = await (supabase as any)
          .from('p2a_vcr_item_overrides')
          .select('vcr_item_override, topic_override, delivering_party_role_id_override, approving_party_role_ids_override, guidance_notes_override, supporting_evidence_override, is_na, na_reason')
          .eq('handover_point_id', vcrId)
          .eq('vcr_item_id', canonicalVcrItemId)
          .maybeSingle();
        override = ov;
      }

      const effectiveDeliveringRoleId: string | null =
        override?.delivering_party_role_id_override ?? (data as any)?.delivering_party_role_id ?? null;
      const effectiveApprovingRoleIds: string[] =
        (override?.approving_party_role_ids_override as string[] | null) ??
        ((data as any)?.approving_party_role_ids || []);

      const roleIdsToFetch = Array.from(
        new Set([...(effectiveApprovingRoleIds || []), effectiveDeliveringRoleId].filter(Boolean) as string[]),
      );
      let rolesCatalog: { id: string; name: string }[] = [];
      if (roleIdsToFetch.length > 0) {
        const { data: roles } = await supabase.from('roles').select('id, name').in('id', roleIdsToFetch);
        rolesCatalog = (roles as any[]) || [];
      }

      const approving_roles = effectiveApprovingRoleIds
        .map((id) => rolesCatalog.find((r) => r.id === id))
        .filter(Boolean) as { id: string; name: string }[];
      const delivering_role = effectiveDeliveringRoleId
        ? rolesCatalog.find((r) => r.id === effectiveDeliveringRoleId) || (data as any)?.delivering_party
        : (data as any)?.delivering_party || null;

      return {
        ...(data as any),
        canonical_vcr_item_id: canonicalVcrItemId,
        override,
        effective_topic: override?.topic_override ?? (data as any)?.topic ?? item.topic ?? null,
        effective_guidance: override?.guidance_notes_override ?? (data as any)?.guidance_notes ?? null,
        effective_required_evidence: override?.supporting_evidence_override ?? (data as any)?.supporting_evidence ?? null,
        effective_delivering_role_id: effectiveDeliveringRoleId,
        effective_approving_role_ids: effectiveApprovingRoleIds,
        delivering_role,
        approving_roles,
      };
    },
    enabled: open && !!item,
  });

  // AI-1 Readiness — hook drives the block; explicit `insights` prop overrides for tests.
  // Cache is keyed by the canonical vcr_items.id, but some callers still pass a
  // prereq id in item.id. Prefer the resolved canonical id, fall back to item.id.
  const canonicalItemIdForInsights = (vcrItemDetail as any)?.canonical_vcr_item_id ?? item?.id;
  const { insights: liveInsights, recompute } = useVCRItemInsights(vcrId, canonicalItemIdForInsights);
  const effectiveInsights = insights ?? liveInsights;


  // Lifecycle mode (plan vs execution) — derived from the VCR row itself,
  // never from a caller prop that could be stale. resolveVCRMode is the
  // shared boundary used by both overlay entry points.
  const { data: hpRow } = useQuery({
    queryKey: ['vcr-item-drawer-hp', vcrId],
    queryFn: async () => {
      if (!vcrId) return null;
      const { data } = await (supabase as any)
        .from('p2a_handover_points')
        .select('id, execution_plan_status, status, sof_signed_at, pac_signed_at')
        .eq('id', vcrId)
        .maybeSingle();
      return data;
    },
    enabled: open && !!vcrId,
  });
  const vcrMode = useMemo(
    () => resolveVCRMode({
      execution_plan_status: hpRow?.execution_plan_status,
      status: hpRow?.status,
      sof_signed_at: hpRow?.sof_signed_at,
      pac_signed_at: hpRow?.pac_signed_at,
      total_items: 1, // presence of an item row is execution activity
    }),
    [hpRow?.execution_plan_status, hpRow?.status, hpRow?.sof_signed_at, hpRow?.pac_signed_at],
  );
  const isExecutionMode = vcrMode === 'execution';

  // ─── Party resolution — SAME precedence as the Parties tab ─────
  //   Delivering: item's `delivering_party_role_id` role name → holders
  //     via PTM override → scoped roster (portfolio/hub/plant) → org.
  //   Approving:  each `approving_party_role_ids[i]` role name → same
  //     precedence. This replaces the previous split between
  //     `vcr_item_delivering_parties` (always empty for role-driven
  //     items) and `useApprovingPartyHoldersByIds` (org-only fallback),
  //     which produced "(0)" empty states in the drawer even though the
  //     Parties tab resolved the same roles correctly.
  const partyRoleLabels = useMemo(() => {
    const labels: string[] = [];
    if (vcrItemDetail?.delivering_role?.name) labels.push(vcrItemDetail.delivering_role.name);
    (vcrItemDetail?.approving_roles || []).forEach((r: any) => {
      if (r?.name && !labels.includes(r.name)) labels.push(r.name);
    });
    return labels;
  }, [vcrItemDetail?.delivering_role, vcrItemDetail?.approving_roles]);

  const { data: holdersByLabel = {} } = useProjectRoleHolders(
    projectId || undefined,
    partyRoleLabels,
  );

  // Delivering — role holders for the item's delivering role.
  const deliveringParties = useMemo(() => {
    const label = vcrItemDetail?.delivering_role?.name;
    if (!label) return [] as Array<{ user_id: string; full_name: string; avatar_url: string | null; role_name: string }>;
    return (holdersByLabel[label] || []).map((h: any) => ({
      user_id: h.user_id,
      full_name: h.full_name,
      avatar_url: h.avatar_url,
      role_name: label,
    }));
  }, [holdersByLabel, vcrItemDetail?.delivering_role]);

  // Approving-holder map keyed by role id (drives the B2B chip below).
  const approvingHoldersById: Record<string, Array<{ user_id: string; full_name: string; avatar_url: string | null; role_name: string }>> =
    useMemo(() => {
      const out: Record<string, any[]> = {};
      (vcrItemDetail?.approving_roles || []).forEach((role: any) => {
        out[role.id] = (holdersByLabel[role.name] || []).map((h: any) => ({
          user_id: h.user_id,
          full_name: h.full_name,
          avatar_url: h.avatar_url,
          role_name: role.name,
        }));
      });
      return out;
    }, [holdersByLabel, vcrItemDetail?.approving_roles]);


  const { data: prereqDetail } = useQuery({
    queryKey: ['vcr-prereq-detail', item?.prerequisite_id],
    queryFn: async () => {
      if (!item?.prerequisite_id) return null;
      const { data } = await supabase
        .from('p2a_vcr_prerequisites')
        .select('*')
        .eq('id', item.prerequisite_id)
        .maybeSingle();
      return data;
    },
    enabled: open && !!item?.prerequisite_id,
  });

  // Per-approver approval status (drives the ✓ Approved / Pending indicator on each
  // approving-party row). Keyed by approver_user_id so we can map back to the
  // resolved holder shown in the row.
  const { data: approverStatusByUserId = {} } = useQuery({
    queryKey: ['vcr-item-approver-status', item?.prerequisite_id],
    queryFn: async (): Promise<Record<string, string>> => {
      if (!item?.prerequisite_id) return {};
      const { data, error } = await (supabase as any)
        .from('vcr_prerequisite_approvals')
        .select('approver_user_id, status')
        .eq('prerequisite_id', item.prerequisite_id);
      if (error) return {};
      const out: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        if (r.approver_user_id) out[r.approver_user_id] = r.status;
      });
      return out;
    },
    enabled: open && !!item?.prerequisite_id,
  });


  // ─── Status mutation (reuses existing prereq backing) ──────────
  const updateStatus = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!item?.prerequisite_id) throw new Error('No prerequisite linked to this item');
      const updateData: any = { status };
      if (status === 'READY_FOR_REVIEW') updateData.submitted_at = new Date().toISOString();
      else if (status === 'ACCEPTED' || status === 'REJECTED') updateData.reviewed_at = new Date().toISOString();
      const { error } = await supabase
        .from('p2a_vcr_prerequisites')
        .update(updateData)
        .eq('id', item.prerequisite_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-prereq-detail'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-progress-data'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-prerequisites'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-category-items'] });
      queryClient.invalidateQueries({ queryKey: ['my-vcr-item-tasks'] });
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ─── Viewer role resolution (strict — no fallback to delivering) ─
  const deliveringMember = deliveringParties[0] || null;
  const approvingMembers = useMemo(() => {
    const out: Array<{ user_id: string; full_name: string; avatar_url: string | null; role_name: string }> = [];
    Object.values(approvingHoldersById).forEach((holders) => {
      holders.forEach((h) => out.push(h));
    });
    return out;
  }, [approvingHoldersById]);
  const approvingMember =
    approvingMembers.find((m) => m.user_id === user?.id) || approvingMembers[0] || null;

  const viewer: 'delivering' | 'approving' | 'observer' = useMemo(() => {
    if (!user?.id) return 'observer';
    if (deliveringParties.some((m) => m.user_id === user.id)) return 'delivering';
    if (approvingMembers.some((m) => m.user_id === user.id)) return 'approving';
    return 'observer';
  }, [user?.id, deliveringParties, approvingMembers]);



  // ─── DB-backed evidence + comments ──────────────────────────────
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingTypeFor, setPendingTypeFor] = useState<string | null>(null);

  // Required-evidence labels → AI-suggested dropdown options
  const requiredEvidenceText: string = vcrItemDetail?.effective_required_evidence || '';
  const evidenceTypeOptions = useMemo(() => {
    const parsed = requiredEvidenceText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    const opts = parsed.length > 0 ? parsed : ['Document'];
    return [...opts, 'Other / custom'];
  }, [requiredEvidenceText]);
  const defaultEvidenceType = evidenceTypeOptions[0] || 'Document';

  // ── Evidence query (p2a_vcr_evidence keyed by vcr_prerequisite_id) ─
  const evidenceQueryKey = ['vcr-item-evidence-v2', item?.prerequisite_id];
  const { data: evidence = [] } = useQuery({
    queryKey: evidenceQueryKey,
    queryFn: async (): Promise<EvidenceRow[]> => {
      if (!item?.prerequisite_id) return [];
      const { data, error } = await supabase
        .from('p2a_vcr_evidence')
        .select('id, file_name, file_size, file_type, file_path, evidence_type, uploaded_by, created_at, source, assai_doc_no, assai_rev, confirmed, confirmed_by, confirmed_at')
        .eq('vcr_prerequisite_id', item.prerequisite_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data || []) as unknown) as EvidenceRow[];
    },
    enabled: open && !!item?.prerequisite_id,
  });

  // ── Comments query ─────────────────────────────────────────
  const commentsQueryKey = ['vcr-item-comments', vcrId, item?.id];
  const { data: thread = [] } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async (): Promise<CommentRow[]> => {
      if (!item?.id || !vcrId) return [];
      const { data, error } = await supabase
        .from('vcr_item_comments')
        .select('id, author_user_id, body, action_tag, created_at')
        .eq('handover_point_id', vcrId)
        .eq('vcr_item_id', item.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as CommentRow[];
    },
    enabled: open && !!item?.id && !!vcrId,
  });

  // ── Author profiles for thread avatars ─────────────────────
  const authorIds = useMemo(
    () => Array.from(new Set(thread.map((c) => c.author_user_id).filter(Boolean))) as string[],
    [thread],
  );
  const { data: authorProfiles = [] } = useQuery({
    queryKey: ['vcr-item-comment-authors', authorIds.join(',')],
    queryFn: async (): Promise<AuthorProfile[]> => {
      if (authorIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', authorIds);
      const roleIds = Array.from(new Set((data || []).map((p: any) => p.role).filter(Boolean))) as string[];
      let roleMap: Record<string, string> = {};
      if (roleIds.length > 0) {
        const { data: roles } = await supabase.from('roles').select('id, name').in('id', roleIds);
        roleMap = Object.fromEntries((roles || []).map((r: any) => [r.id, r.name]));
      }
      return (data || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role_name: p.role ? roleMap[p.role] || null : null,
      }));
    },
    enabled: authorIds.length > 0,
  });
  const authorById = useMemo(
    () => Object.fromEntries(authorProfiles.map((p) => [p.user_id, p])),
    [authorProfiles],
  );

  // ── Signed-URL viewer ──────────────────────────────────────
  const openSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) {
      toast({ title: 'Could not open file', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  // ── Mutations ──────────────────────────────────────────────
  const uploadEvidence = useMutation({
    mutationFn: async ({ file, evidence_type }: { file: File; evidence_type: string }) => {
      if (!item?.id || !vcrId || !user?.id) throw new Error('Not ready');
      if (!item.prerequisite_id) throw new Error('This item has no linked prerequisite — cannot attach evidence yet.');
      const safe = sanitizeFile(file.name);
      const uid = (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = `${item.prerequisite_id}/${uid}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('p2a_vcr_evidence').insert({
        vcr_prerequisite_id: item.prerequisite_id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        file_type: file.type || null,
        evidence_type,
        uploaded_by: user.id,
      });
      if (insErr) {
        await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
        throw insErr;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evidenceQueryKey }),
    onError: (e: any) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });

  const updateEvidenceType = useMutation({
    mutationFn: async ({ id, evidence_type }: { id: string; evidence_type: string }) => {
      const { error } = await supabase
        .from('p2a_vcr_evidence')
        .update({ evidence_type })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evidenceQueryKey }),
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteEvidence = useMutation({
    mutationFn: async (row: EvidenceRow) => {
      const { error } = await supabase.from('p2a_vcr_evidence').delete().eq('id', row.id);
      if (error) throw error;
      await supabase.storage.from(EVIDENCE_BUCKET).remove([row.file_path]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evidenceQueryKey }),
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  // ── Selma → Assai fetch (doc-number-first). Invokes the edge function which
  //    downloads the binary, uploads to storage, and inserts a provenance-tagged
  //    evidence row. Idempotent on (prereq, doc_no, rev); failures are honest.
  const fetchFromAssai = useMutation({
    mutationFn: async () => {
      if (!item?.prerequisite_id) throw new Error('No prerequisite linked');
      const { data, error } = await supabase.functions.invoke('selma-fetch-assai-evidence', {
        body: { vcr_prerequisite_id: item.prerequisite_id },
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.reason || 'Fetch failed');
      return data as { ok: true; cached?: boolean; assai_doc_no: string; assai_rev: string | null };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: evidenceQueryKey });
      toast({
        title: data?.cached ? 'Already fetched' : 'Fetched from Assai',
        description: `${data?.assai_doc_no}${data?.assai_rev ? ` rev ${data.assai_rev}` : ''} — confirm it as your submission.`,
      });
    },
    onError: (e: any) =>
      toast({ title: 'Assai fetch failed', description: e.message, variant: 'destructive' }),
  });

  // ── Delivering party confirms an Assai-sourced row as evidence-of-record.
  const confirmEvidence = useMutation({
    mutationFn: async (row: EvidenceRow) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('p2a_vcr_evidence')
        .update({ confirmed: true, confirmed_by: user.id, confirmed_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evidenceQueryKey }),
    onError: (e: any) => toast({ title: 'Confirm failed', description: e.message, variant: 'destructive' }),
  });



  const insertComment = useMutation({
    mutationFn: async ({ body, action_tag }: { body: string; action_tag: CommentRow['action_tag'] }) => {
      if (!item?.id || !vcrId || !user?.id) throw new Error('Not ready');
      const { error } = await supabase.from('vcr_item_comments').insert({
        handover_point_id: vcrId,
        vcr_item_id: item.id,
        author_user_id: user.id,
        body,
        action_tag,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsQueryKey }),
    onError: (e: any) => toast({ title: 'Comment failed', description: e.message, variant: 'destructive' }),
  });

  // One-time seed from legacy prereq.comments if thread is empty
  const seededRef = useRef<string | null>(null);
  useEffect(() => {
    if (!item?.id || !vcrId || !user?.id) return;
    if (seededRef.current === item.id) return;
    if (thread.length > 0) {
      seededRef.current = item.id;
      return;
    }
    const legacy = prereqDetail?.comments?.trim();
    if (legacy) {
      seededRef.current = item.id;
      insertComment.mutate({ body: `[Imported] ${legacy}`, action_tag: null });
    }
  }, [item?.id, vcrId, user?.id, thread.length, prereqDetail?.comments]);

  const acceptFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    for (const f of arr) {
      await uploadEvidence.mutateAsync({ file: f, evidence_type: defaultEvidenceType });
    }
    toast({ title: 'Evidence added', description: `${arr.length} file${arr.length > 1 ? 's' : ''} attached.` });
  };

  // ─── Confirmation dialog state ─────────────────────────────────
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);

  const onConfirm = async (note: string) => {
    if (!confirmKind) return;
    const tagMap: Record<ConfirmKind, CommentRow['action_tag']> = {
      mark_complete: 'Completed',
      raise_qualification: 'Qualification raised',
      accept: 'Accepted',
      return: 'Returned',
    };
    const statusMap: Record<ConfirmKind, string> = {
      mark_complete: 'READY_FOR_REVIEW',
      raise_qualification: 'QUALIFICATION_REQUESTED',
      accept: 'ACCEPTED',
      return: 'IN_PROGRESS',
    };
    try {
      await updateStatus.mutateAsync({ status: statusMap[confirmKind] });
      const tag = tagMap[confirmKind];
      const body = note?.trim()
        ? note.trim()
        : `(${(tag || '').toLowerCase()})`;
      await insertComment.mutateAsync({ body, action_tag: tag });
      setConfirmKind(null);
      onOpenChange(false);
      toast({ title: 'Done' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };


  // Guidance/Required-evidence collapse state (declared before any early return for hooks-rules safety)
  // Defaults: Guidance collapsed (verbose reference); Required Evidence expanded (action-relevant).
  const [guidanceOpen, setGuidanceOpenLocal] = useState(false);
  const [requiredEvidenceOpen, setRequiredEvidenceOpen] = useState(true);
  // B2B chip: which approving-role rows are toggled to the partner holder
  const [b2bExpandedRoleIds, setB2bExpandedRoleIds] = useState<Set<string>>(new Set());

  if (!item) return null;

  const pill = statusPill(item.status, viewer);
  const deliveringName = deliveringMember?.full_name || vcrItemDetail?.delivering_role?.name || 'Delivering party';
  const approvingName = approvingMember?.full_name || (vcrItemDetail?.approving_roles?.[0]?.name) || 'Approving party';

  // Delivering-party edit lock (B1-LOCK): the delivering party may add
  // evidence / comments only while the item is not yet submitted for
  // review. On submit (READY_FOR_REVIEW) the record freezes; a Return
  // sets it back to IN_PROGRESS and re-opens edits.
  const isTerminalStatus =
    item.status === 'ACCEPTED' || item.status === 'QUALIFICATION_APPROVED' || item.status === 'REJECTED';
  const deliveringCanEdit =
    viewer === 'delivering' && !isTerminalStatus && item.status !== 'READY_FOR_REVIEW';
  const approverAwaitingSubmission =
    viewer === 'approving' && item.status !== 'READY_FOR_REVIEW' && !isTerminalStatus;

  // Party rows for the DELIVERING PARTY / APPROVING PARTIES sections
  const deliveringRoleName: string =
    vcrItemDetail?.delivering_role?.name || deliveringMember?.role_name || 'Delivering party';
  const partyRow = (
    role: string,
    holder: { user_id: string; full_name: string; avatar_url: string | null } | null,
    isYou: boolean,
    trailing?: React.ReactNode,
    statusDot?: React.ReactNode,
  ) => (
    <div
      key={`${role}-${holder?.user_id ?? 'unassigned'}`}
      className="flex items-center gap-3 py-2"
    >
      {holder ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={getAvatarUrl(holder.avatar_url)} />
          <AvatarFallback className="text-[10px]">{getInitials(holder.full_name)}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1.5 min-w-0">
          {holder ? (
            <span className={cn('text-[13px] truncate', isYou && 'font-semibold')}>
              {isYou ? `${holder.full_name} (you)` : holder.full_name}
            </span>
          ) : (
            <span className="text-[12px] italic text-muted-foreground truncate">No holder assigned</span>
          )}
          {trailing && <span className="shrink-0">{trailing}</span>}
        </div>
        <div className="text-[11px] text-muted-foreground truncate" title={role}>{role}</div>
      </div>
      {statusDot && <div className="shrink-0">{statusDot}</div>}
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl overflow-hidden flex flex-col p-0 !z-modal-critical" data-rm-safe hideClose>
          {/* Header — ID chip leads, status on the right, single-line meta row below title */}
          <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-[10px] rounded-md font-mono font-medium bg-muted/50 text-foreground/80">
                {item.itemCode}
              </Badge>
              <Badge
                variant="outline"
                className={cn('text-[10px] rounded-full px-2.5 py-0.5 font-normal', pillToneClass[pill.tone])}
              >
                {pill.label}
              </Badge>
            </div>
            <SheetTitle className="text-[15px] leading-snug font-semibold">{item.vcr_item}</SheetTitle>
            <SheetDescription className="sr-only">VCR item detail</SheetDescription>
            <div className="flex flex-nowrap items-center gap-1.5 pt-0.5 min-w-0 overflow-hidden whitespace-nowrap">
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                {item.category_name}
              </span>
              {vcrItemDetail?.effective_topic && (
                <>
                  <span className="text-[11px] text-muted-foreground/60 shrink-0">·</span>
                  <span className="inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground shrink-0 max-w-[220px] truncate">
                    {vcrItemDetail.effective_topic}
                  </span>
                </>
              )}
            </div>
          </SheetHeader>

          {/* Body */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5 space-y-6">
              {/* Delivering party (A3) */}
              <section>
                <SectionLabel>Delivering party ({deliveringParties.length || (vcrItemDetail?.delivering_role ? 1 : 0)})</SectionLabel>
                <div className="rounded-lg border border-border/60 divide-y divide-border/40 px-3">
                  {deliveringParties.length > 0
                    ? deliveringParties.map((m) =>
                        partyRow(deliveringRoleName, m, user?.id === m.user_id),
                      )
                    : partyRow(deliveringRoleName, null, false)}
                </div>
              </section>

              {/* Approving parties (A3 + A4 B2B chip) */}
              <section>
                <SectionLabel>
                  Approving parties ({(vcrItemDetail?.approving_roles || []).length})
                </SectionLabel>
                <div className="rounded-lg border border-border/60 divide-y divide-border/40 px-3">
                  {(vcrItemDetail?.approving_roles || []).length === 0 ? (
                    <p className="text-[11px] italic text-muted-foreground py-2">No approving parties configured.</p>
                  ) : (
                    (vcrItemDetail?.approving_roles || []).map((role: { id: string; name: string }) => {
                      const holders = (approvingHoldersById as any)[role.id] || [];
                      const isB2B = holders.length === 2;
                      const showPartner = b2bExpandedRoleIds.has(role.id) && isB2B;
                      const shown = showPartner ? holders[1] : holders[0];
                      const isYou = !!(user?.id && shown?.user_id === user.id);
                      const chip = isB2B ? (
                        <button
                          type="button"
                          onClick={() =>
                            setB2bExpandedRoleIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(role.id)) next.delete(role.id);
                              else next.add(role.id);
                              return next;
                            })
                          }
                          aria-pressed={showPartner}
                          title={showPartner ? 'Show delivering-side holder' : 'Show B2B partner holder'}
                          className={cn(
                            'inline-flex items-center justify-center text-[9px] font-semibold tracking-wider px-1.5 h-4 rounded-md border transition-colors',
                            showPartner
                              ? 'bg-amber-200 text-amber-900 border-amber-400 ring-1 ring-amber-400 dark:bg-amber-800/60 dark:text-amber-100 dark:border-amber-600'
                              : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
                          )}
                        >
                          B2B
                        </button>
                      ) : null;
                      const statusStr = shown?.user_id ? (approverStatusByUserId as any)[shown.user_id] : null;
                      const approved = statusStr === 'APPROVED' || statusStr === 'ACCEPTED';
                      const statusDot = shown ? (
                        approved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approved
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Pending</span>
                        )
                      ) : null;
                      return partyRow(role.name, shown || null, isYou, chip, statusDot);
                    })
                  )}
                </div>
              </section>

              {/* Insights — execution-only (Part 0) */}
              {isExecutionMode && (
                <InsightsBlock
                  insights={effectiveInsights}
                  viewer={viewer}
                  onRecompute={insights ? undefined : () => recompute.mutate()}
                  recomputing={recompute.isPending}
                />
              )}


              {/* Guidance notes — collapsed by default; chevron toggle */}
              <section>
                <button
                  type="button"
                  onClick={() => setGuidanceOpenLocal((v) => !v)}
                  className="w-full flex items-center justify-between mb-2.5 group"
                  aria-expanded={guidanceOpen}
                >
                  <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/80 font-semibold">
                    Guidance notes
                  </h3>
                  {guidanceOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </button>
                {guidanceOpen && (
                  vcrItemDetail?.effective_guidance ? (
                    <p className="text-[13px] text-foreground leading-relaxed mt-1 whitespace-pre-wrap">
                      {vcrItemDetail.effective_guidance}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic mt-1">No guidance notes for this item.</p>
                  )
                )}
              </section>

              {/* Required evidence — expanded by default; chevron toggle */}
              <section>
                <button
                  type="button"
                  onClick={() => setRequiredEvidenceOpen((v) => !v)}
                  className="w-full flex items-center justify-between mb-2.5 group"
                  aria-expanded={requiredEvidenceOpen}
                >
                  <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/80 font-semibold">
                    Required evidence
                  </h3>
                  {requiredEvidenceOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </button>
                {requiredEvidenceOpen && (
                  <p className="text-[13px] text-foreground leading-relaxed mt-1">
                    {requiredEvidenceText || (
                      <span className="text-muted-foreground italic">No required evidence specified.</span>
                    )}
                  </p>
                )}
              </section>

              {/* Evidence — execution-only (Part 0) */}
              {isExecutionMode && (
              <section>
                <SectionLabel right={viewer !== 'delivering' && evidence.length > 0 ? 'Submitted by delivering party' : undefined}>
                  Evidence
                </SectionLabel>

                {/* Selma → Assai doc-number-first fetch.
                    Shown to delivering when the requirement names a controlled
                    document and no Assai-sourced row exists yet. Auto-fetched
                    rows are advisory until the delivering party confirms them. */}
                {(() => {
                  const assaiDocNo: string | null = (prereqDetail as any)?.assai_doc_no || null;
                  const assaiRev: string | null = (prereqDetail as any)?.assai_rev || null;
                  const hasAssaiRow = evidence.some((e) => e.source === 'assai' && e.assai_doc_no === assaiDocNo);
                  if (!assaiDocNo || !deliveringCanEdit || hasAssaiRow) return null;
                  return (
                    <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2.5 mb-2 flex items-start gap-3">
                      <ExternalLink className="h-4 w-4 text-blue-700 dark:text-blue-300 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-blue-900 dark:text-blue-100">
                          Selma can fetch this from Assai
                        </div>
                        <div className="text-[11px] text-blue-800/80 dark:text-blue-200/80 truncate">
                          {assaiDocNo}{assaiRev ? ` · rev ${assaiRev}` : ''}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={fetchFromAssai.isPending}
                        onClick={() => fetchFromAssai.mutate()}
                      >
                        {fetchFromAssai.isPending ? (
                          <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Fetching…</>
                        ) : (
                          'Fetch from Assai'
                        )}
                      </Button>
                    </div>
                  );
                })()}


                {evidence.length === 0 ? (
                  !deliveringCanEdit ? (
                    <p className="text-xs text-muted-foreground italic">
                      {viewer === 'delivering' && item.status === 'READY_FOR_REVIEW'
                        ? 'Submitted — evidence is locked until the approver reviews or returns it.'
                        : 'No evidence submitted yet.'}
                    </p>
                  ) : !item.prerequisite_id ? (
                    <p className="text-xs text-muted-foreground italic">
                      Evidence can't be attached yet — this item isn't linked to a delivery prerequisite.
                    </p>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        acceptFiles(e.dataTransfer.files);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'rounded-lg border border-dashed px-4 py-8 text-center cursor-pointer transition',
                        dragOver
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/60 hover:bg-muted/40',
                      )}
                    >
                      <div className="text-sm font-medium text-primary">Add evidence — drop files or browse</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Saved on upload · type detected automatically
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          acceptFiles(e.target.files);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      />
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    {evidence.map((f) => {
                      const typeLabel = f.evidence_type || defaultEvidenceType;
                      return (
                      <div
                        key={f.id}
                        className="rounded-lg border border-border px-3 py-2.5 flex items-start gap-3"
                      >
                        <div className="h-9 w-9 rounded bg-muted/60 shrink-0 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <button
                            type="button"
                            onClick={() => openSignedUrl(f.file_path)}
                            className="text-[13px] font-medium truncate text-left hover:underline"
                          >
                            {f.file_name}
                          </button>
                          <div className="flex items-center gap-2 flex-wrap">
                            {!deliveringCanEdit ? (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {typeLabel}
                              </Badge>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[10px] px-2 py-0.5 hover:bg-blue-100 transition">
                                    <span className="text-[9px] text-blue-600/80 dark:text-blue-400/80">AI:</span>
                                    {typeLabel}
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                  {evidenceTypeOptions.map((opt) => (
                                    <DropdownMenuItem
                                      key={opt}
                                      onSelect={() => updateEvidenceType.mutate({ id: f.id, evidence_type: opt })}
                                      className={cn(opt === typeLabel && 'font-semibold')}
                                    >
                                      {opt}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {fmtBytes(f.file_size || 0)} · {format(new Date(f.created_at), 'd MMM')}
                            </span>
                            {f.source === 'assai' && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-normal border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                                title={`Assai · ${f.assai_doc_no || ''}${f.assai_rev ? ` rev ${f.assai_rev}` : ''}`}
                              >
                                Assai · {f.assai_doc_no}{f.assai_rev ? ` rev ${f.assai_rev}` : ''}
                              </Badge>
                            )}
                            {f.source === 'assai' && !f.confirmed && viewer !== 'delivering' && (
                              <Badge variant="outline" className={cn('text-[10px] font-normal', pillToneClass.amber)}>
                                Pending delivering confirmation
                              </Badge>
                            )}
                            {f.source === 'assai' && f.confirmed && (
                              <Badge variant="outline" className={cn('text-[10px] font-normal', pillToneClass.green)}>
                                Confirmed as submission
                              </Badge>
                            )}
                            {f.source === 'assai' && !f.confirmed && viewer === 'delivering' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px]"
                                disabled={confirmEvidence.isPending}
                                onClick={() => confirmEvidence.mutate(f)}
                              >
                                Confirm as submission
                              </Button>
                            )}
                          </div>
                        </div>
                        {!deliveringCanEdit ? null : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteEvidence.mutate(f)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      );
                    })}
                    {deliveringCanEdit && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-primary hover:underline"
                      >
                        Add evidence
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        acceptFiles(e.target.files);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    />
                  </div>
                )}
              </section>
              )}

              {/* Comments — execution-only (Part 0) */}
              {isExecutionMode && (
              <section>
                <SectionLabel>Comments</SectionLabel>
                {thread.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {thread.map((c) => {
                      const prof = c.author_user_id ? authorById[c.author_user_id] : undefined;
                      const isYou = c.author_user_id && user?.id && c.author_user_id === user.id;
                      const authorName = isYou
                        ? prof?.full_name || 'You'
                        : prof?.full_name || 'Unknown';
                      const roleName = prof?.role_name || '';
                      const tag = c.action_tag;
                      return (
                        <div key={c.id} className="flex items-start gap-2.5">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={getAvatarUrl(prof?.avatar_url)} />
                            <AvatarFallback className="text-[10px]">{getInitials(authorName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">{authorName}</span>
                              {roleName && <span> · {roleName}</span>}
                              <span> · {format(new Date(c.created_at), 'd MMM')}</span>
                              {tag && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'ml-2 text-[9px] font-normal',
                                    tag === 'Accepted' && pillToneClass.green,
                                    tag === 'Returned' && pillToneClass.red,
                                    tag === 'Completed' && pillToneClass.amber,
                                    tag === 'Qualification raised' && pillToneClass.purple,
                                  )}
                                >
                                  {tag}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[13px] text-foreground/90 mt-0.5 leading-relaxed whitespace-pre-wrap">
                              {c.body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Composer: approvers may always comment (append-only,
                    audit-logged — useful for early flagging even before the
                    delivering party has submitted). Delivering party may
                    comment only while unlocked (B1-LOCK). Observers: never. */}
                {(viewer === 'approving' || deliveringCanEdit) && (
                  composerOpen ? (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        rows={2}
                        placeholder="Add a comment…"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setComposerOpen(false); setComposerText(''); }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!composerText.trim() || insertComment.isPending}
                          onClick={async () => {
                            const text = composerText.trim();
                            if (!text) return;
                            await insertComment.mutateAsync({ body: text, action_tag: null });
                            setComposerText('');
                            setComposerOpen(false);
                          }}
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setComposerOpen(true)}
                      className="mt-3 text-xs text-primary hover:underline"
                    >
                      Add comment
                    </button>
                  )
                )}
                {viewer === 'delivering' && !deliveringCanEdit && !isTerminalStatus && (
                  <p className="mt-3 text-[11px] text-muted-foreground italic">
                    Comments are locked while the item is awaiting approver review.
                  </p>
                )}
              </section>
              )}
            </div>
          </ScrollArea>

          {/* Footer — plan mode hides it entirely (Part 0). Execution mode
              shows role-aware CTAs with submit-lock (B1-LOCK) and a quiet
              "awaiting delivering party" state for approvers (Part 0 precondition).
              A1: no duplicate status pill. A10: no bottom Close button. */}
          {isExecutionMode && (() => {
            const canDeliver =
              viewer === 'delivering' && !isTerminalStatus && item.status !== 'READY_FOR_REVIEW';
            const canApprove =
              viewer === 'approving' && item.status === 'READY_FOR_REVIEW';
            const showFooter = canDeliver || canApprove || approverAwaitingSubmission;
            if (!showFooter) return null;
            return (
              <div className="border-t bg-background px-6 py-3 flex items-center justify-end shrink-0">
                {canApprove ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmKind('return')}>
                      Return to delivering party
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setConfirmKind('accept')}
                    >
                      Accept item
                    </Button>
                  </div>
                ) : canDeliver ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmKind('raise_qualification')}>
                      Raise qualification
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setConfirmKind('mark_complete')}
                    >
                      Mark as complete
                    </Button>
                  </div>
                ) : approverAwaitingSubmission ? (
                  <span className="text-[11px] text-muted-foreground italic">
                    Awaiting delivering party
                  </span>
                ) : null}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmKind !== null}
        onOpenChange={(v) => !v && setConfirmKind(null)}
        kind={confirmKind}
        itemCode={item.itemCode}
        counterparty={
          confirmKind === 'accept' || confirmKind === 'return'
            ? deliveringName
            : approvingName
        }
        insights={effectiveInsights}
        busy={updateStatus.isPending}
        onConfirm={onConfirm}
      />
    </>
  );
};
