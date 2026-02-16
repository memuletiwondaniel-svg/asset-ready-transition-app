import React, { useState } from 'react';
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
import { ProjectVCR } from '@/hooks/useProjectVCRs';
import { getVCRColor } from '@/components/p2a-workspace/utils/vcrColors';
import { format } from 'date-fns';
import { useHandoverPointSystems } from '@/components/p2a-workspace/hooks/useP2AHandoverPoints';
import SOFCertificate from '@/components/handover/SOFCertificate';
import PACCertificate from '@/components/handover/PACCertificate';

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
const ApprovalsPanel: React.FC<{ vcr: ProjectVCR }> = ({ vcr }) => {
  const reviewers = [
    { name: 'Commissioning Lead', initials: 'CL', role: 'Commissioning - Project', status: 'pending' },
    { name: 'Operations Lead', initials: 'OL', role: 'Operations - Asset', status: 'pending' },
    { name: 'Technical Authority', initials: 'TA', role: 'Technical - Project', status: 'pending' },
  ];
  const approvers = [
    { name: 'Plant Manager', initials: 'PM', role: 'Plant Manager', status: 'pending' },
    { name: 'HSE Director', initials: 'HD', role: 'HSE Director', status: 'pending' },
  ];
  const sofApprovers = [
    { name: 'Plant Director', initials: 'PD', role: 'Plant Director', status: 'pending' },
    { name: 'HSE Director', initials: 'HD', role: 'HSE Director', status: 'pending' },
    { name: 'P&E Director', initials: 'PE', role: 'P&E Director', status: 'pending' },
  ];

  const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'approved') return (
      <div className="flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[10px] text-emerald-600 font-medium">Approved</span>
      </div>
    );
    return (
      <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-200 px-1.5">pending</Badge>
    );
  };

  const renderSection = (title: string, icon: React.ElementType, items: typeof reviewers, count: string) => {
    const SectionIcon = icon;
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <SectionIcon className="w-3 h-3" />
            {title}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{count}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-1 relative ml-3 pl-4 border-l border-border">
          {items.map((person, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                {person.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{person.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{person.role}</div>
              </div>
              <StatusIndicator status={person.status} />
            </div>
          ))}
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
        {renderSection('VCR Review', Shield, reviewers, `0/${reviewers.length}`)}
        {renderSection('VCR Approval', Award, approvers, `0/${approvers.length}`)}
        {renderSection('SoF Approval', Shield, sofApprovers, `0/${sofApprovers.length}`)}
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
const VCRSystemsPanel: React.FC<{ vcrId: string }> = ({ vcrId }) => {
  const { systems, isLoading } = useHandoverPointSystems(vcrId);

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

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-foreground">{systems.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Systems</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-foreground">
              {systems.reduce((s: number, sys: any) => s + (sys.itr_total_count || 0), 0)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total ITRs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-foreground">
              {systems.reduce((s: number, sys: any) => s + (sys.punchlist_a_count || 0), 0)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Punchlist A</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-foreground">
              {systems.reduce((s: number, sys: any) => s + (sys.punchlist_b_count || 0), 0)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Punchlist B</div>
          </CardContent>
        </Card>
      </div>

      {/* Systems list */}
      <div className="space-y-2">
        {systems.map((sys: any) => {
          const completion = sys.completion_percentage || 0;
          const isHC = sys.is_hydrocarbon;
          const milestoneLabel = isHC ? 'RFSU' : 'RFO';
          const milestoneDate = isHC ? sys.target_rfsu_date : sys.target_rfo_date;
          const isMCComplete = completion >= 80;
          const isRFCComplete = completion >= 95;
          const isMilestoneComplete = completion === 100;

          return (
            <Card key={sys.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground truncate">{sys.name}</span>
                      {isHC && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[9px] shrink-0">HC</Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{sys.system_id}</span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-lg font-bold text-foreground">{completion}%</div>
                    <div className="text-[9px] text-muted-foreground">Complete</div>
                  </div>
                </div>

                <Progress value={completion} className="h-1.5 mb-3" />

                {/* Milestones row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn(
                    "text-[9px] gap-1",
                    isMCComplete ? "border-emerald-300 text-emerald-600" : "text-muted-foreground"
                  )}>
                    {isMCComplete ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                    MC
                  </Badge>
                  <Badge variant="outline" className={cn(
                    "text-[9px] gap-1",
                    isRFCComplete ? "border-emerald-300 text-emerald-600" : "text-muted-foreground"
                  )}>
                    {isRFCComplete ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                    RFC
                  </Badge>
                  <Badge variant="outline" className={cn(
                    "text-[9px] gap-1",
                    isMilestoneComplete ? "border-emerald-300 text-emerald-600" : "text-muted-foreground"
                  )}>
                    {isMilestoneComplete ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                    {milestoneLabel}
                  </Badge>
                  {milestoneDate && (
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      Target: {format(new Date(milestoneDate), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>

                {/* ITR & Punchlist stats */}
                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-xs font-semibold">{sys.itr_a_count || 0}</div>
                    <div className="text-[9px] text-muted-foreground">ITR-A</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold">{sys.itr_b_count || 0}</div>
                    <div className="text-[9px] text-muted-foreground">ITR-B</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold">{sys.punchlist_a_count || 0}</div>
                    <div className="text-[9px] text-muted-foreground">PL-A</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold">{sys.punchlist_b_count || 0}</div>
                    <div className="text-[9px] text-muted-foreground">PL-B</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
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

  const renderContent = () => {
    switch (activeNav) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <ProgressPanel vcr={vcr} />
            <ApprovalsPanel vcr={vcr} />
            <OverviewInfoPanel vcr={vcr} projectName={projectName} projectCode={projectCode} />
          </div>
        );
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
          />
        );
      case 'training':
        return <PlaceholderContent title="Training" icon={GraduationCap} />;
      case 'procedures':
        return <PlaceholderContent title="Procedures" icon={BookOpen} />;
      case 'registers':
        return <PlaceholderContent title="Operational Registers" icon={FileText} />;
      case 'documentation':
        return <PlaceholderContent title="Documentation" icon={FileText} />;
      case 'cmms':
        return <PlaceholderContent title="CMMS" icon={Settings2} />;
      case 'spares':
        return <PlaceholderContent title="Spares" icon={Package} />;
      case 'systems':
        return <VCRSystemsPanel vcrId={vcr.id} />;
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
                {NAV_ITEMS.map((item) => {
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
