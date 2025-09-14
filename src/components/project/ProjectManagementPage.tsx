import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, Users, Calendar, FileText, MoreVertical, Eye, Edit3, Trash2, ArrowLeft } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { AddProjectModal } from './AddProjectModal';
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Project Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage all projects, team assignments, and milestones
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>

      {/* Projects Table */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-blue-100/60">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-blue-900">
              <FolderOpen className="h-5 w-5 mr-2" />
              Projects Overview
            </CardTitle>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
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
                          <DropdownMenuItem className="flex items-center text-blue-600 hover:bg-blue-50/80">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center text-green-600 hover:bg-green-50/80">
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
                        <span className="text-gray-700">{project.plant_name || 'Not assigned'}</span>
                        {project.station_name && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {project.station_name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-gray-700">{project.hub_name || 'Not assigned'}</span>
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
    </div>
  );
};

export default ProjectManagementPage;