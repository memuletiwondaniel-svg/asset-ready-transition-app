import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  FileText,
  StickyNote,
  Search,
  Filter,
  MapPin,
  Camera,
  Plus,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useWalkdownObservations, OBSERVATION_CATEGORIES, type WalkdownObservation, type ObservationType } from '@/hooks/useWalkdownObservations';
import { WalkdownObservationCapture } from './WalkdownObservationCapture';
import type { WalkdownStatus } from '@/hooks/usePSSRWalkdowns';

interface WalkdownObservationsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walkdownEventId: string;
  pssrId: string;
  walkdownStatus: WalkdownStatus;
}

const TYPE_CONFIG: Record<ObservationType, { label: string; icon: React.ReactNode; color: string }> = {
  finding: { label: 'Finding', icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-blue-500' },
  action_required: { label: 'Action Required', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'bg-red-500' },
  note: { label: 'Note', icon: <StickyNote className="h-3.5 w-3.5" />, color: 'bg-muted' },
};

export const WalkdownObservationsList: React.FC<WalkdownObservationsListProps> = ({
  open,
  onOpenChange,
  walkdownEventId,
  pssrId,
  walkdownStatus,
}) => {
  const { observations, isLoading, stats } = useWalkdownObservations(walkdownEventId, pssrId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredObservations = observations?.filter(obs => {
    const matchesSearch = !searchQuery || 
      obs.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.location_details?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || obs.observation_type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || obs.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  }) || [];

  const canAddObservations = walkdownStatus === 'in_progress';

  const renderObservationCard = (observation: WalkdownObservation) => {
    const typeConfig = TYPE_CONFIG[observation.observation_type];

    return (
      <Card key={observation.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn('text-white text-xs', typeConfig.color)}>
                  {typeConfig.icon}
                  <span className="ml-1">{typeConfig.label}</span>
                </Badge>
                {observation.category && (
                  <Badge variant="outline" className="text-xs">
                    {observation.category}
                  </Badge>
                )}
                {observation.priority && (
                  <Badge 
                    className={cn(
                      'text-white text-xs',
                      observation.priority === 'A' ? 'bg-red-500' : 'bg-amber-500'
                    )}
                  >
                    Priority {observation.priority}
                  </Badge>
                )}
              </div>

              <p className="text-sm mb-2">{observation.description}</p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {observation.location_details && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{observation.location_details}</span>
                  </div>
                )}
                {observation.photo_urls && observation.photo_urls.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    <span>{observation.photo_urls.length} photo{observation.photo_urls.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(observation.created_at), 'MMM d, h:mm a')}</span>
                </div>
              </div>

              {observation.linked_priority_action_id && (
                <div className="mt-2 pt-2 border-t">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Priority Action
                  </Button>
                </div>
              )}
            </div>
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
              <FileText className="h-5 w-5 text-primary" />
              Walkdown Observations
            </DialogTitle>
          </DialogHeader>

          {/* Stats */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs">{stats.findings} Findings</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs">{stats.actionsRequired} Actions</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-xs">{stats.notes} Notes</span>
              </div>
            </div>
            {stats.priorityA + stats.priorityB > 0 && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-2">
                  {stats.priorityA > 0 && (
                    <Badge className="bg-red-500 text-white text-xs">
                      {stats.priorityA} Pr A
                    </Badge>
                  )}
                  {stats.priorityB > 0 && (
                    <Badge className="bg-amber-500 text-white text-xs">
                      {stats.priorityB} Pr B
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search observations..."
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="finding">Findings</SelectItem>
                <SelectItem value="action_required">Actions Required</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {OBSERVATION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canAddObservations && (
              <Button onClick={() => setIsAddModalOpen(true)} size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            )}
          </div>

          {/* List */}
          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredObservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {observations?.length === 0 
                    ? 'No observations recorded yet'
                    : 'No observations match your filters'}
                </p>
                {canAddObservations && observations?.length === 0 && (
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    Capture your first observation
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {filteredObservations.map(renderObservationCard)}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Observation Modal */}
      <WalkdownObservationCapture
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        walkdownEventId={walkdownEventId}
        pssrId={pssrId}
      />
    </>
  );
};
