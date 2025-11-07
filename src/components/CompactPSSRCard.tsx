import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MapPin, Users, Pin, PinOff, Edit, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface CompactPSSRCardProps {
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
  onViewDetails: (pssrId: string) => void;
  isPinned: boolean;
  onTogglePin: (pssrId: string) => void;
  onEdit?: (pssrId: string) => void;
  getTeamStatusColor: (teamStatus: string) => string;
}

const CompactPSSRCard: React.FC<CompactPSSRCardProps> = ({
  pssr,
  onViewDetails,
  isPinned,
  onTogglePin,
  onEdit,
  getTeamStatusColor
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
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
      default: return 'border-l-border';
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
      className={`${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      <div
        className={`group relative flex items-center gap-2 p-2 rounded-lg border-l-4 ${getStatusColor(pssr.status)} border-y border-r border-border/50 bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/30 hover:scale-[1.01] ${
          isPinned ? 'ring-1 ring-amber-400/50 bg-amber-50/5' : ''
        }`}
        onClick={() => onViewDetails(pssr.id)}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Status Indicator */}
        <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getTeamStatusColor(pssr.teamStatus)} ring-1 ring-background`} />

        {/* Project Info */}
        <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center">
          {/* ID & Tier */}
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 font-semibold">
              {pssr.projectId}
            </Badge>
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
          </div>

          {/* Name & Location */}
          <div className="min-w-0">
            <h3 className="text-xs font-bold truncate text-foreground group-hover:text-primary transition-colors">
              {pssr.projectName}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {pssr.asset}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {pssr.lastActivity}
              </span>
            </div>
          </div>

          {/* Compact Progress */}
          <div className="flex items-center gap-1.5 min-w-[80px]">
            <div className="relative h-1 bg-muted/50 rounded-full overflow-hidden w-12">
              <div 
                className={`absolute inset-y-0 left-0 ${getProgressColor(pssr.progress)} rounded-full transition-all`}
                style={{ width: `${pssr.progress}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-foreground min-w-[24px]">{pssr.progress}%</span>
          </div>

          {/* Team & Actions */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="font-medium">{pssr.teamMembers}</span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(pssr.id);
                      }}
                    >
                      {isPinned ? (
                        <PinOff className="h-2.5 w-2.5 text-amber-500" />
                      ) : (
                        <Pin className="h-2.5 w-2.5" />
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
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(pssr.id);
                        }}
                      >
                        <Edit className="h-2.5 w-2.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Pinned Indicator */}
        {isPinned && (
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-l-[16px] border-t-amber-400/20 border-l-transparent rounded-tr-lg" />
        )}
      </div>
    </div>
  );
};

export default CompactPSSRCard;
