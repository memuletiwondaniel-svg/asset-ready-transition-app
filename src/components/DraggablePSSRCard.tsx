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
      case 'Approved': return 'border-l-emerald-500';
      case 'Under Review': return 'border-l-amber-500';
      case 'In Progress': return 'border-l-violet-500';
      case 'Pending': return 'border-l-orange-500';
      default: return 'border-l-slate-500';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-violet-500';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-orange-500';
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
        className={`group relative overflow-hidden border-l-4 ${getStatusColor(pssr.status)} bg-gradient-to-br from-card to-card/50 cursor-pointer transition-all duration-300 ${
          isPinned ? 'ring-2 ring-amber-400/50 shadow-lg shadow-amber-100/20 dark:shadow-amber-900/20' : 'hover:shadow-lg hover:border-primary/30 hover:scale-[1.01]'
        } ${isDragging ? 'ring-2 ring-primary/30' : ''}`}
        onClick={() => onViewDetails(pssr.id)}
      >

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

        <CardContent className="p-3 pr-10">
          <div className="flex items-center gap-3">
            {/* Column 1: Project ID + Name + Asset */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <Badge variant="secondary" className="font-mono font-semibold text-[10px] px-1.5 py-0 flex-shrink-0 w-16 text-center">
                {pssr.projectId}
              </Badge>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {pssr.projectName}
                </h3>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                  <MapPin className="h-2.5 w-2.5" />
                  {pssr.asset}
                </span>
              </div>
            </div>

            {/* Column 2: Status (Fixed Width) */}
            <div className="w-24 flex-shrink-0">
              <Badge variant="outline" className="text-[9px] px-2 py-0.5 w-full justify-center">
                {pssr.status}
              </Badge>
            </div>

            {/* Column 3: Progress (Left Aligned) */}
            <div className="w-16 flex-shrink-0">
              <span className="text-sm font-bold text-primary">{pssr.progress}%</span>
            </div>

            {/* Column 4: PSSR Lead (Left Aligned) */}
            <div className="w-32 flex-shrink-0 flex items-center gap-1.5">
              <img 
                src={pssr.pssrLeadAvatar} 
                alt={pssr.pssrLead}
                className="w-5 h-5 rounded-full border border-primary/20 flex-shrink-0"
              />
              <span className="text-[10px] font-medium text-foreground truncate">{pssr.pssrLead}</span>
            </div>

            {/* Column 5: Tier + Team + Status */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge 
                variant="outline" 
                className={`text-[9px] px-1 py-0 ${
                  pssr.tier === 1 ? 'border-rose-500/60 text-rose-600 dark:text-rose-400 bg-rose-500/10' :
                  pssr.tier === 2 ? 'border-amber-500/60 text-amber-600 dark:text-amber-400 bg-amber-500/10' :
                  'border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                }`}
              >
                T{pssr.tier}
              </Badge>
              {pssr.pendingApprovals > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0">
                  {pssr.pendingApprovals}
                </Badge>
              )}
              <div className="flex items-center gap-0.5 text-muted-foreground">
                <Users className="h-2.5 w-2.5" />
                <span className="text-[10px] font-medium">{pssr.teamMembers}</span>
              </div>
              <div className={`h-2 w-2 rounded-full ${getTeamStatusColor(pssr.teamStatus)} ring-1 ring-background shadow-sm`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggablePSSRCard;
