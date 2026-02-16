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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectVCR } from '@/hooks/useProjectVCRs';
import { getVCRColor } from '@/components/p2a-workspace/utils/vcrColors';
import { format } from 'date-fns';
import SOFCertificate from '@/components/handover/SOFCertificate';
import PACCertificate from '@/components/handover/PACCertificate';

interface VCRDetailOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcr: ProjectVCR;
}

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  locked?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'VCR Overview', icon: BarChart3 },
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

// ── Overview Panel ──────────────────────────────────────────────
const OverviewPanel: React.FC<{ vcr: ProjectVCR }> = ({ vcr }) => {
  const vcrColor = getVCRColor(vcr.vcr_code);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">VCR Name</div>
          <div className="text-sm font-semibold text-foreground">{vcr.name}</div>
        </div>

        {vcr.description && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Description</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{vcr.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Status</div>
            <Badge variant="outline" className="text-[10px]">
              {vcr.status === 'PENDING' ? 'Draft' : vcr.status}
            </Badge>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Target Date</div>
            <div className="text-xs text-foreground">
              {vcr.target_date ? format(new Date(vcr.target_date), 'dd MMM yyyy') : 'Not set'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Systems</div>
            <div className="text-lg font-bold text-cyan-500">{vcr.systems_count}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Hydrocarbon</div>
            <div className="text-xs">
              {vcr.has_hydrocarbon ? (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">Yes</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">No</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Progress Panel ──────────────────────────────────────────────
const CATEGORY_ITEMS = [
  { label: 'Technical Integrity', icon: Settings2, color: 'text-blue-500', bg: 'bg-blue-500' },
  { label: 'Design Integrity', icon: Target, color: 'text-violet-500', bg: 'bg-violet-500' },
  { label: 'Operating Integrity', icon: Layers, color: 'text-cyan-500', bg: 'bg-cyan-500' },
  { label: 'Management Systems', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500' },
  { label: 'Health & Safety', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500' },
];

const ProgressPanel: React.FC<{ vcr: ProjectVCR }> = ({ vcr }) => {
  const progress = vcr.progress;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (progress / 100) * circumference;
  const progressColor = progress === 100 ? 'text-emerald-500' : progress >= 50 ? 'text-amber-500' : 'text-primary';

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Circular progress */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg width={96} height={96} className="transform -rotate-90">
              <circle cx={48} cy={48} r={40} fill="none" strokeWidth={6}
                className="text-muted/30" stroke="currentColor" />
              <circle cx={48} cy={48} r={40} fill="none" strokeWidth={6}
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" className={progressColor} stroke="currentColor"
                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">{progress}%</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Complete</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <div className="font-medium text-foreground text-sm">{vcr.systems_count} Systems</div>
            <div>mapped to this VCR</div>
          </div>
        </div>

        {/* Category breakdown */}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            Progress by Category
          </div>
          <div className="space-y-3">
            {CATEGORY_ITEMS.map((cat) => {
              const Icon = cat.icon;
              // Simulated per-category values (placeholder until real data is wired)
              const val = Math.min(100, Math.max(0, progress + Math.floor(Math.random() * 20 - 10)));
              return (
                <div key={cat.label} className="flex items-center gap-2">
                  <Icon className={cn('w-3.5 h-3.5 shrink-0', cat.color)} />
                  <span className="text-xs text-foreground w-28 truncate">{cat.label}</span>
                  <Progress value={val} className="h-1.5 flex-1" indicatorClassName={cat.bg} />
                  <span className="text-[10px] font-semibold text-muted-foreground w-8 text-right">{val}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Approvals Panel ──────────────────────────────────────────────
const ApprovalsPanel: React.FC<{ vcr: ProjectVCR }> = ({ vcr }) => {
  // Placeholder approvers – will be wired to real data
  const reviewers = [
    { name: 'VCR Reviewer', role: 'Commissioning Lead', status: 'pending' },
    { name: 'VCR Reviewer', role: 'Operations Lead', status: 'pending' },
  ];
  const approvers = [
    { name: 'VCR Approver', role: 'Plant Manager', status: 'pending' },
    { name: 'VCR Approver', role: 'HSE Director', status: 'pending' },
  ];

  const StatusDot: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'approved') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (status === 'rejected') return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Approvals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* VCR Review */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              VCR Review
            </div>
            <span className="text-[10px] text-muted-foreground">0/{reviewers.length}</span>
          </div>
          <div className="space-y-2 relative pl-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {reviewers.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold relative z-10">
                  {r.role.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{r.role}</div>
                </div>
                <StatusDot status={r.status} />
              </div>
            ))}
          </div>
        </div>

        {/* VCR Approval */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Award className="w-3 h-3" />
              VCR Approval
            </div>
            <span className="text-[10px] text-muted-foreground">0/{approvers.length}</span>
          </div>
          <div className="space-y-2 relative pl-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {approvers.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold relative z-10">
                  {a.role.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{a.role}</div>
                </div>
                <StatusDot status={a.status} />
              </div>
            ))}
          </div>
        </div>

        {/* SoF Approval */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              SoF Approval
            </div>
            <span className="text-[10px] text-muted-foreground">0/3</span>
          </div>
        </div>
      </CardContent>
    </Card>
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

const LockedContent: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Lock className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        This section is locked until all VCR prerequisites are completed.
      </p>
    </div>
  </div>
);

// ── Main Overlay ─────────────────────────────────────────────────
export const VCRDetailOverlayWidget: React.FC<VCRDetailOverlayProps> = ({
  open,
  onOpenChange,
  vcr,
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
            <OverviewPanel vcr={vcr} />
            <ProgressPanel vcr={vcr} />
            <ApprovalsPanel vcr={vcr} />
          </div>
        );
      case 'sof':
        return (
          <SOFCertificate
            certificateNumber={`SOF-${displayCode}`}
            plantName=""
            facilityName=""
            projectName={vcr.name}
            sourceType="VCR"
            pssrReason="Start-up of a new Project or Facility"
          />
        );
      case 'pac':
        return (
          <PACCertificate
            certificateNumber={`PAC-${displayCode}`}
            facilityName=""
            projectName={vcr.name}
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
        return <PlaceholderContent title="Systems" icon={Layers} />;
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
