import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../hooks/useVCRPrerequisites';
import { VCROverviewTab } from './VCROverviewTab';
import { VCRChecklistTab } from './VCRChecklistTab';
import { VCRQualificationsTab } from './VCRQualificationsTab';
import { VCRSystemsTab } from './VCRSystemsTab';
import { VCRTrainingTab } from './VCRTrainingTab';
import { cn } from '@/lib/utils';

// Placeholder components for new tabs
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

export const VCRDetailOverlay: React.FC<VCRDetailOverlayProps> = ({
  handoverPoint,
  open,
  onOpenChange,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { progress } = useVCRPrerequisites(handoverPoint.id);
  const statusConfig = getStatusConfig(handoverPoint.status);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="pb-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <DialogTitle className="text-xl">{handoverPoint.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-muted-foreground/60">
                    {handoverPoint.vcr_code}
                  </span>
                  <Badge className={statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={cn('text-3xl font-bold', statusConfig.textColor)}>{progress.overall}%</div>
              <div className="text-xs text-muted-foreground">Overall Complete</div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-8 w-full shrink-0">
            <TabsTrigger value="overview" className="gap-1 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="systems" className="gap-1 text-xs">
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Systems</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1 text-xs">
              <ClipboardList className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-1 text-xs">
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Training</span>
            </TabsTrigger>
            <TabsTrigger value="documentation" className="gap-1 text-xs">
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="procedures" className="gap-1 text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Procedures</span>
            </TabsTrigger>
            <TabsTrigger value="cmms" className="gap-1 text-xs">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">CMMS</span>
            </TabsTrigger>
            <TabsTrigger value="qualifications" className="gap-1 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Quals</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <div className="pr-4">
              <TabsContent value="overview" className="m-0">
                <VCROverviewTab handoverPoint={handoverPoint} onNavigateToTab={handleTabChange} />
              </TabsContent>

              <TabsContent value="systems" className="m-0">
                <VCRSystemsTab handoverPoint={handoverPoint} />
              </TabsContent>

              <TabsContent value="checklist" className="m-0">
                <VCRChecklistTab handoverPoint={handoverPoint} />
              </TabsContent>

              <TabsContent value="training" className="m-0">
                <VCRTrainingTab handoverPoint={handoverPoint} />
              </TabsContent>

              <TabsContent value="documentation" className="m-0">
                <PlaceholderTab title="Documentation" icon={<FileText className="w-8 h-8 text-amber-500" />} />
              </TabsContent>

              <TabsContent value="procedures" className="m-0">
                <PlaceholderTab title="Procedures" icon={<BookOpen className="w-8 h-8 text-emerald-500" />} />
              </TabsContent>

              <TabsContent value="cmms" className="m-0">
                <PlaceholderTab title="CMMS" icon={<Settings2 className="w-8 h-8 text-rose-500" />} />
              </TabsContent>

              <TabsContent value="qualifications" className="m-0">
                <VCRQualificationsTab handoverPoint={handoverPoint} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
