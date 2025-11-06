import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, Users, Calendar, FileText, MoreVertical, Eye, Edit3, Trash2, ArrowLeft, Home } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/admin/ThemeToggle';
import LanguageSelector from '@/components/admin/LanguageSelector';
import UserProfileDropdown from '@/components/admin/UserProfileDropdown';
import AdminHeader from '@/components/admin/AdminHeader';
import { getCurrentTranslations } from '@/utils/translations';
import { useProjects } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { supabase } from '@/integrations/supabase/client';
import { AddProjectModal } from './AddProjectModal';
import { ViewProjectModal } from './ViewProjectModal';
import { EditProjectModal } from './EditProjectModal';
import OrshLogo from '../ui/OrshLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectManagementPageProps {
  onBack?: () => void;
  selectedLanguage?: string;
  translations?: any;
}

const ProjectManagementPage = ({ onBack, selectedLanguage = 'English', translations }: ProjectManagementPageProps) => {
  const { projects, isLoading, deleteProject } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();
  const { mutate: logActivity } = useLogActivity();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewProject, setViewProject] = useState<any>(null);
  const [editProject, setEditProject] = useState<any>(null);
  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);
  
  // Get translations
  const t = translations || getCurrentTranslations(currentLanguage);

  const getProjectId = (project: any) => {
    return `${project.project_id_prefix}${project.project_id_number}`;
  };

  const getStatusBadge = (project: any) => {
    return (
                      <Badge variant="outline" className="bg-green-100/80 text-green-700 border-green-200/60">
                        {t.active}
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

  const handleDeleteProject = async (project: any) => {
    try {
      deleteProject(project.id);
      
      // Log activity
      logActivity({
        activityType: 'project_deleted',
        description: `Deleted project: ${project.project_id_prefix}${project.project_id_number} - ${project.project_title}`,
        metadata: {
          project_id: `${project.project_id_prefix}${project.project_id_number}`,
          project_title: project.project_title
        }
      });
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Breadcrumb */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
        <div className="container flex h-20 items-center justify-between gap-4">
          {/* Left - Breadcrumb Navigation */}
          <div className="flex items-center min-w-0 flex-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    onClick={onBack}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Home</span>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    onClick={onBack}
                    className="cursor-pointer hover:text-foreground transition-colors hidden sm:inline"
                  >
                    Administration
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:inline" />
                <BreadcrumbItem className="hidden sm:inline">
                  <BreadcrumbPage className="font-medium">
                    Project Management
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Right - Controls */}
          <div className="flex items-center gap-3 justify-end flex-1">
            <OrshLogo size="medium" />
            <ThemeToggle />
            <LanguageSelector 
              selectedLanguage={currentLanguage}
              onLanguageChange={setCurrentLanguage}
            />
            <UserProfileDropdown translations={t} />
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Projects Table */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-blue-100/60">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-blue-900">
              <FolderOpen className="h-5 w-5 mr-2" />
              {t.projectsOverview}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">{t.totalProjects || 'No Projects Found'}</h3>
              <p className="text-gray-500 mb-4">{t.createProject || 'Get started by creating your first project'}</p>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.createProject}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-blue-100/60 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">{t.actions}</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Project ID</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Project Title</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Plant</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">Hub</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">{t.active || 'Status'}</TableHead>
                  <TableHead className="font-semibold text-blue-900 px-6 py-4">{t.createdAt}</TableHead>
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
                            {t.viewDetails}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center text-green-600 hover:bg-green-50/80"
                            onClick={() => setEditProject(project)}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            {t.editProject}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center text-red-600 hover:bg-red-50/80"
                            onClick={() => handleDeleteProject(project)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t.deleteProject}
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
      </div>

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