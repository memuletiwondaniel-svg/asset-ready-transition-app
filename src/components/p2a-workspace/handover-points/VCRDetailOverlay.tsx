import React, { useState } from 'react';
import { Dialog, DialogPortal, DialogOverlay, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  Layers, 
  ClipboardList,
  AlertTriangle,
  BarChart3,
  GraduationCap,
  FileText,
  BookOpen,
  Settings2,
  Trash2,
  X,
  MessageSquare,
  Award,
  Medal,
  Package,
  FolderOpen,
  Lock,
  Info,
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../hooks/useVCRPrerequisites';
import { useHandoverPointSystems } from '../hooks/useP2AHandoverPoints';
import { VCROverviewTab } from './VCROverviewTab';
import { VCRAssuranceTab } from '@/components/widgets/VCRAssuranceTab';
import { VCRChecklistTab } from './VCRChecklistTab';
import { VCRQualificationsTab } from './VCRQualificationsTab';
import { VCRSystemsTab } from './VCRSystemsTab';
import { VCRTrainingTab } from './VCRTrainingTab';
import { VCRProceduresTab } from './VCRProceduresTab';
import { VCRDocumentationTab } from './VCRDocumentationTab';
import { VCRCMMSTab } from './VCRCMMSTab';
import { VCRRegistersTab } from './VCRRegistersTab';
import { DeleteVCRDialog } from './DeleteVCRDialog';
import { cn } from '@/lib/utils';

// Placeholder for tabs not yet implemented
const PlaceholderTab: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <Card>
    <CardContent className="p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <CardTitle className="text-lg mb-2">{title}</CardTitle>
      <p className="text-sm text-muted-foreground">
        {title} details will be displayed here.
      </p>
    </CardContent>
  </Card>
);

interface VCRDetailOverlayProps {
  handoverPoint: P2AHandoverPoint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  projectId?: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'SIGNED':
      return { label: 'Signed', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
    case 'READY':
      return { label: 'Ready for Sign-off', color: 'bg-blue-500', textColor: 'text-blue-500' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', color: 'bg-amber-500', textColor: 'text-amber-500' };
    default:
      return { label: 'Pending', color: 'bg-slate-400', textColor: 'text-slate-500' };
  }
};

// Core navigation tabs (upper section)
const coreTabs = [
  { id: 'overview', label: 'VCR', icon: BarChart3 },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'qualifications', label: 'Qualifications', icon: AlertTriangle },
  { id: 'sof', label: 'SoF', icon: Award },
  { id: 'pac', label: 'PAC', icon: Medal },
];

// VCR Deliverables tabs (lower section)
const buildingBlockTabs = [
  { id: 'systems', label: 'Systems', icon: Layers },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'procedures', label: 'Procedures', icon: BookOpen },
  { id: 'documentation', label: 'Documentation', icon: FileText },
  { id: 'cmms', label: 'CMMS', icon: Settings2 },
  { id: 'spares', label: 'Spares', icon: Package },
  { id: 'registers', label: 'Operational Registers', icon: FolderOpen },
];

export const VCRDetailOverlay: React.FC<VCRDetailOverlayProps> = ({
  handoverPoint,
  open,
  onOpenChange,
  onDelete,
  isDeleting,
  projectId,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { progress } = useVCRPrerequisites(handoverPoint.id);
  const { systems } = useHandoverPointSystems(handoverPoint.id);
  const statusConfig = getStatusConfig(handoverPoint.status);

  const isExecutionPlanApproved = (handoverPoint as any).execution_plan_status === 'APPROVED';
  const lockedTabIds = buildingBlockTabs.map(t => t.id);

  const handleTabChange = (tabId: string) => {
    if (!isExecutionPlanApproved && lockedTabIds.includes(tabId)) return;
    setActiveTab(tabId);
    setMobileNavOpen(false);
  };

  const activeTabLabel = [...coreTabs, ...buildingBlockTabs].find(t => t.id === activeTab)?.label || 'VCR';
  const ActiveTabIcon = [...coreTabs, ...buildingBlockTabs].find(t => t.id === activeTab)?.icon || BarChart3;

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteDialog(false);
      onOpenChange(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <VCROverviewTab handoverPoint={handoverPoint} onNavigateToTab={handleTabChange} isLocked={!isExecutionPlanApproved} />;
      case 'systems':
        return <VCRSystemsTab handoverPoint={handoverPoint} />;
      case 'checklist':
        return <VCRChecklistTab handoverPoint={handoverPoint} projectId={projectId} />;
      case 'training':
        return <VCRTrainingTab handoverPoint={handoverPoint} />;
      case 'documentation':
        return <VCRDocumentationTab handoverPoint={handoverPoint} />;
      case 'procedures':
        return <VCRProceduresTab handoverPoint={handoverPoint} />;
      case 'cmms':
        return <VCRCMMSTab handoverPoint={handoverPoint} />;
      case 'qualifications':
        return <VCRQualificationsTab handoverPoint={handoverPoint} />;
      case 'registers':
        return <VCRRegistersTab handoverPoint={handoverPoint} />;
      case 'comments':
        return <VCRAssuranceTab handoverPointId={handoverPoint.id} />;
      case 'sof':
        return <PlaceholderTab title="SoF Certificate" icon={<Award className="w-8 h-8 text-amber-500" />} />;
      case 'pac':
        return <PlaceholderTab title="PAC Certificate" icon={<Medal className="w-8 h-8 text-emerald-500" />} />;
      case 'spares':
        return <PlaceholderTab title="Spares" icon={<Package className="w-8 h-8 text-orange-500" />} />;
      default:
        return <VCROverviewTab handoverPoint={handoverPoint} onNavigateToTab={handleTabChange} isLocked={!isExecutionPlanApproved} />;
    }
  };

  const NavButton: React.FC<{ id: string; label: string; icon: React.ComponentType<any>; locked?: boolean }> = ({ id, label, icon: Icon, locked }) => (
    <button
      onClick={() => handleTabChange(id)}
      disabled={locked}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
        locked
          ? "opacity-40 cursor-not-allowed pointer-events-none"
          : activeTab === id
            ? "bg-primary text-primary-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate flex-1">{label}</span>
      {locked && <Lock className="w-3 h-3 shrink-0 text-muted-foreground" />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[200]" />
        <DialogPrimitive.Content className="fixed z-[200] !inset-0 md:inset-auto md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] !max-w-none md:!max-w-[95vw] md:!w-[95vw] !w-full h-[100dvh] md:h-[95vh] p-0 gap-0 overflow-hidden border-0 md:border bg-background shadow-lg md:rounded-lg rounded-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3 border-b shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <div
              className="w-2.5 md:w-3 h-7 md:h-8 rounded-full shrink-0"
              style={{ backgroundColor: `hsl(${(handoverPoint.position_y || 0) * 40}, 70%, 55%)` }}
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm md:text-lg font-semibold truncate">
                {handoverPoint.vcr_code}: {handoverPoint.name}
              </DialogTitle>
              <DialogDescription className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                Verification Certificate of Readiness
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete VCR"
              >
                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="md:hidden border-b">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <ActiveTabIcon className="w-4 h-4 text-primary" />
              <span>{activeTabLabel}</span>
            </div>
            <svg className={cn("w-4 h-4 text-muted-foreground transition-transform", mobileNavOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {mobileNavOpen && (
            <div className="border-t bg-muted/30 max-h-[50vh] overflow-y-auto overscroll-contain">
              <div className="p-2 space-y-0.5">
                <div className="px-2 pt-1 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Navigate</span>
                </div>
                {coreTabs.map((tab) => (
                  <NavButton key={tab.id} {...tab} />
                ))}
                <Separator className="my-3" />
                <div className="px-2 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">VCR Deliverables</span>
                </div>
                {buildingBlockTabs.map((tab) => (
                  <NavButton key={tab.id} {...tab} locked={!isExecutionPlanApproved} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar Navigation - Desktop only */}
          <div className="hidden md:flex w-56 shrink-0 border-r bg-muted/30 flex-col">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                <div className="px-2 pt-1 pb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Navigate
                  </span>
                </div>
                {coreTabs.map((tab) => (
                  <NavButton key={tab.id} {...tab} />
                ))}
                <Separator className="my-6" />
                <div className="px-2 pb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    VCR Deliverables
                  </span>
                </div>
                {buildingBlockTabs.map((tab) => (
                  <NavButton key={tab.id} {...tab} locked={!isExecutionPlanApproved} />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-3 md:p-5">
                {renderContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogPrimitive.Content>
      </DialogPortal>

      {/* Delete Confirmation Dialog */}
      <DeleteVCRDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        vcr={handoverPoint}
        systemsCount={systems.length}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </Dialog>
  );
};
