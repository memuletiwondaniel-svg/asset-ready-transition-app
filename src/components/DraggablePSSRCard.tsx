import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ShieldCheck, AlertTriangle, CheckCircle, Clock, Users, Pin, PinOff, Edit, Copy, Archive } from 'lucide-react';
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
      className={`relative transition-opacity duration-200 ${
        isDragging ? 'opacity-50 z-50' : ''
      }`}
    >
      <Card
        className={`group/pssr-card relative overflow-hidden border-border/50 cursor-pointer transition-shadow transition-colors duration-300 ${
          isPinned ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/40 dark:border-amber-900/40' : 'hover:shadow-lg hover:border-border/80 hover:bg-gradient-to-r hover:from-violet-50/40 hover:via-fuchsia-50/30 hover:to-pink-50/20 dark:hover:from-violet-950/20 dark:hover:via-fuchsia-950/15 dark:hover:to-pink-950/10'
        } ${isDragging ? 'ring-2 ring-primary/30' : ''}`}
        onClick={() => onViewDetails(pssr.id)}
      >

        {/* Quick Actions - Appears on hover */}
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/pssr-card:opacity-100 transition-all duration-200 z-10">
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

        <CardContent className="p-2.5 relative">
          <div className="flex items-start sm:items-center gap-2">
            {/* Drag Handle - Hidden by default, shown on hover */}
            <div
              {...attributes}
              {...listeners}
              className="hidden sm:block cursor-grab active:cursor-grabbing p-2 hover:bg-muted/40 rounded-lg transition-all duration-200 opacity-0 group-hover/pssr-card:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/60 hover:text-foreground transition-colors" />
            </div>

            {/* Main Content - Stacks on mobile, grid on desktop */}
            <div className="flex-1 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 sm:items-center">
              
              {/* Project Info */}
              <div className="sm:col-span-4 min-w-0">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <Badge variant="outline" className="bg-muted border-muted-foreground/30 text-foreground group-hover/pssr-card:bg-primary group-hover/pssr-card:text-primary-foreground group-hover/pssr-card:border-primary font-extrabold text-xs px-2.5 py-0.5 transition-colors">
                    {pssr.projectId}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={`sm:hidden justify-center py-0.5 text-[10px] font-medium ${
                      pssr.status === 'Approved' ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' :
                      pssr.status === 'Under Review' ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' :
                      pssr.status === 'In Progress' ? 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20' :
                      pssr.status === 'Pending' ? 'border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20' :
                      'border-slate-500/40 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20'
                    }`}
                  >
                    {pssr.status}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover/pssr-card:text-primary transition-colors line-clamp-1">
                  {pssr.projectName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">{pssr.asset}</p>
              </div>

              {/* Lead + Progress row on mobile */}
              <div className="flex items-center justify-between sm:contents">
                {/* Lead Info */}
                <div className="sm:col-span-3 flex items-center gap-2">
                  <div className="relative">
                    <img 
                      src={pssr.pssrLeadAvatar} 
                      alt={pssr.pssrLead}
                      className="w-7 h-7 rounded-full border-2 border-border/50 shadow-sm"
                    />
                    <div 
                      className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background ${getTeamStatusColor(pssr.teamStatus)}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-foreground group-hover/pssr-card:text-primary transition-colors truncate">{pssr.pssrLead}</p>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wide">PSSR Lead</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="sm:col-span-2 text-center">
                  <div className="text-lg font-bold text-foreground group-hover/pssr-card:text-primary transition-colors mb-0.5">{pssr.progress}%</div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wide">Complete</p>
                </div>
              </div>

              {/* Status - Desktop only (mobile shown inline above) */}
              <div className="hidden sm:flex sm:col-span-3 flex-col gap-1.5">
                <Badge 
                  variant="outline"
                  className={`justify-center py-1.5 font-medium ${
                    pssr.status === 'Approved' ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' :
                    pssr.status === 'Under Review' ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' :
                    pssr.status === 'In Progress' ? 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20' :
                    pssr.status === 'Pending' ? 'border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20' :
                    'border-slate-500/40 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20'
                  }`}
                >
                  {pssr.status}
                </Badge>
                {pssr.pendingApprovals > 0 && (
                  <p className="text-xs text-center text-muted-foreground">{pssr.pendingApprovals} pending</p>
                )}
              </div>
            </div>

            {/* Pin Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(pssr.id);
              }}
              className={`hidden sm:block p-2 hover:bg-muted/40 rounded-lg transition-all duration-200 ${
                isPinned ? 'opacity-100' : 'opacity-0 group-hover/pssr-card:opacity-100'
              }`}
            >
              {isPinned ? (
                <PinOff className="h-4 w-4 text-amber-500" />
              ) : (
                <Pin className="h-4 w-4 text-muted-foreground hover:text-amber-500 transition-colors" />
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggablePSSRCard;