import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, AlertTriangle, CheckCircle, Clock, Users, Pin, PinOff, Edit, Copy, Archive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
        className={`group relative overflow-hidden border-border/50 cursor-pointer transition-all duration-200 ${
          isPinned ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/40 dark:border-amber-900/40' : 'hover:shadow-md hover:border-border/80'
        } ${isDragging ? 'ring-2 ring-primary/30' : ''}`}
        onClick={() => onViewDetails(pssr.id)}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/2 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Quick Actions - Appears on hover */}
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
          <TooltipProvider delayDuration={100}>
            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 bg-background/80 hover:bg-background border border-border/50 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(pssr.id);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit PSSR</TooltipContent>
              </Tooltip>
            )}
            {onDuplicate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 bg-background/80 hover:bg-background border border-border/50 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(pssr.id);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate PSSR</TooltipContent>
              </Tooltip>
            )}
            {onArchive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 bg-background/80 hover:bg-background border border-border/50 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(pssr.id);
                    }}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Archive PSSR</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        <CardContent className="p-5 relative">
          <div className="flex items-center gap-4">
            {/* Drag Handle - Shows on hover */}
            <div
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-2 hover:bg-muted/40 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
              
              {/* Project Info - 3 cols */}
              <div className="col-span-3 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-primary text-primary-foreground font-semibold text-xs px-2.5 py-0.5">
                    {pssr.projectId}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-medium ${
                      pssr.tier === 1 ? 'border-red-500/40 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20' :
                      pssr.tier === 2 ? 'border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20' :
                      'border-green-500/40 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20'
                    }`}
                  >
                    Tier {pssr.tier}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {pssr.projectName}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{pssr.asset}</p>
              </div>

              {/* Lead Info - 3 cols */}
              <div className="col-span-3 flex items-center gap-2.5">
                <img 
                  src={pssr.pssrLeadAvatar} 
                  alt={pssr.pssrLead}
                  className="w-9 h-9 rounded-full border-2 border-border/50 shadow-sm"
                />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">PSSR Lead</p>
                  <p className="text-sm font-medium text-foreground truncate">{pssr.pssrLead}</p>
                </div>
              </div>

              {/* Progress - 2 cols */}
              <div className="col-span-2 text-center">
                <div className="text-2xl font-bold text-foreground mb-0.5">{pssr.progress}%</div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Complete</p>
              </div>

              {/* Status & Pin - 4 cols */}
              <div className="col-span-4 flex items-center justify-end gap-2">
                <Badge 
                  variant="outline"
                  className={`py-1.5 px-3 font-medium ${
                    pssr.status === 'Approved' ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' :
                    pssr.status === 'Under Review' ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' :
                    pssr.status === 'In Progress' ? 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20' :
                    pssr.status === 'Pending' ? 'border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20' :
                    'border-slate-500/40 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20'
                  }`}
                >
                  {pssr.status}
                  {pssr.pendingApprovals > 0 && (
                    <span className="ml-2 text-[10px]">({pssr.pendingApprovals})</span>
                  )}
                </Badge>
                
                {/* Pin Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(pssr.id);
                  }}
                  className="p-2 hover:bg-muted/40 rounded-lg transition-colors flex-shrink-0"
                >
                  {isPinned ? (
                    <PinOff className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Pin className="h-4 w-4 text-muted-foreground hover:text-amber-500 transition-colors" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggablePSSRCard;
