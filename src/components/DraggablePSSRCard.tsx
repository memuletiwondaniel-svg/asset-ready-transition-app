import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ShieldCheck, AlertTriangle, CheckCircle, Clock, Users, Pin, PinOff } from 'lucide-react';

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
  onTogglePin
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
      className={`relative transition-all duration-300 ${
        isDragging 
          ? 'opacity-50 scale-105 z-50 shadow-2xl' 
          : isOver 
            ? 'scale-102' 
            : ''
      }`}
    >
      <div 
        className={`fluent-card h-32 p-3 hover:shadow-fluent-lg transition-all duration-300 cursor-pointer group animate-fade-in border-l-4 ${
          isPinned ? 'border-l-warning bg-warning/5' : 'border-l-primary/20'
        } hover:border-l-primary relative overflow-hidden ${
          isDragging ? 'ring-2 ring-primary/50 bg-primary/5' : ''
        }`}
        style={{ animationDelay: `${0.7 + index * 0.1}s` }}
        onClick={() => onViewDetails(pssr.id)}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted/20 rounded-lg transition-colors duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors duration-200" />
        </div>

        {/* Pin/Unpin Button */}
        <div className="absolute right-2 top-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(pssr.id);
            }}
            className="p-1.5 hover:bg-muted/20 rounded-lg transition-colors duration-200 group/pin"
          >
            {isPinned ? (
              <PinOff className="h-4 w-4 text-warning hover:text-warning/70 transition-colors duration-200" />
            ) : (
              <Pin className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors duration-200" />
            )}
          </button>
        </div>

        {/* Modern gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10 flex items-stretch justify-between ml-7 mr-8 h-full">
          
          {/* Primary Info - Project ID and Name on Same Row */}
          <div className="flex-1 min-w-0 max-w-md flex flex-col justify-center">
            {/* Project ID and Name on Same Row */}
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground px-2.5 py-1 rounded-lg font-bold text-sm shadow-fluent-sm group-hover:shadow-fluent-md transition-all duration-200">
                {pssr.projectId}
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors duration-200 leading-tight line-clamp-1 flex-1">
                {pssr.projectName}
              </h3>
            </div>
            
            {/* Asset - Made Conspicuous */}
            <div className="bg-accent/30 border-2 border-accent/50 rounded-lg px-3 py-1.5 mb-1.5 shadow-sm group-hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-foreground flex-shrink-0" />
                <span className="text-sm font-bold text-accent-foreground">Asset: {pssr.asset}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <div className="flex items-center gap-2">
                <div className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(pssr.priority)}`}>
                  {pssr.priority}
                </div>
                {getStatusIcon(pssr.status)}
              </div>
              <span>•</span>
              <span>{new Date(pssr.created).toLocaleDateString()}</span>
            </div>
          </div>

          {/* PSSR Lead with Enhanced Info (Center) */}
          <div className="flex items-center gap-3 px-3 flex-1 min-w-0">
            {/* Lead Profile */}
            <div className="text-center flex-shrink-0">
              <div className="text-xs text-muted-foreground font-medium mb-0.5">PSSR Lead</div>
              <div className="relative mb-1">
                <img 
                  src={pssr.pssrLeadAvatar} 
                  alt={pssr.pssrLead}
                  className="w-8 h-8 rounded-xl border-2 border-primary/20 shadow-fluent-sm group-hover:shadow-fluent-md transition-all duration-200 group-hover:border-primary/40"
                />
                {/* Teams-style status indicator with dynamic colors */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-card rounded-full flex items-center justify-center border border-border">
                  <div className={`w-1.5 h-1.5 rounded-full ${getTeamStatusColor(pssr.teamStatus)}`}></div>
                </div>
              </div>
              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors duration-200 truncate max-w-16">
                {pssr.pssrLead.split(' ')[0]}
              </div>
            </div>

            {/* Team Info Only */}
            <div className="flex gap-2.5 flex-wrap">
              <div className="bg-muted/30 border border-border/50 rounded-lg p-2 min-w-0 hover:bg-muted/50 transition-colors duration-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Users className="h-2.5 w-2.5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Team</span>
                </div>
                <div className="text-xs font-semibold text-foreground">{pssr.teamMembers} members</div>
                <div className="text-xs text-muted-foreground truncate">{pssr.location}</div>
              </div>
            </div>
          </div>

          {/* Status Only (Right) */}
          <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0 min-w-0">
            {/* Status Badge - More Prominent */}
            <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm border shadow-fluent-sm transition-all duration-200 group-hover:shadow-fluent-md ${
              pssr.status === 'Approved' ? 'bg-success/10 text-success border-success/30' :
              pssr.status === 'Under Review' ? 'bg-warning/10 text-warning border-warning/30' :
              'bg-muted/30 text-muted-foreground border-muted/30'
            }`}>
              {pssr.status}
            </div>

            {/* Pending Approvals Indicator */}
            {pssr.pendingApprovals > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-warning/10 border border-warning/30 rounded-md">
                <AlertTriangle className="h-3 w-3 text-warning" />
                <span className="text-xs font-medium text-warning">{pssr.pendingApprovals} pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Drag Indicator when dragging */}
        {isDragging && (
          <div className="absolute -top-2 -left-2 -right-2 -bottom-2 border-2 border-dashed border-primary/50 rounded-xl bg-primary/5" />
        )}
      </div>
    </div>
  );
};

export default DraggablePSSRCard;