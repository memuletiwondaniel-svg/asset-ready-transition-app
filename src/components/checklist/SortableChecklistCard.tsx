import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  User, 
  ListChecks, 
  ClipboardList,
  Eye,
  Edit3,
  Trash2,
  GripVertical,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checklist } from '@/hooks/useChecklists';

interface SortableChecklistCardProps {
  checklist: Checklist;
  onSelect: (checklist: Checklist) => void;
  onEdit: (checklist: Checklist) => void;
  onDelete: (checklist: Checklist) => void;
}

export const SortableChecklistCard: React.FC<SortableChecklistCardProps> = ({
  checklist,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: checklist.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Status-based styling
  const getStatusStyles = () => {
    switch(checklist.status) {
      case 'approved':
        return {
          border: 'border-l-4 border-l-green-500',
          gradient: 'from-green-500/10 via-transparent to-transparent',
          badgeClass: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30'
        };
      case 'active':
        return {
          border: 'border-l-4 border-l-blue-500',
          gradient: 'from-blue-500/10 via-transparent to-transparent',
          badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
        };
      case 'draft':
        return {
          border: 'border-l-4 border-l-gray-400',
          gradient: 'from-gray-400/10 via-transparent to-transparent',
          badgeClass: 'bg-gray-400/10 text-gray-700 dark:text-gray-300 border-gray-400/30'
        };
      case 'rejected':
        return {
          border: 'border-l-4 border-l-red-500',
          gradient: 'from-red-500/10 via-transparent to-transparent',
          badgeClass: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30'
        };
      default:
        return {
          border: 'border-l-4 border-l-primary',
          gradient: 'from-primary/10 via-transparent to-transparent',
          badgeClass: 'bg-primary/10 text-primary border-primary/30'
        };
    }
  };
  
  const statusStyles = getStatusStyles();

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={`group relative hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden bg-card/90 backdrop-blur-sm hover:bg-card hover:-translate-y-2 hover:scale-[1.02] animate-fade-in ${statusStyles.border}`}
        onClick={() => onSelect(checklist)}
      >
        {/* Drag Handle */}
        <div 
          className="absolute left-2 top-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Status Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-r ${statusStyles.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {/* Animated Border Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-3 relative">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-3 group-hover:text-primary transition-colors line-clamp-2">
                {checklist.name}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-0 relative">
          {/* Status & Badges Row */}
          <div className="flex gap-2 flex-wrap pb-3 border-b border-border/50 animate-fade-in">
            <Badge 
              className={`text-xs font-medium capitalize ${statusStyles.badgeClass}`}
            >
              {checklist.status}
            </Badge>
            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20">
              <ListChecks className="h-3 w-3 mr-1" />
              {checklist.items_count || 0} Items
            </Badge>
            {checklist.active_pssr_count > 0 && (
              <Badge className="text-xs bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">
                <ClipboardList className="h-3 w-3 mr-1" />
                {checklist.active_pssr_count} Active PSSR{checklist.active_pssr_count !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5 text-sm">
            <div className="flex items-start gap-2.5">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Reason</p>
                <p className="font-medium line-clamp-2 text-foreground">{checklist.reason}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {checklist.created_by_email && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Created By</p>
                    <p className="text-xs font-medium truncate">{checklist.created_by_email}</p>
                  </div>
                </div>
              )}
              
              {checklist.created_at && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-xs font-medium">{new Date(checklist.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3-Dot Menu */}
          <div className="absolute top-3 right-3" onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onSelect(checklist)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(checklist)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(checklist)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};