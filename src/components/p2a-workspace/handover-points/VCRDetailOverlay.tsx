import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, 
  Layers, 
  ClipboardList,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../hooks/useVCRPrerequisites';
import { VCROverviewTab } from './VCROverviewTab';
import { VCRChecklistTab } from './VCRChecklistTab';
import { VCRQualificationsTab } from './VCRQualificationsTab';
import { VCRSystemsTab } from './VCRSystemsTab';
import { cn } from '@/lib/utils';

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
  const { progress } = useVCRPrerequisites(handoverPoint.id);
  const statusConfig = getStatusConfig(handoverPoint.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <DialogTitle className="text-xl">{handoverPoint.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {handoverPoint.vcr_code}
                  </Badge>
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

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 w-full shrink-0">
            <TabsTrigger value="overview" className="gap-2 text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2 text-xs sm:text-sm">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="qualifications" className="gap-2 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Qualifications</span>
            </TabsTrigger>
            <TabsTrigger value="systems" className="gap-2 text-xs sm:text-sm">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Systems</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <div className="pr-4">
              <TabsContent value="overview" className="m-0">
                <VCROverviewTab handoverPoint={handoverPoint} />
              </TabsContent>

              <TabsContent value="checklist" className="m-0">
                <VCRChecklistTab handoverPoint={handoverPoint} />
              </TabsContent>

              <TabsContent value="qualifications" className="m-0">
                <VCRQualificationsTab handoverPoint={handoverPoint} />
              </TabsContent>

              <TabsContent value="systems" className="m-0">
                <VCRSystemsTab handoverPoint={handoverPoint} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
