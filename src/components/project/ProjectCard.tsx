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
    <Card className={`relative overflow-hidden border-border/40 bg-gradient-to-br from-white to-blue-50/30 transition-all hover:shadow-lg ${isDragging ? 'opacity-50' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-blue-100/80 text-blue-700 border-blue-200/60 text-xs font-medium">
                  {project.project_id_prefix}{project.project_id_number}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleFavorite}
                  className="h-6 w-6 p-0 hover:bg-transparent"
                >
                  <Star
                    className={`h-4 w-4 transition-all ${
                      isFavorite
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground hover:text-yellow-400'
                    }`}
                  />
                </Button>
              </div>
              <h3 className="font-semibold text-lg text-gray-900 truncate">
                {project.project_title}
              </h3>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onView} className="flex items-center text-blue-600">
                <Eye className="h-4 w-4 mr-2" />
                {t.viewDetails}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="flex items-center text-green-600">
                <Edit3 className="h-4 w-4 mr-2" />
                {t.editProject}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="flex items-center text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                {t.deleteProject}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">Plant:</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-gray-700">
                {plantName || 'Not assigned'}
              </span>
              {stationName && (
                <Badge variant="outline" className="text-xs">
                  {stationName}
                </Badge>
              )}
            </div>
          </div>

          <div>
            <span className="text-sm text-muted-foreground">Hub:</span>
            <p className="text-sm font-medium text-gray-700 mt-1">
              {hubName || 'Not assigned'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <Badge variant="outline" className="bg-green-100/80 text-green-700 border-green-200/60">
              {t.active || 'Active'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
