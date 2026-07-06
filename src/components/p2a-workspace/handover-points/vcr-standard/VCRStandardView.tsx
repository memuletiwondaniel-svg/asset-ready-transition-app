import React, { useState } from 'react';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3, List, AlertTriangle, MessageSquare, Users, Award,
  Layers, Eye, GraduationCap, Book, FileText, ClipboardList, Wrench,
  X, Trash2, Check, Lock, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint, useHandoverPointSystems } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useVCRQualifications } from '../../hooks/useVCRQualifications';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';
import { PrereqStatus, standardPill, rollup } from './standardStatus';

// Phase-1 tabs (fully redesigned)
import { StandardOverviewTab } from './StandardOverviewTab';
import { StandardItemsTab } from './StandardItemsTab';
import { StandardQualificationsTab } from './StandardQualificationsTab';
import { StandardPACTab } from './StandardPACTab';
import { StandardSOFTab } from './StandardSOFTab';
import { StandardPartiesTab } from './StandardPartiesTab';
import { useVCRRev } from './useVCRRev';
import { computeLifecycle, useVCRLifecycleSignals } from './useVCRLifecycle';
import { useVCRProjectContext } from './useVCRProjectContext';

// Re-parented existing components (no visual changes, no phase banners)
import { VCRAssuranceTab } from '@/components/widgets/VCRAssuranceTab';

// Phase-2.3 deliverable tabs — shared row template, real data only.
import { StandardSystemsTab } from './deliverables/StandardSystemsTab';
import { StandardWitnessHoldsTab } from './deliverables/StandardWitnessHoldsTab';
import { StandardTrainingTab } from './deliverables/StandardTrainingTab';
import { StandardProceduresTab } from './deliverables/StandardProceduresTab';
import { StandardCritDocsTab } from './deliverables/StandardCritDocsTab';
import { StandardRegistersTab } from './deliverables/StandardRegistersTab';
import { StandardMaintenanceTab } from './deliverables/StandardMaintenanceTab';

import { DeleteVCRDialog } from '../DeleteVCRDialog';

type TabId =
  | 'overview' | 'items' | 'qualifications' | 'comments' | 'parties' | 'sof' | 'pac'
  | 'systems' | 'witnessholds' | 'training' | 'procedures' | 'critdocs' | 'registers' | 'maintenance';

interface Props {
  handoverPoint: P2AHandoverPoint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  projectId?: string;
  projectCode?: string;
  /** Retained but no longer surfaced in the header — mode badge was QA-only. */
  debugMode?: string;
}

/** Header progress bar removed per design — the sole progress bar lives on the
 *  Overview Progress card. Keeping counts here would duplicate that surface. */

/** D6 — nav row: muted icon, near-black label, soft-blue pill on active.
 *  No right-side vertical bar (that reads as noise); active row is the pill. */
const NavItem: React.FC<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  count?: number;
  liveCount?: { value: number; tone: 'amber' | 'red' | 'emerald' };
  tick?: boolean;
  locked?: boolean;
  onClick: () => void;
}> = ({ label, icon: Icon, active, count, liveCount, tick, locked, onClick }) => (
  <button
    onClick={onClick}
    disabled={locked}
    className={cn(
      'w-full flex items-center justify-between gap-2 px-3 py-2 mx-1.5 rounded-md text-[12.5px] text-left transition',
      active
        ? 'bg-blue-100/70 text-blue-800 font-semibold'
        : 'text-slate-800 hover:bg-muted/50',
      locked && 'opacity-50 cursor-not-allowed'
    )}
  >
    <span className="flex items-center gap-2.5 min-w-0">
      <Icon className={cn('w-3.5 h-3.5 flex-none', active ? 'text-blue-700' : 'text-slate-400')} />
      <span className="truncate">{label}</span>
      {locked && <Lock className="w-3 h-3 flex-none text-muted-foreground/60" />}
    </span>
    {tick && <Check className="w-3.5 h-3.5 text-emerald-600 flex-none" />}
    {liveCount && (
      <span className={cn(
        'text-[10px] font-semibold rounded-full px-1.5',
        liveCount.tone === 'amber' && 'bg-amber-50 text-amber-700',
        liveCount.tone === 'red' && 'bg-red-50 text-red-700',
        liveCount.tone === 'emerald' && 'bg-emerald-50 text-emerald-700',
      )}>
        {liveCount.value}
      </span>
    )}
    {!liveCount && !tick && count !== undefined && count > 0 && (
      <span className="text-[10px] bg-slate-100 text-muted-foreground/70 rounded-full px-1.5">{count}</span>
    )}
  </button>
);

/** D2 — strip the project prefix from vcr_code so the title reads "VCR-02: OSBL",
 *  not "VCR-DP300-02: OSBL". Preserves the raw code when it's already short. */
const shortVcrCode = (raw: string): string => {
  // "VCR-DP300-02" → "VCR-02"; "VCR-02" → "VCR-02"
  const m = raw.match(/^(VCR)-.+-(\d+[A-Za-z]?)$/i);
  return m ? `${m[1]}-${m[2]}` : raw;
};

export const VCRStandardView: React.FC<Props> = ({
  handoverPoint, open, onOpenChange, onDelete, isDeleting, projectId, projectCode,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showDelete, setShowDelete] = useState(false);

  const { prerequisites } = useVCRPrerequisites(handoverPoint.id);
  const { qualifications } = useVCRQualifications(handoverPoint.id);
  const { systems } = useHandoverPointSystems(handoverPoint.id);
  const { data: hc } = useVCRHydrocarbonStatus(handoverPoint.id);
  const { data: revValue } = useVCRRev(handoverPoint.id);
  const { data: lifecycleSignals } = useVCRLifecycleSignals(handoverPoint.id);
  const { data: projectCtx } = useVCRProjectContext(handoverPoint.handover_plan_id);

  const counts = rollup(prerequisites.map(p => p.status as PrereqStatus));
  const openQuals = qualifications.filter(q => q.status === 'PENDING').length;
  // Comments = discipline statements in + interdisciplinary summary (if present).
  const commentsCount =
    (lifecycleSignals?.disciplineStatementsIn ?? 0) +
    (lifecycleSignals?.interdisciplinarySignedAt ? 1 : 0);
  const isHC = hc?.status === 'HC';

  // D3 — single-source-of-truth lifecycle. Drives D1 colour + D7 expansion.
  const lifecycle = computeLifecycle({
    counts,
    isHC,
    execution_plan_status: handoverPoint.execution_plan_status,
    sof_signed_at: handoverPoint.sof_signed_at,
    pac_signed_at: handoverPoint.pac_signed_at,
    interdisciplinarySignedAt: lifecycleSignals?.interdisciplinarySignedAt,
    disciplineStatementsIn: lifecycleSignals?.disciplineStatementsIn ?? 0,
    disciplineStatementsExpected: lifecycleSignals?.disciplineStatementsExpected ?? 0,
  });

  const shortCode = shortVcrCode(handoverPoint.vcr_code);
  const effectiveProjectCode = projectCode || projectCtx?.project_code || undefined;
  const projectTitle = projectCtx?.project_title || null;
  const subtitle = effectiveProjectCode && projectTitle
    ? `${effectiveProjectCode}: ${projectTitle} — Verification Certificate of Readiness`
    : `Verification Certificate of Readiness${effectiveProjectCode ? ` · ${effectiveProjectCode}` : ''}`;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':       return <StandardOverviewTab handoverPoint={handoverPoint} />;
      case 'items':          return <StandardItemsTab handoverPoint={handoverPoint} projectId={projectId} />;
      case 'qualifications': return <StandardQualificationsTab handoverPointId={handoverPoint.id} />;
      case 'comments':       return <VCRAssuranceTab handoverPointId={handoverPoint.id} />;
      case 'parties':        return <StandardPartiesTab handoverPoint={handoverPoint} lifecyclePhase={lifecycle.phase} />;
      case 'sof':            return <StandardSOFTab handoverPoint={handoverPoint} projectCode={effectiveProjectCode} />;
      case 'pac':            return <StandardPACTab handoverPoint={handoverPoint} projectCode={effectiveProjectCode} />;
      case 'systems':        return <StandardSystemsTab handoverPoint={handoverPoint} />;
      case 'witnessholds':   return <StandardWitnessHoldsTab handoverPoint={handoverPoint} />;
      case 'training':       return <StandardTrainingTab handoverPoint={handoverPoint} />;
      case 'procedures':     return <StandardProceduresTab handoverPoint={handoverPoint} />;
      case 'critdocs':       return <StandardCritDocsTab handoverPoint={handoverPoint} />;
      case 'registers':      return <StandardRegistersTab handoverPoint={handoverPoint} />;
      case 'maintenance':    return <StandardMaintenanceTab handoverPoint={handoverPoint} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-overlay-viewer" />
        <DialogPrimitive.Content
          data-testid="vcr-standard-content"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-modal-viewer w-[95vw] max-w-[1400px] h-[95vh] min-h-[600px] max-h-[calc(100dvh-16px)] flex flex-col p-0 gap-0 overflow-hidden border bg-background shadow-lg rounded-lg focus:outline-none"
        >
          {/* D1/D2 — Header: accent bar + chip share one lifecycle colour. */}
          <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={cn('w-1.5 h-10 rounded shrink-0', lifecycle.barClass)} />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base md:text-lg font-bold truncate">
                  {shortCode}: {handoverPoint.name}
                </DialogTitle>
                <DialogDescription className="text-[11.5px] text-muted-foreground truncate">
                  {subtitle}
                  {typeof revValue === 'number' && revValue > 0 && (
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground/80">· Rev {revValue}</span>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-2">
                <HeaderProgress done={counts.terminal} pipe={counts.pipeline} total={counts.total} />
                <div className="flex flex-col items-end leading-tight">
                  <span className={cn('text-[11px] font-semibold border rounded-full px-2.5 py-0.5', lifecycle.chipClass)}>
                    {lifecycle.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[280px] truncate">
                    {lifecycle.subline}
                  </span>
                </div>
              </div>
              {onDelete && (
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDelete(true)}
                  title="Delete VCR"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0">
            {/* D6 — Left nav: pill-active rows, muted icons, generous spacing */}
            <div className="w-[220px] shrink-0 border-r bg-muted/20 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="py-3">
                  <div className="text-[9.5px] font-bold tracking-[.14em] text-muted-foreground/70 px-4 pt-2 pb-2">NAVIGATE</div>
                  <NavItem id="overview"       label="Overview"       icon={BarChart3}     active={activeTab==='overview'}       onClick={() => setActiveTab('overview')} />
                  <NavItem id="items"          label="VCR Items"      icon={List}          active={activeTab==='items'}          count={counts.total} onClick={() => setActiveTab('items')} />
                  <NavItem id="qualifications" label="Qualifications" icon={AlertTriangle} active={activeTab==='qualifications'} liveCount={openQuals ? { value: openQuals, tone: 'amber' } : undefined} onClick={() => setActiveTab('qualifications')} />
                  <NavItem id="comments"       label="Comments"       icon={MessageSquare} active={activeTab==='comments'}       count={commentsCount} onClick={() => setActiveTab('comments')} />
                  <NavItem id="parties"        label="Parties"        icon={Users}         active={activeTab==='parties'}        onClick={() => setActiveTab('parties')} />
                  {isHC && (
                    <NavItem
                      id="sof" label="SoF" icon={ShieldCheck}
                      active={activeTab==='sof'}
                      locked={!(counts.total>0 && counts.terminal===counts.total)}
                      onClick={() => setActiveTab('sof')}
                    />
                  )}
                  <NavItem id="pac"            label="PAC"            icon={Award}         active={activeTab==='pac'}            locked={!(counts.total>0 && counts.terminal===counts.total)} onClick={() => setActiveTab('pac')} />

                  <Separator className="mx-3 my-5" />
                  <div className="text-[9px] font-extrabold tracking-[.14em] text-slate-400 px-4 pb-2 font-mono">DELIVERABLES</div>

                  <NavItem id="systems"      label="Systems"                 icon={Layers}        active={activeTab==='systems'}      tick={systems.length>0} onClick={() => setActiveTab('systems')} />
                  <NavItem id="witnessholds" label="Witness & Holds"         icon={Eye}           active={activeTab==='witnessholds'} onClick={() => setActiveTab('witnessholds')} />
                  <NavItem id="training"     label="Training"                icon={GraduationCap} active={activeTab==='training'}     onClick={() => setActiveTab('training')} />
                  <NavItem id="procedures"   label="Procedures"              icon={Book}          active={activeTab==='procedures'}   onClick={() => setActiveTab('procedures')} />
                  <NavItem id="critdocs"     label="Documentation"           icon={FileText}      active={activeTab==='critdocs'}     onClick={() => setActiveTab('critdocs')} />
                  <NavItem id="registers"    label="Registers & Logsheets"   icon={ClipboardList} active={activeTab==='registers'}    onClick={() => setActiveTab('registers')} />
                  <NavItem id="maintenance"  label="Maintenance Systems"     icon={Wrench}        active={activeTab==='maintenance'}  onClick={() => setActiveTab('maintenance')} />
                </div>
              </ScrollArea>
            </div>

            {/* Right content */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              {/* Mobile visibility of the progress bar + subline */}
              <div className="md:hidden px-4 py-2 border-b bg-muted/20">
                <HeaderProgress done={counts.terminal} pipe={counts.pipeline} total={counts.total} />
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('text-[10.5px] font-semibold border rounded-full px-2 py-0.5', lifecycle.chipClass)}>
                    {lifecycle.label}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground truncate">{lifecycle.subline}</span>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 md:p-5">
                  {renderContent()}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>

      <DeleteVCRDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        vcr={handoverPoint}
        systemsCount={systems.length}
        onConfirm={() => { onDelete?.(); setShowDelete(false); onOpenChange(false); }}
        isDeleting={isDeleting}
      />
    </Dialog>
  );
};
