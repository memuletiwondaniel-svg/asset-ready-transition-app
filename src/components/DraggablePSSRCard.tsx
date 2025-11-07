import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, AlertTriangle, CheckCircle, Clock, Users, Pin, PinOff, Edit, Copy, Archive, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface DraggablePSSRCardProps {
  pssr: {
    id: string;
    projectId: string;
    projectName: string;
    asset: string;
    status: string;
    priority: string;
    progress: number;
    created: string;
    pssrLead: string;
    pssrLeadAvatar: string;
    teamStatus: string;
    pendingApprovals: number;
    completedDate: string | null;
    riskLevel: string;
    nextReview: string | null;
    teamMembers: number;
    lastActivity: string;
    location: string;
    tier: 1 | 2 | 3;
  };
  index: number;
  onViewDetails: (pssrId: string) => void;
  getPriorityColor: (priority: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getTeamStatusColor: (teamStatus: string) => string;
  getRiskLevelColor: (riskLevel: string) => string;
  isPinned: boolean;
  onTogglePin: (pssrId: string) => void;
  onEdit?: (pssrId: string) => void;
  onDuplicate?: (pssrId: string) => void;
  onArchive?: (pssrId: string) => void;
}

const DraggablePSSRCard: React.FC<DraggablePSSRCardProps> = ({
  pssr,
  index,
  onViewDetails,
  getPriorityColor,
  getStatusIcon,
  getTeamStatusColor,
  getRiskLevelColor,
  isPinned,
  onTogglePin,
  onEdit,
  onDuplicate,
  onArchive
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({ id: pssr.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'border-emerald-500';
      case 'Under Review': return 'border-amber-500';
      case 'In Progress': return 'border-blue-500';
      case 'Pending': return 'border-orange-500';
      default: return 'border-slate-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-500/10';
      case 'Under Review': return 'bg-amber-500/10';
      case 'In Progress': return 'bg-blue-500/10';
      case 'Pending': return 'bg-orange-500/10';
      default: return 'bg-slate-500/10';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-all duration-200 ${
        isDragging 
          ? 'opacity-50 scale-[1.02] z-50' 
          : isOver 
            ? 'scale-[1.01]' 
            : ''
      }`}
    >
      <Card
        className={`group relative overflow-hidden border-border/40 cursor-pointer transition-all duration-300 ${
          isPinned ? 'ring-2 ring-amber-400/50 shadow-lg shadow-amber-100/20 dark:shadow-amber-900/20' : 'hover:shadow-lg hover:border-primary/30'
        } ${isDragging ? 'ring-2 ring-primary/30' : ''}`}
        onClick={() => onViewDetails(pssr.id)}
      >
        {/* Status Color Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(pssr.status)}`} />

        {/* Pinned Indicator */}
        {isPinned && (
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-l-[40px] border-t-amber-400/20 border-l-transparent" />
        )}

        {/* Drag Handle - Shows on hover */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted/50 rounded-md"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Quick Actions - Top Right */}
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(pssr.id);
                  }}
                >
                  {isPinned ? (
                    <PinOff className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Pin className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
            </Tooltip>

            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(pssr.id);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            )}

            {onDuplicate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(pssr.id);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate</TooltipContent>
              </Tooltip>
            )}

            {onArchive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(pssr.id);
                    }}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Archive</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        <CardContent className="p-6 pl-8">
          <div className="space-y-4">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="font-mono font-semibold">
                    {pssr.projectId}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      pssr.tier === 1 ? 'border-red-500/50 text-red-600 dark:text-red-400' :
                      pssr.tier === 2 ? 'border-orange-500/50 text-orange-600 dark:text-orange-400' :
                      'border-green-500/50 text-green-600 dark:text-green-400'
                    }`}
                  >
                    Tier {pssr.tier}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                  {pssr.projectName}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {pssr.asset}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {pssr.lastActivity}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <Badge 
                className={`${getStatusBg(pssr.status)} ${getStatusColor(pssr.status).replace('border-', 'text-')} border-0 font-medium`}
              >
                {pssr.status}
                {pssr.pendingApprovals > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-background/40 rounded text-[10px]">
                    {pssr.pendingApprovals}
                  </span>
                )}
              </Badge>
            </div>

            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold text-foreground">{pssr.progress}%</span>
              </div>
              <Progress value={pssr.progress} className="h-2" />
            </div>

            {/* Footer Row */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              {/* Lead Info */}
              <div className="flex items-center gap-2">
                <img 
                  src={pssr.pssrLeadAvatar} 
                  alt={pssr.pssrLead}
                  className="w-8 h-8 rounded-full border-2 border-border/50"
                />
                <div>
                  <p className="text-xs text-muted-foreground">PSSR Lead</p>
                  <p className="text-sm font-medium text-foreground">{pssr.pssrLead}</p>
                </div>
              </div>

              {/* Team & Priority */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground font-medium">{pssr.teamMembers}</span>
                </div>
                <div className={`h-2 w-2 rounded-full ${getTeamStatusColor(pssr.teamStatus)}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggablePSSRCard;
