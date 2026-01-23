import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Play,
  CheckCircle2,
  XCircle,
  Plus,
  ClipboardList,
  AlertTriangle,
  FileText,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePSSRWalkdowns, type PSSRWalkdownEvent, type WalkdownStatus } from '@/hooks/usePSSRWalkdowns';
import { useWalkdownObservations } from '@/hooks/useWalkdownObservations';
import { ScheduleWalkdownModal } from './ScheduleWalkdownModal';
import { WalkdownObservationCapture } from './WalkdownObservationCapture';
import { WalkdownObservationsList } from './WalkdownObservationsList';

interface PSSRWalkdownManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  pssrTitle?: string;
}

const STATUS_CONFIG: Record<WalkdownStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-500', icon: <Calendar className="h-3.5 w-3.5" /> },
  in_progress: { label: 'In Progress', color: 'bg-amber-500', icon: <Play className="h-3.5 w-3.5" /> },
  completed: { label: 'Completed', color: 'bg-green-500', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-muted', icon: <XCircle className="h-3.5 w-3.5" /> },
};

export const PSSRWalkdownManager: React.FC<PSSRWalkdownManagerProps> = ({
  open,
  onOpenChange,
  pssrId,
  pssrTitle,
}) => {
  const { walkdowns, isLoading, stats, startWalkdown, completeWalkdown, cancelWalkdown } = usePSSRWalkdowns(pssrId);
  
  const [selectedWalkdown, setSelectedWalkdown] = useState<PSSRWalkdownEvent | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [isObservationsListOpen, setIsObservationsListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const activeWalkdown = walkdowns?.find(w => w.status === 'in_progress');

  const filteredWalkdowns = walkdowns?.filter(w => {
    if (activeTab === 'all') return true;
    return w.status === activeTab;
  }) || [];

  const handleStartWalkdown = async (walkdown: PSSRWalkdownEvent) => {
    await startWalkdown.mutateAsync(walkdown.id);
    setSelectedWalkdown({ ...walkdown, status: 'in_progress' });
  };

  const handleCompleteWalkdown = async (walkdown: PSSRWalkdownEvent) => {
    await completeWalkdown.mutateAsync(walkdown.id);
    setSelectedWalkdown(null);
  };

  const handleCancelWalkdown = async (walkdown: PSSRWalkdownEvent) => {
    await cancelWalkdown.mutateAsync(walkdown.id);
  };

  const renderWalkdownCard = (walkdown: PSSRWalkdownEvent) => {
    const statusConfig = STATUS_CONFIG[walkdown.status];
    const isActive = walkdown.status === 'in_progress';

    return (
      <Card 
        key={walkdown.id}
        className={cn(
          'transition-all',
          isActive && 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge className={cn('text-white', statusConfig.color)}>
                {statusConfig.icon}
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
              {isActive && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  Active Session
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(walkdown.created_at), 'MMM d, yyyy')}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(walkdown.scheduled_date), 'MMM d, yyyy')}</span>
            </div>
            {walkdown.scheduled_time && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{walkdown.scheduled_time}</span>
              </div>
            )}
            {walkdown.location && (
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{walkdown.location}</span>
              </div>
            )}
            {walkdown.attendees && walkdown.attendees.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <Users className="h-4 w-4" />
                <span>{walkdown.attendees.length} attendee{walkdown.attendees.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {walkdown.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {walkdown.description}
            </p>
          )}

          {/* Observation Stats */}
          <WalkdownObservationStats walkdownEventId={walkdown.id} pssrId={pssrId} />

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {walkdown.status === 'scheduled' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStartWalkdown(walkdown)}
                  disabled={startWalkdown.isPending}
                  className="flex-1"
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Start Walkdown
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelWalkdown(walkdown)}
                  disabled={cancelWalkdown.isPending}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {walkdown.status === 'in_progress' && (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedWalkdown(walkdown);
                    setIsObservationModalOpen(true);
                  }}
                  className="flex-1"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Observation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedWalkdown(walkdown);
                    setIsObservationsListOpen(true);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCompleteWalkdown(walkdown)}
                  disabled={completeWalkdown.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Complete
                </Button>
              </>
            )}
            {walkdown.status === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedWalkdown(walkdown);
                  setIsObservationsListOpen(true);
                }}
                className="flex-1"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                View Observations
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              PSSR Walkdown Manager
            </DialogTitle>
            {pssrTitle && (
              <p className="text-sm text-muted-foreground">{pssrTitle}</p>
            )}
          </DialogHeader>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
                <div className="text-xs text-blue-600/70">Scheduled</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
                <div className="text-xs text-amber-600/70">In Progress</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-green-600/70">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 border-muted">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-muted-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
          </div>

          {/* Active Walkdown Banner */}
          {activeWalkdown && (
            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-300">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-full text-white animate-pulse">
                    <Play className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Walkdown In Progress</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Started {format(new Date(activeWalkdown.scheduled_date), 'MMM d')}
                      {activeWalkdown.location && ` • ${activeWalkdown.location}`}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedWalkdown(activeWalkdown);
                    setIsObservationModalOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Capture
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tabs and List */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="in_progress">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <Button onClick={() => setIsScheduleModalOpen(true)} size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Schedule Walkdown
              </Button>
            </div>

            <TabsContent value={activeTab} className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[300px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredWalkdowns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No walkdowns found</p>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => setIsScheduleModalOpen(true)}
                    >
                      Schedule your first walkdown
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {filteredWalkdowns.map(renderWalkdownCard)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <ScheduleWalkdownModal
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
        pssrId={pssrId}
      />

      {/* Observation Capture Modal */}
      {selectedWalkdown && (
        <WalkdownObservationCapture
          open={isObservationModalOpen}
          onOpenChange={setIsObservationModalOpen}
          walkdownEventId={selectedWalkdown.id}
          pssrId={pssrId}
        />
      )}

      {/* Observations List Modal */}
      {selectedWalkdown && (
        <WalkdownObservationsList
          open={isObservationsListOpen}
          onOpenChange={setIsObservationsListOpen}
          walkdownEventId={selectedWalkdown.id}
          pssrId={pssrId}
          walkdownStatus={selectedWalkdown.status}
        />
      )}
    </>
  );
};

// Mini component to show observation stats per walkdown
const WalkdownObservationStats: React.FC<{ walkdownEventId: string; pssrId: string }> = ({ 
  walkdownEventId, 
  pssrId 
}) => {
  const { stats } = useWalkdownObservations(walkdownEventId, pssrId);

  if (stats.total === 0) return null;

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1 text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" />
        <span>{stats.total} observation{stats.total !== 1 ? 's' : ''}</span>
      </div>
      {stats.priorityA > 0 && (
        <Badge variant="outline" className="border-red-300 text-red-600 text-xs py-0">
          {stats.priorityA} Pr A
        </Badge>
      )}
      {stats.priorityB > 0 && (
        <Badge variant="outline" className="border-amber-300 text-amber-600 text-xs py-0">
          {stats.priorityB} Pr B
        </Badge>
      )}
    </div>
  );
};
