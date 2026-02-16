import React, { useState } from 'react';
import { getAPIConfig } from '@/lib/api-config-storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  GraduationCap,
  BookOpen,
  FileText,
  Settings2,
  Package,
  Layers,
  Shield,
  Award,
  X,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Users,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ProjectVCR } from '@/hooks/useProjectVCRs';
import { getVCRColor } from '@/components/p2a-workspace/utils/vcrColors';
import { format } from 'date-fns';
import { useHandoverPointSystems } from '@/components/p2a-workspace/hooks/useP2AHandoverPoints';
import SOFCertificate from '@/components/handover/SOFCertificate';
import PACCertificate from '@/components/handover/PACCertificate';
import { VCRTrainingTab } from '@/components/p2a-workspace/handover-points/VCRTrainingTab';
import { VCRProceduresTab } from '@/components/p2a-workspace/handover-points/VCRProceduresTab';
import { VCRCMMSTab } from '@/components/p2a-workspace/handover-points/VCRCMMSTab';
import { VCRRegistersTab } from '@/components/p2a-workspace/handover-points/VCRRegistersTab';
import { P2AHandoverPoint } from '@/components/p2a-workspace/hooks/useP2AHandoverPoints';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface VCRDetailOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcr: ProjectVCR;
  projectName?: string;
  projectCode?: string;
}

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  locked?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'procedures', label: 'Procedures', icon: BookOpen },
  { id: 'registers', label: 'Operational Registers', icon: FileText },
  { id: 'documentation', label: 'Documentation', icon: FileText },
  { id: 'cmms', label: 'CMMS', icon: Settings2 },
  { id: 'spares', label: 'Spares', icon: Package },
  { id: 'systems', label: 'Systems', icon: Layers },
  { id: 'sof', label: 'SoF Certificate', icon: Shield, locked: true },
  { id: 'pac', label: 'PAC', icon: Award, locked: true },
];

const shortCode = (code?: string) => {
  if (!code) return '';
  const match = code.match(/^VCR-[A-Z0-9]+-0*(\d+)$/);
  if (match) return `VCR-${match[1].padStart(2, '0')}`;
  return code.replace(/^VCR-[A-Z0-9]+-/, 'VCR-');
};

// ── Progress Panel (Left) ───────────────────────────────────────
const CATEGORY_ITEMS = [
  { label: 'Technical Integrity', icon: Settings2, color: 'text-blue-500', bg: 'bg-blue-500' },
  { label: 'Design Integrity', icon: Target, color: 'text-violet-500', bg: 'bg-violet-500' },
  { label: 'Operating Integrity', icon: Layers, color: 'text-cyan-500', bg: 'bg-cyan-500' },
  { label: 'Management Systems', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500' },
  { label: 'HSE & Environment', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  { label: 'Maintenance Readiness', icon: Settings2, color: 'text-rose-500', bg: 'bg-rose-500' },
];

const ProgressPanel: React.FC<{ vcr: ProjectVCR }> = ({ vcr }) => {
  const progress = vcr.progress;
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (progress / 100) * circumference;
  const progressColor = progress === 100 ? 'text-emerald-500' : progress >= 50 ? 'text-amber-500' : 'text-primary';
  const totalItems = Math.max(1, vcr.systems_count * 8);
  const itemsToGo = Math.round(totalItems * (1 - progress / 100));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Progress</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-auto">
        <div className="bg-muted/30 rounded-xl p-4">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <svg width={108} height={108} className="transform -rotate-90">
                <circle cx={54} cy={54} r={44} fill="none" strokeWidth={7}
                  className="text-muted/40" stroke="currentColor" />
                <circle cx={54} cy={54} r={44} fill="none" strokeWidth={7}
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  strokeLinecap="round" className={progressColor} stroke="currentColor"
                  style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{progress}%</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Complete</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{itemsToGo} items to go</div>
              <div className="text-xs text-muted-foreground">of {totalItems} total items</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-foreground">0</div>
            <div className="text-[10px] text-muted-foreground">Priority 1</div>
            <div className="text-[9px] text-muted-foreground/70">Before startup</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-foreground">0</div>
            <div className="text-[10px] text-muted-foreground">Priority 2</div>
            <div className="text-[9px] text-muted-foreground/70">After startup</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs px-3 py-1 gap-1.5 font-medium">
            <span className="text-foreground font-bold">{vcr.systems_count}</span> Pending
          </Badge>
          <Badge variant="outline" className="text-xs px-3 py-1 gap-1.5 font-medium border-amber-200 text-amber-600">
            <span className="font-bold">0</span> In Review
          </Badge>
          <Badge variant="outline" className="text-xs px-3 py-1 gap-1.5 font-medium border-emerald-200 text-emerald-600">
            <span className="font-bold">0</span> Completed
          </Badge>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            Progress by Category
          </div>
          <div className="space-y-3">
            {CATEGORY_ITEMS.map((cat) => {
              const Icon = cat.icon;
              const catTotal = Math.max(4, Math.floor(Math.random() * 28) + 4);
              const catDone = Math.floor(catTotal * (progress / 100));
              return (
                <div key={cat.label}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', cat.color)} />
                    <span className="text-xs text-foreground flex-1">{cat.label}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{catDone}/{catTotal}</span>
                  </div>
                  <Progress value={(catDone / catTotal) * 100} className="h-1.5" indicatorClassName={cat.bg} />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Approvals Panel (Middle) ────────────────────────────────────
interface ApproverData {
  id: string;
  name: string;
  role: string;
  status: 'approved' | 'rejected' | 'pending';
  avatar_url?: string;
  user_id?: string;
}

interface ChecklistApproverData {
  name: string;
  role: 'delivering' | 'receiving';
  itemCount: number;
  acceptedCount: number;
}

const ApprovalsPanel: React.FC<{ vcr: ProjectVCR; approvers?: ApproverData[]; checklistApprovers?: ChecklistApproverData[] }> = ({ vcr, approvers = [], checklistApprovers = [] }) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Group checklist approvers by role
  const deliveringParties = checklistApprovers.filter(a => a.role === 'delivering');
  const receivingParties = checklistApprovers.filter(a => a.role === 'receiving');

  const StatusIndicator: React.FC<{ accepted: number; total: number }> = ({ accepted, total }) => {
    if (accepted === total && total > 0) return (
      <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-200 bg-emerald-50 px-1.5">
        <CheckCircle2 className="w-3 h-3 mr-0.5" /> {accepted}/{total}
      </Badge>
    );
    if (accepted > 0) return (
      <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-200 bg-amber-50 px-1.5">
        <Clock className="w-3 h-3 mr-0.5" /> {accepted}/{total}
      </Badge>
    );
    return (
      <Badge variant="outline" className="text-[9px] text-muted-foreground px-1.5">
        0/{total}
      </Badge>
    );
  };

  const renderChecklistSection = (title: string, icon: React.ElementType, items: ChecklistApproverData[]) => {
    const SectionIcon = icon;
    const totalItems = items.reduce((sum, i) => sum + i.itemCount, 0);
    const totalAccepted = items.reduce((sum, i) => sum + i.acceptedCount, 0);
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <SectionIcon className="w-3 h-3" />
            {title}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{totalAccepted}/{totalItems}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-1 relative ml-3 pl-4 border-l border-border">
          {items.map((person, i) => (
            <div key={`${person.name}-${i}`} className="flex items-center gap-3 py-2">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">
                  {person.name}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {person.role === 'delivering' ? 'Delivering Party' : 'Receiving Party'}
                </div>
              </div>
              <StatusIndicator accepted={person.acceptedCount} total={person.itemCount} />
            </div>
          ))}
          {items.length === 0 && (
            <div className="py-2 text-[10px] text-muted-foreground italic">No parties assigned</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Approvals</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-5 overflow-auto">
        {renderChecklistSection('Delivering Parties', Shield, deliveringParties)}
        {renderChecklistSection('Receiving / Approving Parties', Award, receivingParties)}
      </CardContent>
    </Card>
  );
};

// ── Overview Info Panel (Right) ─────────────────────────────────
const OverviewInfoPanel: React.FC<{ vcr: ProjectVCR; projectName?: string; projectCode?: string }> = ({ vcr, projectName, projectCode }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-5 overflow-auto">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Project</div>
          <div className="text-sm font-medium text-primary">{projectCode} - {projectName}</div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">VCR Name</div>
          <div className="text-sm font-medium text-foreground">{vcr.name}</div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
          <div className="bg-card p-3">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">Status</div>
            <div className="text-xs font-medium text-foreground truncate">
              {vcr.status === 'PENDING' ? 'Draft' : vcr.status}
            </div>
          </div>
          <div className="bg-card p-3">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">Target Date</div>
            <div className="text-xs font-medium text-foreground truncate">
              {vcr.target_date ? format(new Date(vcr.target_date), 'MMM dd, yyyy') : 'Not set'}
            </div>
          </div>
          <div className="bg-card p-3">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">Systems</div>
            <div className="text-xs font-medium text-foreground">{vcr.systems_count}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Hydrocarbon</div>
            {vcr.has_hydrocarbon ? (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">Yes - HC Systems</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">No</Badge>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Progress</div>
            <div className="text-sm font-bold text-foreground">{vcr.progress}%</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">VCR Scope</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {vcr.description || 'Verification Certificate of Readiness covering systems mapped to this VCR. Ensures all prerequisites including training, documentation, procedures, CMMS, and spares are completed before handover.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Systems Panel ────────────────────────────────────────────────
const VCRSystemsPanel: React.FC<{ vcrId: string; projectCode?: string }> = ({ vcrId, projectCode }) => {
  const { systems, isLoading } = useHandoverPointSystems(vcrId);
  const [syncing, setSyncing] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState<{ success: boolean; message: string } | null>(null);

  const handleSyncFromGoCompletions = async () => {
    const config = getAPIConfig('gocompletions');

    if (!config || config.status !== 'configured' || !config.rpaCredentials) {
      setSyncResult({ success: false, message: 'GoCompletions not configured. Go to Administration > APIs.' });
      return;
    }

    const { portalUrl, username, password } = config.rpaCredentials;
    if (!username || !password) {
      setSyncResult({ success: false, message: 'GoCompletions credentials incomplete.' });
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not logged in');

      const systemIdList = systems.map((s: any) => s.system_id);
      const cleanProjectCode = projectCode?.replace(/-/g, '') || '';

      const { data, error } = await supabase.functions.invoke('gohub-sync-counts', {
        body: {
          portalUrl,
          username,
          password,
          projectFilter: cleanProjectCode,
          systemIds: systemIdList,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setSyncResult({
          success: true,
          message: `Synced ${data.total_updated}/${systems.length} systems from GoCompletions`,
        });
        // Reload to refresh data after short delay
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncResult({ success: false, message: data?.error || 'Sync failed' });
      }
    } catch (err: any) {
      setSyncResult({ success: false, message: err.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!systems.length) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No Systems</h3>
          <p className="text-sm text-muted-foreground">No systems are mapped to this VCR yet.</p>
        </div>
      </div>
    );
  }

  const totalITR = systems.reduce((s: number, sys: any) => s + (sys.itr_total_count || 0), 0);
  const totalITRA = systems.reduce((s: number, sys: any) => s + (sys.itr_a_count || 0), 0);
  const totalITRB = systems.reduce((s: number, sys: any) => s + (sys.itr_b_count || 0), 0);
  const totalPLA = systems.reduce((s: number, sys: any) => s + (sys.punchlist_a_count || 0), 0);
  const totalPLB = systems.reduce((s: number, sys: any) => s + (sys.punchlist_b_count || 0), 0);
  const avgCompletion = Math.round(systems.reduce((s: number, sys: any) => s + (sys.completion_percentage || 0), 0) / systems.length);
  const hcCount = systems.filter((s: any) => s.is_hydrocarbon).length;

  return (
    <div className="space-y-5">
      {/* Header Stats Bar */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{systems.length} Systems</h3>
              <p className="text-[10px] text-muted-foreground">{hcCount > 0 ? `${hcCount} Hydrocarbon · ${systems.length - hcCount} Non-HC` : 'All Non-Hydrocarbon'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Sync from GoCompletions button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncFromGoCompletions}
              disabled={syncing}
              className="text-xs gap-1.5 h-8"
            >
              {syncing ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                  Sync GoCompletions
                </>
              )}
            </Button>
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground tabular-nums">{avgCompletion}</span>
              <span className="text-xs text-muted-foreground ml-0.5">%</span>
            </div>
          </div>
        </div>

        {/* Sync result banner */}
        {syncResult && (
          <div className={cn(
            "rounded-lg px-3 py-2 mb-3 text-xs flex items-center gap-2",
            syncResult.success
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
          )}>
            {syncResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {syncResult.message}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'ITR-A', value: totalITRA, color: 'text-blue-600' },
            { label: 'ITR-B', value: totalITRB, color: 'text-sky-600' },
            { label: 'Punchlist A', value: totalPLA, color: 'text-rose-600' },
            { label: 'Punchlist B', value: totalPLB, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-muted/40 px-3 py-2 text-center">
              <div className={cn("text-lg font-bold tabular-nums", stat.color)}>{stat.value}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {systems.map((sys: any) => {
          const completion = sys.completion_percentage || 0;
          const isHC = sys.is_hydrocarbon;
          const milestoneLabel = isHC ? 'RFSU' : 'RFO';
          const milestoneDate = isHC ? sys.target_rfsu_date : sys.target_rfo_date;
          const isMCComplete = completion >= 80;
          const isRFCComplete = completion >= 95;
          const isMilestoneComplete = completion === 100;

          // Mini progress ring
          const ringSize = 40;
          const strokeWidth = 3.5;
          const radius = (ringSize - strokeWidth) / 2;
          const circumference = 2 * Math.PI * radius;
          const ringOffset = circumference - (completion / 100) * circumference;
          const ringColor = completion === 100 ? 'text-emerald-500' : completion >= 50 ? 'text-amber-500' : 'text-primary';

          return (
            <div
              key={sys.id}
              className="group rounded-2xl border bg-card hover:bg-muted/30 transition-all hover:shadow-sm overflow-hidden"
            >
              <div className="p-4">
                {/* Top row: Name + Progress ring */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground tracking-wide">{sys.system_id}</span>
                      {isHC && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[8px] font-bold uppercase tracking-wider">
                          HC
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground truncate leading-tight">{sys.name}</h4>
                  </div>
                  <div className="relative shrink-0">
                    <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                      <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
                        strokeWidth={strokeWidth} className="text-muted/40" stroke="currentColor" />
                      <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
                        strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={ringOffset}
                        strokeLinecap="round" className={ringColor} stroke="currentColor" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground tabular-nums">
                      {completion}
                    </span>
                  </div>
                </div>

                {/* Milestone badges */}
                <div className="flex items-center gap-1.5 mt-3">
                  {[
                    { label: 'MC', done: isMCComplete },
                    { label: 'RFC', done: isRFCComplete },
                    { label: milestoneLabel, done: isMilestoneComplete },
                  ].map(m => (
                    <span
                      key={m.label}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border transition-colors",
                        m.done
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                          : "bg-muted/50 text-muted-foreground border-transparent"
                      )}
                    >
                      {m.done ? <CheckCircle2 className="w-2.5 h-2.5" /> : <div className="w-2.5 h-2.5 rounded-full border border-current opacity-40" />}
                      {m.label}
                    </span>
                  ))}
                  {milestoneDate && (
                    <span className="text-[9px] text-muted-foreground ml-auto whitespace-nowrap">
                      {format(new Date(milestoneDate), 'dd MMM yy')}
                    </span>
                  )}
                </div>

                {/* ITR/PL Stats */}
                <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-border/50">
                  {[
                    { label: 'ITR-A', value: sys.itr_a_count || 0 },
                    { label: 'ITR-B', value: sys.itr_b_count || 0 },
                    { label: 'PL-A', value: sys.punchlist_a_count || 0, warn: true },
                    { label: 'PL-B', value: sys.punchlist_b_count || 0 },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className={cn(
                        "text-xs font-bold tabular-nums",
                        s.warn && s.value > 0 ? "text-rose-600" : "text-foreground"
                      )}>{s.value}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── VCR Handover Point Wrapper (reusable) ────────────────────────
const VCRHandoverPointWrapper: React.FC<{ vcr: ProjectVCR; render: (hp: P2AHandoverPoint) => React.ReactNode }> = ({ vcr, render }) => {
  const { data: handoverPoint, isLoading } = useQuery({
    queryKey: ['vcr-handover-point', vcr.id],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from('p2a_handover_points')
        .select('*')
        .eq('id', vcr.id)
        .maybeSingle();
      if (error) throw error;
      return data as P2AHandoverPoint;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!handoverPoint) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Not Available</h3>
          <p className="text-sm text-muted-foreground">Unable to load data for this VCR.</p>
        </div>
      </div>
    );
  }

  return <>{render(handoverPoint)}</>;
};

// ── Placeholder tab content ──────────────────────────────────────
const PlaceholderContent: React.FC<{ title: string; icon: React.ElementType }> = ({ title, icon: Icon }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {title} details for this VCR will be displayed here.
      </p>
    </div>
  </div>
);

// ── Main Overlay ─────────────────────────────────────────────────
export const VCRDetailOverlayWidget: React.FC<VCRDetailOverlayProps> = ({
  open,
  onOpenChange,
  vcr,
  projectName = '',
  projectCode = '',
}) => {
  const [activeNav, setActiveNav] = useState('overview');
  const vcrColor = getVCRColor(vcr.vcr_code);
  const displayCode = shortCode(vcr.vcr_code);
  const isComplete = vcr.progress === 100;

  // Fetch checklist item approvers (delivering/receiving parties from prerequisites)
  const { data: checklistApprovers = [] } = useQuery({
    queryKey: ['vcr-checklist-approvers', vcr.id],
    queryFn: async () => {
      const client = supabase as any;
      
      // Get prerequisites for this VCR
      const { data: prereqs, error } = await client
        .from('p2a_vcr_prerequisites')
        .select('id, delivering_party_name, receiving_party_name, status')
        .eq('handover_point_id', vcr.id);

      if (error || !prereqs?.length) return [];

      const acceptedStatuses = ['ACCEPTED', 'QUALIFICATION_APPROVED'];

      // Aggregate by unique delivering party names
      const deliveringMap = new Map<string, { itemCount: number; acceptedCount: number }>();
      const receivingMap = new Map<string, { itemCount: number; acceptedCount: number }>();

      for (const p of prereqs) {
        const isAccepted = acceptedStatuses.includes(p.status);
        
        if (p.delivering_party_name) {
          const existing = deliveringMap.get(p.delivering_party_name) || { itemCount: 0, acceptedCount: 0 };
          existing.itemCount++;
          if (isAccepted) existing.acceptedCount++;
          deliveringMap.set(p.delivering_party_name, existing);
        }
        
        if (p.receiving_party_name) {
          const existing = receivingMap.get(p.receiving_party_name) || { itemCount: 0, acceptedCount: 0 };
          existing.itemCount++;
          if (isAccepted) existing.acceptedCount++;
          receivingMap.set(p.receiving_party_name, existing);
        }
      }

      const result: ChecklistApproverData[] = [];
      
      deliveringMap.forEach((val, name) => {
        result.push({ name, role: 'delivering', ...val });
      });
      
      receivingMap.forEach((val, name) => {
        result.push({ name, role: 'receiving', ...val });
      });

      return result;
    },
  });

  // Keep certificateApprovers for SOF/PAC certificates (P2A plan approvers)
  const { data: certificateApprovers = [] } = useQuery({
    queryKey: ['vcr-certificate-approvers', vcr.id],
    queryFn: async () => {
      const client = supabase as any;
      const { data: hp } = await client
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcr.id)
        .maybeSingle();
      if (!hp?.handover_plan_id) return [];

      const { data: approvers } = await client
        .from('p2a_handover_approvers')
        .select('id, role_name, user_id, display_order, status')
        .eq('handover_id', hp.handover_plan_id)
        .order('display_order', { ascending: true });
      if (!approvers || approvers.length === 0) return [];

      const userIds = approvers.filter((a: any) => a.user_id).map((a: any) => a.user_id);
      let profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await client
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p: any) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
        }
      }

      const getFullAvatarUrl = (avatarUrl: string | null) => {
        if (!avatarUrl) return '';
        if (avatarUrl.startsWith('http')) return avatarUrl;
        const { data } = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl);
        return data.publicUrl;
      };

      return approvers.map((a: any) => {
        const profile = a.user_id ? profileMap[a.user_id] : null;
        return {
          id: a.id,
          name: profile?.full_name || '',
          role: a.role_name,
          status: a.status?.toLowerCase() === 'approved' ? 'approved' as const : a.status?.toLowerCase() === 'rejected' ? 'rejected' as const : 'pending' as const,
          avatar_url: getFullAvatarUrl(profile?.avatar_url || null),
          user_id: a.user_id,
        };
      });
    },
  });

  const renderContent = () => {
    switch (activeNav) {
      case 'overview': {
        const c = vcrColor;
        const panelStyle = c ? {
          background: `linear-gradient(135deg, hsl(${c.hue}, ${c.saturation}%, 96%) 0%, hsl(${(c.hue + 30) % 360}, ${c.saturation}%, 97%) 100%)`,
          borderColor: `hsl(${c.hue}, ${c.saturation}%, 88%)`,
        } : undefined;
        const panelStyleDark = c ? {
          '--panel-bg': `linear-gradient(135deg, hsl(${c.hue}, ${Math.round(c.saturation * 0.25)}%, 14%) 0%, hsl(${(c.hue + 30) % 360}, ${Math.round(c.saturation * 0.25)}%, 16%) 100%)`,
          '--panel-border': `hsl(${c.hue}, ${c.saturation * 0.3}%, 25%)`,
        } : undefined;
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {[
              <ProgressPanel key="progress" vcr={vcr} />,
              <ApprovalsPanel key="approvals" vcr={vcr} checklistApprovers={checklistApprovers} />,
              <OverviewInfoPanel key="info" vcr={vcr} projectName={projectName} projectCode={projectCode} />,
            ].map((panel, idx) => (
              <div
                key={idx}
                className="rounded-2xl border p-[2px] transition-all"
                style={panelStyle ? {
                  background: panelStyle.background,
                  borderColor: panelStyle.borderColor,
                } : undefined}
              >
                {panel}
              </div>
            ))}
          </div>
        );
      }
      case 'sof':
        return (
          <SOFCertificate
            certificateNumber={`SOF-${displayCode}`}
            plantName={projectName}
            facilityName={vcr.name}
            projectName={projectName}
            pssrNumber={displayCode}
            sofDate={vcr.target_date ? format(new Date(vcr.target_date), 'dd MMM yyyy') : ''}
            sourceType="VCR"
            pssrReason="Start-up of a new Project or Facility"
            approvers={certificateApprovers.length > 0 ? certificateApprovers : undefined}
          />
        );
      case 'pac':
        return (
          <PACCertificate
            certificateNumber={`PAC-${displayCode}`}
            facilityName={vcr.name}
            projectName={projectName}
            projectId={projectCode}
            pacDate={vcr.target_date ? format(new Date(vcr.target_date), 'dd MMM yyyy') : ''}
            approvers={certificateApprovers.length > 0 ? certificateApprovers : undefined}
          />
        );
      case 'training':
        return <VCRHandoverPointWrapper vcr={vcr} render={(hp) => <VCRTrainingTab handoverPoint={hp} />} />;
      case 'procedures':
        return <VCRHandoverPointWrapper vcr={vcr} render={(hp) => <VCRProceduresTab handoverPoint={hp} />} />;
      case 'registers':
        return <VCRHandoverPointWrapper vcr={vcr} render={(hp) => <VCRRegistersTab handoverPoint={hp} />} />;
      case 'documentation':
        return <PlaceholderContent title="Documentation" icon={FileText} />;
      case 'cmms':
        return <VCRHandoverPointWrapper vcr={vcr} render={(hp) => <VCRCMMSTab handoverPoint={hp} />} />;
      case 'spares':
        return <PlaceholderContent title="Spares" icon={Package} />;
      case 'systems':
        return <VCRSystemsPanel vcrId={vcr.id} projectCode={projectCode} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>VCR Detail</DialogTitle>
            <DialogDescription>View VCR details and progress</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        {/* Top header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-8 rounded-full"
              style={{ backgroundColor: vcrColor?.border || 'hsl(var(--primary))' }}
            />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {displayCode}: {vcr.name}
              </h2>
              <span className="text-xs text-muted-foreground">Verification Certificate of Readiness</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body: left nav + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left navigation panel */}
          <div className="w-52 border-r bg-muted/30 shrink-0 flex flex-col">
            <div className="px-4 pt-4 pb-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Navigate
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-2 pb-4 space-y-0.5">
                {NAV_ITEMS.filter(item => item.id !== 'sof' || vcr.has_hydrocarbon).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  const isLocked = item.locked && !isComplete;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      disabled={false}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                        isLocked && !isActive && 'opacity-60'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {isLocked && <Lock className="w-3 h-3 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Main content area */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {renderContent()}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
