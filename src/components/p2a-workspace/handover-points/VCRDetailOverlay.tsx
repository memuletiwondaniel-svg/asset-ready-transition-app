import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, 
  Layers, 
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useHandoverPointSystems } from '../hooks/useP2AHandoverPoints';
import { format } from 'date-fns';
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
  const { systems, isLoading: systemsLoading } = useHandoverPointSystems(handoverPoint.id);
  const statusConfig = getStatusConfig(handoverPoint.status);

  // Mock data for prerequisites (would come from useP2AVCRPrerequisites hook)
  const mockPrerequisites = [
    { id: '1', summary: 'All punch list items closed or deferred with approval', status: 'COMPLETED', delivering: 'Project', receiving: 'Operations' },
    { id: '2', summary: 'Training completed for Operations personnel', status: 'IN_PROGRESS', delivering: 'Project', receiving: 'Operations' },
    { id: '3', summary: 'Spare parts inventory handed over', status: 'NOT_STARTED', delivering: 'Project', receiving: 'Maintenance' },
    { id: '4', summary: 'Operating procedures approved and issued', status: 'COMPLETED', delivering: 'Engineering', receiving: 'Operations' },
    { id: '5', summary: 'Vendor documentation complete', status: 'QUALIFICATION_REQUESTED', delivering: 'Vendors', receiving: 'Operations' },
  ];

  const completedCount = mockPrerequisites.filter(p => p.status === 'COMPLETED').length;
  const progress = Math.round((completedCount / mockPrerequisites.length) * 100);

  const getPrereqStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'ACCEPTED':
        return <Badge className="bg-emerald-500 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Complete</Badge>;
      case 'IN_PROGRESS':
      case 'READY_FOR_REVIEW':
        return <Badge className="bg-amber-500 text-[10px]"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'QUALIFICATION_REQUESTED':
        return <Badge className="bg-purple-500 text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />Qualified</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />Not Started</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
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
              <div className={cn('text-3xl font-bold', statusConfig.textColor)}>{progress}%</div>
              <div className="text-xs text-muted-foreground">Prerequisites Complete</div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="prerequisites" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Prerequisites
            </TabsTrigger>
            <TabsTrigger value="systems" className="gap-2">
              <Layers className="w-4 h-4" />
              Systems
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="m-0 space-y-4">
              {/* Key Info */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Systems Assigned</div>
                    <div className="text-2xl font-bold text-cyan-500">{systems.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Prerequisites</div>
                    <div className="text-2xl font-bold">{completedCount}/{mockPrerequisites.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Target Date</div>
                    <div className="text-2xl font-bold">
                      {handoverPoint.target_date 
                        ? format(new Date(handoverPoint.target_date), 'dd MMM')
                        : 'Not set'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              {handoverPoint.description && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{handoverPoint.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Progress Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Prerequisites Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="h-2 mb-4" />
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-lg font-bold text-emerald-500">
                        {mockPrerequisites.filter(p => p.status === 'COMPLETED').length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Completed</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-lg font-bold text-amber-500">
                        {mockPrerequisites.filter(p => p.status === 'IN_PROGRESS' || p.status === 'READY_FOR_REVIEW').length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">In Progress</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-lg font-bold text-purple-500">
                        {mockPrerequisites.filter(p => p.status === 'QUALIFICATION_REQUESTED').length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Qualified</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-lg font-bold text-slate-500">
                        {mockPrerequisites.filter(p => p.status === 'NOT_STARTED').length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Not Started</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Prerequisites Tab */}
            <TabsContent value="prerequisites" className="m-0 space-y-3">
              {mockPrerequisites.map((prereq, idx) => (
                <Card key={prereq.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                          {getPrereqStatusBadge(prereq.status)}
                        </div>
                        <p className="text-sm font-medium">{prereq.summary}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Delivering: <span className="text-foreground">{prereq.delivering}</span></span>
                          <span>→</span>
                          <span>Receiving: <span className="text-foreground">{prereq.receiving}</span></span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">
                        {prereq.status === 'NOT_STARTED' ? 'Start' : 'View'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Systems Tab */}
            <TabsContent value="systems" className="m-0">
              {systems.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Layers className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">No Systems Assigned</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Drag systems from the panel on the right and drop them onto this VCR card to assign them.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {systems.map((system: any) => (
                    <Card key={system.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {system.system_id}
                          </Badge>
                          <span className="text-sm font-medium">{system.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={system.completion_percentage} className="w-20 h-1.5" />
                          <span className="text-xs text-muted-foreground">{system.completion_percentage}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
