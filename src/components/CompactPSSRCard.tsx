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
      case 'Approved': return 'border-emerald-500';
      case 'Under Review': return 'border-amber-500';
      case 'In Progress': return 'border-blue-500';
      case 'Pending': return 'border-orange-500';
      default: return 'border-border';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      <div
        className={`group relative flex items-center gap-3 p-3 rounded-lg border bg-card/50 backdrop-blur-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
          isPinned ? 'ring-1 ring-amber-400/50 bg-amber-50/5' : ''
        } ${getStatusColor(pssr.status)}`}
        onClick={() => onViewDetails(pssr.id)}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Status Indicator */}
        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${getTeamStatusColor(pssr.teamStatus)}`} />

        {/* Project Info */}
        <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center">
          {/* ID & Tier */}
          <div className="flex items-center gap-2">
            <Badge variant="default" className="font-mono text-xs px-2 py-0.5">
              {pssr.projectId}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 ${
                pssr.tier === 1 ? 'border-red-500/50 text-red-600 dark:text-red-400' :
                pssr.tier === 2 ? 'border-orange-500/50 text-orange-600 dark:text-orange-400' :
                'border-green-500/50 text-green-600 dark:text-green-400'
              }`}
            >
              T{pssr.tier}
            </Badge>
          </div>

          {/* Name & Location */}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
              {pssr.projectName}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {pssr.asset}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {pssr.lastActivity}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={pssr.progress} className="h-1.5 w-20" />
            <span className="text-xs font-medium text-foreground min-w-[32px]">{pssr.progress}%</span>
          </div>

          {/* Team & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium">{pssr.teamMembers}</span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(pssr.id);
                      }}
                    >
                      {isPinned ? (
                        <PinOff className="h-3 w-3 text-amber-500" />
                      ) : (
                        <Pin className="h-3 w-3" />
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
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(pssr.id);
                        }}
                      >
                        <Edit className="h-3 w-3" />
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
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-l-[20px] border-t-amber-400/20 border-l-transparent rounded-tr-lg" />
        )}
      </div>
    </div>
  );
};

export default CompactPSSRCard;
