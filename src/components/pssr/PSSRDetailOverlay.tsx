import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  AlertTriangle, 
  MessageSquare, 
  Award,
  X,
} from 'lucide-react';
import { PSSROverviewTab } from './PSSROverviewTab';
import { cn } from '@/lib/utils';

interface PSSRDetailOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  pssrDisplayId: string;
  pssrTitle?: string;
  status?: string;
}

// Placeholder for tabs not yet implemented
const PlaceholderTab: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">
      {title} details will be displayed here.
    </p>
  </div>
);

const navTabs = [
  { id: 'overview', label: 'PSSR Overview', icon: BarChart3 },
  { id: 'qualifications', label: 'Qualifications', icon: AlertTriangle },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'sof', label: 'SoF Certificate', icon: Award },
];

const getStatusConfig = (status: string) => {
  const s = status?.toUpperCase() || '';
  if (s === 'COMPLETED' || s === 'APPROVED') return { label: 'Completed', color: 'bg-emerald-500' };
  if (s === 'UNDER_REVIEW' || s === 'IN-REVIEW') return { label: 'Under Review', color: 'bg-amber-500' };
  if (s === 'PENDING_LEAD_REVIEW') return { label: 'Pending Lead Review', color: 'bg-blue-500' };
  return { label: 'Draft', color: 'bg-slate-400' };
};

export const PSSRDetailOverlay: React.FC<PSSRDetailOverlayProps> = ({
  open,
  onOpenChange,
  pssrId,
  pssrDisplayId,
  pssrTitle,
  status,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const statusConfig = getStatusConfig(status || '');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <PSSROverviewTab pssrId={pssrId} pssrDisplayId={pssrDisplayId} />;
      case 'qualifications':
        return <PlaceholderTab title="Qualifications" icon={<AlertTriangle className="w-8 h-8 text-amber-500" />} />;
      case 'comments':
        return <PlaceholderTab title="Comments" icon={<MessageSquare className="w-8 h-8 text-blue-500" />} />;
      case 'sof':
        return <PlaceholderTab title="SoF Certificate" icon={<Award className="w-8 h-8 text-amber-500" />} />;
      default:
        return <PSSROverviewTab pssrId={pssrId} pssrDisplayId={pssrDisplayId} />;
    }
  };

  const NavButton: React.FC<{ id: string; label: string; icon: React.ComponentType<any> }> = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
        activeTab === id
          ? "bg-primary text-primary-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn('w-3 h-8 rounded-full', statusConfig.color)} />
            <div>
              <DialogTitle className="text-lg font-semibold">
                {pssrDisplayId}{pssrTitle ? `: ${pssrTitle}` : ''}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pre-Startup Safety Review
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar Navigation */}
          <div className="w-56 shrink-0 border-r bg-muted/30 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                <div className="px-2 pt-1 pb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Navigate
                  </span>
                </div>
                {navTabs.map((tab) => (
                  <NavButton key={tab.id} {...tab} />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-5">
                {renderContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
