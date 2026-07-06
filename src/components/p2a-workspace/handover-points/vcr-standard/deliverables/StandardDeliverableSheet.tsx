import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ChipTone } from './DeliverableRow';

const CHIP_TONES: Record<ChipTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  red:     'bg-red-50 text-red-700 border-red-200',
  slate:   'bg-slate-100 text-muted-foreground border-slate-200',
};

export interface DeliverableSheetField {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: string;             // "System", "Training", "Procedure", …
  title: string;
  subtitle?: string | null;
  chipLabel: string;
  chipTone: ChipTone;
  fields: DeliverableSheetField[];
  notes?: string | null;
}

/**
 * Read-only detail drawer for standardized-VCR deliverable rows.
 * Same shape as PrerequisiteDetailSheet (Sheet + right-side, z-modal-critical)
 * so it stacks above the VCR overlay. No edits; wiring approvals/edits will
 * come after the drawer surface is confirmed.
 */
export const StandardDeliverableSheet: React.FC<Props> = ({
  open, onOpenChange, kind, title, subtitle, chipLabel, chipTone, fields, notes,
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col">
      <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground mb-1">
              {kind}
            </div>
            <SheetTitle className="text-[15px] leading-snug">{title}</SheetTitle>
            {subtitle && (
              <SheetDescription className="text-[12px] mt-1 truncate">{subtitle}</SheetDescription>
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
        <div className="px-5 py-4 space-y-4">
          {fields.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {fields.map((f, i) => (
                <div key={i} className={cn(f.full && 'col-span-2')}>
                  <div className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80 mb-0.5">
                    {f.label}
                  </div>
                  <div className="text-[12.5px] text-foreground leading-relaxed break-words">
                    {f.value ?? <span className="text-muted-foreground/60">—</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {notes && (
            <>
              <Separator />
              <div>
                <div className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80 mb-1">
                  Notes
                </div>
                <div className="text-[12.5px] text-foreground leading-relaxed whitespace-pre-wrap">
                  {notes}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
);
