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
        className={`group relative flex items-center gap-2 p-2 pr-8 rounded-lg border-l-4 ${getStatusColor(pssr.status)} border-y border-r border-border/50 bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/30 hover:scale-[1.01] ${
          isPinned ? 'ring-1 ring-amber-400/50 bg-amber-50/5' : ''
        }`}
        onClick={() => onViewDetails(pssr.id)}
      >
        {/* Drag Handle - Always visible on right */}
        <div
          {...attributes}
          {...listeners}
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Status Indicator */}
        <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getTeamStatusColor(pssr.teamStatus)} ring-1 ring-background`} />

        {/* Column Layout - Aligned */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {/* Column 1: Project ID + Name + Asset */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 font-semibold flex-shrink-0 w-16 text-center">
              {pssr.projectId}
            </Badge>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <h3 className="text-xs font-bold truncate text-foreground group-hover:text-primary transition-colors">
                {pssr.projectName}
              </h3>
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
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

          {/* Column 4: Team Count */}
          <div className="w-12 flex-shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span className="font-medium">{pssr.teamMembers}</span>
          </div>

          {/* Column 5: Tier */}
          <Badge 
            variant="outline" 
            className={`text-[9px] px-1 py-0 flex-shrink-0 ${
              pssr.tier === 1 ? 'border-rose-500/60 text-rose-600 dark:text-rose-400 bg-rose-500/10' :
              pssr.tier === 2 ? 'border-amber-500/60 text-amber-600 dark:text-amber-400 bg-amber-500/10' :
              'border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
            }`}
          >
            T{pssr.tier}
          </Badge>
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
