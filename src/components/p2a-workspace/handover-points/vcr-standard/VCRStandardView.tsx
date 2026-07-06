import React, { useState } from 'react';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3, List, AlertTriangle, MessageSquare, Users, Award,
  Layers, Eye, GraduationCap, Book, FileText, ClipboardList, Wrench,
  X, Trash2, Check, Lock,
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
import { StandardPartiesTab } from './StandardPartiesTab';
import { useVCRRev } from './useVCRRev';

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
  | 'overview' | 'items' | 'qualifications' | 'comments' | 'parties' | 'pac'
  | 'systems' | 'witnessholds' | 'training' | 'procedures' | 'critdocs' | 'registers' | 'maintenance';

interface Props {
  handoverPoint: P2AHandoverPoint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  projectId?: string;
  projectCode?: string;
  debugMode?: string;
}

/** Single segmented progress bar (green terminal · blue pipeline · grey remaining) */
const HeaderProgress: React.FC<{ done: number; pipe: number; total: number }> = ({ done, pipe, total }) => {
  const donePct = total ? (done / total) * 100 : 0;
  const pipePct = total ? (pipe / total) * 100 : 0;
  return (
    <div className="w-40 h-2 bg-slate-100 rounded-full overflow-hidden flex" title={`${done}/${total} closed`}>
      <div className="h-full bg-emerald-600" style={{ width: `${donePct}%` }} />
      <div className="h-full" style={{ width: `${pipePct}%`, background: '#A8C3EE' }} />
    </div>
  );
};

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
      'w-full flex items-center justify-between gap-2 px-4 py-1.5 text-[12.5px] text-left transition',
      active
        ? 'bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
      locked && 'opacity-50 cursor-not-allowed'
    )}
  >
    <span className="flex items-center gap-2 min-w-0">
      <Icon className={cn('w-3.5 h-3.5 flex-none', active ? 'text-blue-600' : 'text-muted-foreground/70')} />
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
      <span className="text-[10px] bg-slate-100 text-muted-foreground rounded-full px-1.5">{count}</span>
    )}
  </button>
);

export const VCRStandardView: React.FC<Props> = ({
  handoverPoint, open, onOpenChange, onDelete, isDeleting, projectId, projectCode, debugMode = 'execution',
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showDelete, setShowDelete] = useState(false);

  const { prerequisites } = useVCRPrerequisites(handoverPoint.id);
  const { qualifications } = useVCRQualifications(handoverPoint.id);
  const { systems } = useHandoverPointSystems(handoverPoint.id);
  const { data: hc } = useVCRHydrocarbonStatus(handoverPoint.id);
  const { data: revValue } = useVCRRev(handoverPoint.id);

  const counts = rollup(prerequisites.map(p => p.status as PrereqStatus));
  const openQuals = qualifications.filter(q => q.status === 'PENDING').length;
  const commentsCount = 0; // TODO: wire real comment count in follow-up
  const isHC = hc?.status === 'HC';

  // Lifecycle chip (advisory: full lifecycle state machine lives in the plan/approval layer)
  const lifecycle = counts.total > 0 && counts.terminal === counts.total
    ? { label: 'VCR approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : { label: 'In execution', className: 'bg-blue-50 text-blue-700 border-blue-200' };

  const contextBits: string[] = [];
  contextBits.push(`${counts.terminal} of ${counts.total} items closed`);
  if (counts.pipeline) contextBits.push(`${counts.pipeline} in review`);
  if (counts.rework) contextBits.push(`${counts.rework} in rework`);
  if (counts.qualification) contextBits.push(`${counts.qualification} qualification`);
  if (counts.todeliver) contextBits.push(`${counts.todeliver} to deliver`);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':       return <StandardOverviewTab handoverPoint={handoverPoint} />;
      case 'items':          return <StandardItemsTab handoverPoint={handoverPoint} projectId={projectId} />;
      case 'qualifications': return <StandardQualificationsTab handoverPointId={handoverPoint.id} />;
      case 'comments':       return <VCRAssuranceTab handoverPointId={handoverPoint.id} />;
      case 'parties':        return <StandardPartiesTab handoverPoint={handoverPoint} />;
      case 'pac':            return <StandardPACTab handoverPoint={handoverPoint} projectCode={projectCode} />;
      case 'systems':        return <StandardSystemsTab handoverPoint={handoverPoint} />;
      case 'witnessholds':   return <StandardWitnessHoldsTab handoverPoint={handoverPoint} />;
      case 'training':       return <StandardTrainingTab handoverPoint={handoverPoint} />;
      case 'procedures':     return <StandardProceduresTab handoverPoint={handoverPoint} />;
      case 'critdocs':       return <StandardCritDocsTab handoverPoint={handoverPoint} />;
      case 'registers':      return <StandardRegistersTab handoverPoint={handoverPoint} />;
      case 'maintenance':    return <StandardMaintenanceTab handoverPoint={handoverPoint} />;
    }
  };

  // TEMP instrumentation: prove sizing against the actual window, not a
  // constrained ancestor. Removed once both entry points verify.
  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector('[data-testid="vcr-standard-content"]') as HTMLElement | null;
      const r = el?.getBoundingClientRect();
      // eslint-disable-next-line no-console
      console.log('[VCR overlay:sizing]', {
        vcr: handoverPoint.vcr_code,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        matchesMd: window.matchMedia('(min-width: 768px)').matches,
        portalParent: el?.parentElement?.tagName,
        rect: r ? { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) } : null,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, handoverPoint.vcr_code]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-overlay-viewer" />
        <DialogPrimitive.Content
          data-testid="vcr-standard-content"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-modal-viewer w-[95vw] max-w-[1400px] h-[95vh] min-h-[600px] max-h-[calc(100dvh-16px)] flex flex-col p-0 gap-0 overflow-hidden border bg-background shadow-lg rounded-lg focus:outline-none"
        >


          {/* Header band: gold accent bar · title · lifecycle chip · close */}
          <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-1.5 h-9 rounded bg-amber-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base md:text-lg font-bold truncate">
                  {handoverPoint.vcr_code}: {handoverPoint.name}
                </DialogTitle>
                <DialogDescription className="text-[11.5px] text-muted-foreground truncate">
                  Verification Certificate of Readiness{projectCode ? ` · ${projectCode}` : ''}
                  {revValue !== undefined && (
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground/80">
                      · Rev {revValue > 0 ? revValue : '—'}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-2">
                <HeaderProgress done={counts.terminal} pipe={counts.pipeline} total={counts.total} />
                <span className={cn('text-[11px] font-semibold border rounded-full px-2.5 py-0.5', lifecycle.className)}>
                  {lifecycle.label}
                </span>
                <span data-testid="vcr-mode-badge" className="text-[10px] font-semibold border border-border rounded-full px-2 py-0.5 text-muted-foreground bg-muted/40">
                  mode: {debugMode}
                </span>
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
            {/* Left nav */}
            <div className="w-[210px] shrink-0 border-r bg-muted/20 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="py-3">
                  <div className="text-[9.5px] font-bold tracking-wider text-muted-foreground px-4 pt-2 pb-1">NAVIGATE</div>
                  <NavItem id="overview"       label="Overview"       icon={BarChart3}     active={activeTab==='overview'}       onClick={() => setActiveTab('overview')} />
                  <NavItem id="items"          label="VCR Items"      icon={List}          active={activeTab==='items'}          count={counts.total} onClick={() => setActiveTab('items')} />
                  <NavItem id="qualifications" label="Qualifications" icon={AlertTriangle} active={activeTab==='qualifications'} liveCount={openQuals ? { value: openQuals, tone: 'amber' } : undefined} onClick={() => setActiveTab('qualifications')} />
                  <NavItem id="comments"       label="Comments"       icon={MessageSquare} active={activeTab==='comments'}       count={commentsCount} onClick={() => setActiveTab('comments')} />
                  <NavItem id="parties"        label="Parties"        icon={Users}         active={activeTab==='parties'}        onClick={() => setActiveTab('parties')} />
                  <NavItem id="pac"            label="PAC"            icon={Award}         active={activeTab==='pac'}            locked={!(counts.total>0 && counts.terminal===counts.total)} onClick={() => setActiveTab('pac')} />

                  <Separator className="mx-3 my-3" />
                  <div className="text-[9px] font-extrabold tracking-[.12em] text-slate-400 px-4 pb-1.5 font-mono">DELIVERABLES</div>

                  <NavItem id="systems"      label="Systems"                 icon={Layers}        active={activeTab==='systems'}      tick={systems.length>0} onClick={() => setActiveTab('systems')} />
                  <NavItem id="witnessholds" label="Witness & Holds"         icon={Eye}           active={activeTab==='witnessholds'} onClick={() => setActiveTab('witnessholds')} />
                  <NavItem id="training"     label="Training"                icon={GraduationCap} active={activeTab==='training'}     onClick={() => setActiveTab('training')} />
                  <NavItem id="procedures"   label="Procedures"              icon={Book}          active={activeTab==='procedures'}   onClick={() => setActiveTab('procedures')} />
                  <NavItem id="critdocs"     label="Critical Documents"      icon={FileText}      active={activeTab==='critdocs'}     onClick={() => setActiveTab('critdocs')} />
                  <NavItem id="registers"    label="Registers & Logsheets"   icon={ClipboardList} active={activeTab==='registers'}    onClick={() => setActiveTab('registers')} />
                  <NavItem id="maintenance"  label="Maintenance Systems"     icon={Wrench}        active={activeTab==='maintenance'}  onClick={() => setActiveTab('maintenance')} />
                </div>
              </ScrollArea>
            </div>

            {/* Right content */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              {/* Execution mode context line (mobile visibility of the progress bar) */}
              <div className="md:hidden px-4 py-2 border-b bg-muted/20">
                <HeaderProgress done={counts.terminal} pipe={counts.pipeline} total={counts.total} />
                <div className="text-[11px] text-muted-foreground mt-1">{contextBits.join(' · ')}</div>
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
