
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, ArrowLeft, Building, MapPin, User, Calendar, Crown } from 'lucide-react';
import { useProjectsData } from '@/hooks/useProjectsData';
import AddNewProjectWidget from '@/components/AddNewProjectWidget';
import { format } from 'date-fns';

interface ProjectListProps {
  onBack?: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { projects, handleNewProjectAdded } = useProjectsData();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  console.log('ProjectList: Component rendered with projects:', projects);
  console.log('ProjectList: showCreateProject state:', showCreateProject);

  useEffect(() => {
    console.log('ProjectList: useEffect triggered, projects changed:', projects);
  }, [projects]);

  const handleBack = () => {
    console.log('ProjectList: Navigating back from Project List');
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const handleEditProject = (projectId: string) => {
    console.log('ProjectList: Edit project clicked:', projectId);
    setSelectedProject(projectId);
    // TODO: Open edit modal or navigate to edit page
    console.log('ProjectList: Edit project:', projectId);
  };

  const handleCreateProject = () => {
    console.log('ProjectList: Opening create project modal');
    setShowCreateProject(true);
  };

  const handleCreateProjectSubmit = (projectData: any) => {
    console.log('ProjectList: Creating new project with data:', projectData);
    const newProject = handleNewProjectAdded(projectData);
    console.log('ProjectList: New project created:', newProject);
    setShowCreateProject(false);
    console.log('ProjectList: Create project modal closed');
  };

  // Format project ID for display - add DP prefix
  const formatProjectId = (id: string) => {
    return id.startsWith('DP') ? id : `DP ${id}`;
  };

  console.log('ProjectList: About to render with', projects.length, 'projects');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
              <p className="text-gray-600">Manage all your projects in one place</p>
            </div>
          </div>
          <Button onClick={handleCreateProject} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              All Projects ({projects.length})
            </CardTitle>
            <CardDescription>
              View and manage all your projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Yet</h3>
                <p className="text-gray-600 mb-4">Create your first project to get started</p>
                <Button onClick={handleCreateProject}>Create Project</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DP Number</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Subdivision</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Project Manager</TableHead>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Milestone Date</TableHead>
                    <TableHead>Team Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => {
                    console.log('ProjectList: Rendering project row:', project);
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {formatProjectId(project.id)}
                            {project.scorecardProject === 'yes' && (
                              <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                                <Crown className="h-3 w-3 mr-1" />
                                Scorecard
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            {project.plant}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {project.subdivision || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.scope}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {project.hubLead?.name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {project.milestone || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {project.milestoneDate ? format(project.milestoneDate, 'MMM dd, yyyy') : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {1 + project.others.length} members
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProject(project.id)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Project Modal */}
      <AddNewProjectWidget
        open={showCreateProject}
        onClose={() => {
          console.log('ProjectList: Closing create project modal');
          setShowCreateProject(false);
        }}
        onSubmit={handleCreateProjectSubmit}
        editMode={false}
      />
    </div>
  );
};

export default ProjectList;
