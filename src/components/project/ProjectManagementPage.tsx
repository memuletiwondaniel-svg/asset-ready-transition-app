import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, Users, Calendar, FileText, MoreVertical, Eye, Edit3, Trash2, ArrowLeft } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { AddProjectModal } from './AddProjectModal';
import { ViewProjectModal } from './ViewProjectModal';
import { EditProjectModal } from './EditProjectModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectManagementPageProps {
  onBack?: () => void;
}

const ProjectManagementPage = ({ onBack }: ProjectManagementPageProps) => {
  const { projects, isLoading, deleteProject } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewProject, setViewProject] = useState<any>(null);
  const [editProject, setEditProject] = useState<any>(null);

  const getProjectId = (project: any) => {
    return `${project.project_id_prefix}${project.project_id_number}`;
  };

  const getStatusBadge = (project: any) => {
    return (
      <Badge variant="outline" className="bg-green-100/80 text-green-700 border-green-200/60">
        Active
      </Badge>
    );
  };

  const getPlantName = (plantId: string) => {
    return plants.find(p => p.id === plantId)?.name;
  };

  const getStationName = (stationId: string) => {
    return stations.find(s => s.id === stationId)?.name;
  };

  const getHubName = (hubId: string) => {
    return hubs.find(h => h.id === hubId)?.name;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-20 items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="h-10 px-4 py-2 rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-accent/50 hover:border-border transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] font-medium text-foreground/90 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to Admin & Tools
            </Button>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="transition-all duration-300 hover:scale-110 hover:drop-shadow-lg">
              <img 
                src="/images/orsh-logo.png" 
                alt="ORSH Logo" 
                className="h-40 w-auto filter drop-shadow-sm" 
              />
            </div>
          </div>
          <div className="w-40"></div> {/* Spacer to center the logo */}
        </div>
      </div>

      {/* Projects Table */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-blue-100/60">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-blue-900">
              <FolderOpen className="h-5 w-5 mr-2" />
              Projects Overview
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Projects Found</h3>
              <p className="text-gray-500 mb-4">
                Get started by creating your first project
              </p>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-blue-100/60 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Actions</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Project ID</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Project Title</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Plant</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Hub</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Status</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project, index) => (
                  <TableRow 
                    key={project.id}
                    className={`border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-white/60' : 'bg-blue-50/20'
                    }`}
                  >
                    <TableCell className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg border border-gray-200/60">
                          <DropdownMenuItem 
                            className="flex items-center text-blue-600 hover:bg-blue-50/80"
                            onClick={() => setViewProject(project)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center text-green-600 hover:bg-green-50/80"
                            onClick={() => setEditProject(project)}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center text-red-600 hover:bg-red-50/80"
                            onClick={() => deleteProject(project.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge 
                        variant="outline" 
                        className="bg-blue-100/80 text-blue-700 border-blue-200/60 text-xs font-medium"
                      >
                        {getProjectId(project)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="font-medium text-gray-900">{project.project_title}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-gray-700">{getPlantName(project.plant_id) || 'Not assigned'}</span>
                        {project.station_id && getStationName(project.station_id) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {getStationName(project.station_id)}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-gray-700">{getHubName(project.hub_id) || 'Not assigned'}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {getStatusBadge(project)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-gray-600">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Project Modal */}
      <AddProjectModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* View Project Modal */}
      <ViewProjectModal 
        open={!!viewProject}
        onClose={() => setViewProject(null)}
        project={viewProject}
        plantName={viewProject ? getPlantName(viewProject.plant_id) : undefined}
        stationName={viewProject ? getStationName(viewProject.station_id) : undefined}
        hubName={viewProject ? getHubName(viewProject.hub_id) : undefined}
      />

      {/* Edit Project Modal */}
      <EditProjectModal 
        open={!!editProject}
        onClose={() => setEditProject(null)}
        project={editProject}
      />
    </div>
  );
};

export default ProjectManagementPage;