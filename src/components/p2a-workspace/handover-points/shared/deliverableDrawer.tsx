import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Download, ExternalLink, FileText, Paperclip } from 'lucide-react';
import { ChipTone } from '../vcr-standard/deliverables/DeliverableRow';

/* ================================================================
 * Shared read-only drawer primitives used by all Standard*Tab
 * detail drawers on the VCR side. Also intended for reuse by future
 * Plan-side detail views (Add*Sheets are create-time forms; not shared).
 * ================================================================ */

const CHIP_TONES: Record<ChipTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  red:     'bg-red-50 text-red-700 border-red-200',
  slate:   'bg-slate-100 text-muted-foreground border-slate-200',
};

/* ---------------- Shell ---------------- */

interface ShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: string;
  title: string;
  subtitle?: string | null;
  chipLabel: string;
  chipTone: ChipTone;
  children: React.ReactNode;
}

export const DeliverableDetailShell: React.FC<ShellProps> = ({
  open, onOpenChange, kind, title, subtitle, chipLabel, chipTone, children,
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent
      side="right"
      hideClose
      className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col"
    >

      <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground mb-1">
              {kind}
            </div>
            <SheetTitle className="text-[15px] leading-snug">{title}</SheetTitle>
            {subtitle && (
              <SheetDescription className="text-[12px] mt-1 truncate">
                {subtitle}
              </SheetDescription>
            )}
          </div>
          <span
            className={cn(
              'flex-none text-[10.5px] font-bold rounded-full border px-2 py-0.5 mt-0.5',
              CHIP_TONES[chipTone],
            )}
          >
            {chipLabel}
          </span>
        </div>
      </SheetHeader>
      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-5">{children}</div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
);

/* ---------------- Section ---------------- */

export const Section: React.FC<{ title?: string; children: React.ReactNode }> = ({
  title, children,
}) => (
  <div className="space-y-2">
    {title && (
      <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">
        {title}
      </div>
    )}
    {children}
  </div>
);

export const DrawerDivider: React.FC = () => <Separator className="my-1" />;

/* ---------------- Labeled fields ---------------- */

export interface LabeledFieldProps {
  label: string;
  value?: React.ReactNode;
  full?: boolean;
}

export const LabeledField: React.FC<LabeledFieldProps> = ({ label, value, full }) => (
  <div className={cn(full && 'col-span-2')}>
    <div className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80 mb-0.5">
      {label}
    </div>
    <div className="text-[12.5px] text-foreground leading-relaxed break-words">
      {value ?? <span className="text-muted-foreground/60">—</span>}
    </div>
  </div>
);

export const FieldGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
);

/* ---------------- Party cell (avatar + name + role) ---------------- */

const initials = (name: string) =>
  name.split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

export const PartyCell: React.FC<{
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
}> = ({ name, role, avatarUrl, size = 'md' }) => (
  <div className="flex items-center gap-2">
    <Avatar className={size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="text-[10px] bg-slate-200 text-slate-700">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <div className="text-[12.5px] font-medium leading-tight truncate">{name}</div>
      {role && <div className="text-[10.5px] text-muted-foreground truncate">{role}</div>}
    </div>
  </div>
);

/* ---------------- Assai link ---------------- */

export const AssaiLink: React.FC<{ docCode?: string | null; label?: string }> = ({
  docCode, label = 'Open in Assai',
}) => {
  if (!docCode) {
    return <span className="text-[12.5px] text-muted-foreground/60">Not linked</span>;
  }
  const href = `https://client.assaisoftware.com/documents/${encodeURIComponent(docCode)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
    >
      {label} <ExternalLink className="w-3 h-3" />
    </a>
  );
};

/* ---------------- Evidence / attachments ---------------- */

export interface EvidenceItem {
  id: string;
  name: string;
  kind?: string;
  url?: string | null;
}

export const EvidenceRow: React.FC<{ item: EvidenceItem }> = ({ item }) => (
  <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
    <div className="flex items-center gap-2 min-w-0">
      <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium truncate">{item.name}</div>
        {item.kind && (
          <div className="text-[10.5px] text-muted-foreground truncate">{item.kind}</div>
        )}
      </div>
    </div>
    {item.url ? (
      <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-[11px]">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          <Download className="w-3 h-3" /> Download
        </a>
      </Button>
    ) : (
      <span className="text-[10.5px] text-muted-foreground">No file</span>
    )}
  </div>
);

export const EvidenceList: React.FC<{
  items?: EvidenceItem[] | null;
  emptyLabel?: string;
}> = ({ items, emptyLabel = 'No supporting evidence uploaded yet.' }) => {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 px-3 py-3 text-[12px] text-muted-foreground text-center">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <EvidenceRow key={i.id} item={i} />
      ))}
    </div>
  );
};

/* ---------------- Approval log ---------------- */

export interface ApprovalLogEntry {
  approverName: string;
  approverRole?: string | null;
  approverAvatarUrl?: string | null;
  action?: string; // "Approved", "Reviewed", "Rejected"
  comment?: string | null;
  date?: string | null;
}

export const ApprovalLog: React.FC<{
  entries?: ApprovalLogEntry[] | null;
  emptyLabel?: string;
}> = ({ entries, emptyLabel = 'No approvals recorded yet.' }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 px-3 py-3 text-[12px] text-muted-foreground text-center">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <div key={i} className="rounded-md border border-border/60 p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <PartyCell
              name={e.approverName}
              role={e.approverRole || undefined}
              avatarUrl={e.approverAvatarUrl}
              size="sm"
            />
            <div className="text-right shrink-0">
              {e.action && (
                <div className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wide">
                  {e.action}
                </div>
              )}
              {e.date && (
                <div className="text-[10.5px] text-muted-foreground">{e.date}</div>
              )}
            </div>
          </div>
          {e.comment && (
            <div className="text-[12px] text-foreground/90 leading-relaxed mt-1">
              {e.comment}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ---------------- Batch list (Maintenance S/4HANA) ---------------- */

export interface BatchItem {
  code: string;
  title: string;
  assets?: number;
  status: string;
}

export const BatchList: React.FC<{ batches: BatchItem[] }> = ({ batches }) => (
  <div className="rounded-md border border-border/60 divide-y divide-border/40 overflow-hidden">
    {batches.map((b) => {
      const s = b.status.toLowerCase();
      const tone =
        s === 'approved'
          ? 'bg-emerald-50 text-emerald-700'
          : s.includes('review') || s.includes('load')
          ? 'bg-blue-50 text-blue-700'
          : 'bg-slate-100 text-muted-foreground';
      return (
        <div
          key={b.code}
          className="flex items-center justify-between gap-2 px-3 py-2 text-[12px]"
        >
          <div className="min-w-0">
            <div className="font-mono font-semibold text-foreground">{b.code}</div>
            <div className="text-muted-foreground truncate">{b.title}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {typeof b.assets === 'number' && (
              <span className="text-[10.5px] font-medium text-muted-foreground">
                {b.assets} assets
              </span>
            )}
            <span
              className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5', tone)}
            >
              {b.status}
            </span>
          </div>
        </div>
      );
    })}
  </div>
);

/* ---------------- Chip (inline body) ---------------- */

export const InlineChip: React.FC<{ tone: ChipTone; children: React.ReactNode }> = ({
  tone, children,
}) => (
  <span
    className={cn(
      'inline-flex text-[10.5px] font-bold rounded-full border px-2 py-0.5',
      CHIP_TONES[tone],
    )}
  >
    {children}
  </span>
);

/* ---------------- Tag list ---------------- */

export const TagList: React.FC<{ items?: (string | null | undefined)[] | null }> = ({
  items,
}) => {
  const clean = (items || []).filter(Boolean) as string[];
  if (!clean.length) return <span className="text-muted-foreground/60">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {clean.map((t, i) => (
        <span
          key={i}
          className="text-[10.5px] font-medium rounded-full bg-slate-100 text-slate-700 px-2 py-0.5"
        >
          {t}
        </span>
      ))}
    </div>
  );
};

/* ---------------- Icons re-exported for tabs ---------------- */
export { FileText };
