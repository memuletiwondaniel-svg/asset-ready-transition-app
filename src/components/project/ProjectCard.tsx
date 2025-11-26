import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Edit3, Trash2, MoreVertical, Star, GripVertical } from 'lucide-react';

interface ProjectCardProps {
  project: any;
  plantName?: string;
  stationName?: string;
  hubName?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  translations: any;
  dragListeners?: any;
  dragAttributes?: any;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  plantName,
  stationName,
  hubName,
  isFavorite,
  onToggleFavorite,
  onView,
  onEdit,
  onDelete,
  isDragging,
  translations: t,
  dragListeners,
  dragAttributes,
}) => {
  return (
    <Card 
      className={`group relative overflow-hidden border-border/40 bg-gradient-to-br from-card/80 to-card transition-all duration-500 hover:shadow-xl hover:shadow-orange-500/20 hover:border-orange-500/60 hover:-translate-y-1 hover:scale-[1.01] cursor-pointer ${isDragging ? 'opacity-50' : ''}`}
      onClick={(e) => {
        // Check if click is directly on the card or its content, not on buttons
        const target = e.target as HTMLElement;
        const isButton = target.tagName === 'BUTTON' || target.closest('button');
        const isDropdown = target.closest('[role="menu"]') || target.closest('[data-radix-popper-content-wrapper]');
        
        if (!isButton && !isDropdown) {
          onView();
        }
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-amber-500/0 to-yellow-500/0 group-hover:from-orange-500/20 group-hover:via-amber-500/15 group-hover:to-yellow-500/20 transition-all duration-500" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-transparent group-hover:from-red-500/10 group-hover:via-transparent group-hover:to-rose-500/10 transition-all duration-500" />
      
      <CardContent className="relative p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <div 
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              {...dragAttributes}
              {...dragListeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-primary/20 text-xs font-semibold px-2 py-0.5">
                  {project.project_id_prefix}{project.project_id_number}
                </Badge>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite();
                  }}
                  className="h-5 w-5 p-0 hover:bg-transparent inline-flex items-center justify-center rounded-md"
                >
                  <Star
                    className={`h-3.5 w-3.5 transition-all duration-200 ${
                      isFavorite
                        ? 'fill-yellow-400 text-yellow-400 scale-110'
                        : 'text-muted-foreground hover:text-yellow-400 hover:scale-110'
                    }`}
                  />
                </button>
              </div>
              <h3 className="font-bold text-base text-foreground group-hover:bg-gradient-to-r group-hover:from-orange-600 group-hover:to-amber-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-200 truncate">
                {project.project_title}
              </h3>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem 
                onClick={onView}
                className="flex items-center cursor-pointer hover:bg-primary/10 focus:bg-primary/10"
              >
                <Eye className="h-4 w-4 mr-2 text-primary" />
                <span className="text-primary">{t.viewDetails}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onEdit}
                className="flex items-center cursor-pointer hover:bg-accent/10 focus:bg-accent/10"
              >
                <Edit3 className="h-4 w-4 mr-2 text-accent" />
                <span className="text-accent">{t.editProject}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="flex items-center cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                <span className="text-destructive">{t.deleteProject}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div className="p-2.5 rounded-lg bg-gradient-to-r from-muted/30 to-muted/20 group-hover:from-muted/50 group-hover:to-muted/40 transition-colors duration-200">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plant</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-foreground">
                {plantName || 'Not assigned'}
              </span>
              {stationName && (
                <Badge variant="outline" className="text-xs bg-background/50">
                  {stationName}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-gradient-to-r from-muted/30 to-muted/20 group-hover:from-muted/50 group-hover:to-muted/40 transition-colors duration-200">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hub</span>
            <p className="text-sm font-semibold text-foreground mt-1">
              {hubName || 'Not assigned'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Badge variant="outline" className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-600 border-emerald-500/20 font-medium text-xs">
              {t.active || 'Active'}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
