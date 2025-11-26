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
}) => {
  return (
    <Card className={`group relative overflow-hidden border-border/40 bg-gradient-to-br from-card/80 to-card transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 hover:-translate-y-2 hover:scale-[1.02] ${isDragging ? 'opacity-50' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-accent/0 to-primary/0 group-hover:from-primary/20 group-hover:via-accent/15 group-hover:to-primary/20 transition-all duration-500" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-transparent group-hover:from-primary/10 group-hover:via-transparent group-hover:to-accent/10 transition-all duration-500" />
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5">
                  {project.project_id_prefix}{project.project_id_number}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleFavorite}
                  className="h-6 w-6 p-0 hover:bg-transparent"
                >
                  <Star
                    className={`h-4 w-4 transition-all duration-200 ${
                      isFavorite
                        ? 'fill-yellow-400 text-yellow-400 scale-110'
                        : 'text-muted-foreground hover:text-yellow-400 hover:scale-110'
                    }`}
                  />
                </Button>
              </div>
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-200 truncate">
                {project.project_title}
              </h3>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onView} className="flex items-center cursor-pointer hover:bg-primary/10 focus:bg-primary/10">
                <Eye className="h-4 w-4 mr-2 text-primary" />
                <span className="text-primary">{t.viewDetails}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="flex items-center cursor-pointer hover:bg-accent/10 focus:bg-accent/10">
                <Edit3 className="h-4 w-4 mr-2 text-accent" />
                <span className="text-accent">{t.editProject}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="flex items-center cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                <span className="text-destructive">{t.deleteProject}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors duration-200">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plant</span>
            <div className="flex items-center gap-2 mt-1.5">
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

          <div className="p-3 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors duration-200">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hub</span>
            <p className="text-sm font-semibold text-foreground mt-1.5">
              {hubName || 'Not assigned'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
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
