
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Award } from 'lucide-react';
import AddNewProjectWidget from './AddNewProjectWidget';

interface ProjectMember {
  name: string;
  role?: string;
  email: string;
  avatar: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  plant: string;
  subdivision?: string;
  scope: string;
  milestone?: string;
  scorecardProject?: string;
  hubLead: ProjectMember;
  others: ProjectMember[];
}

interface ProjectDetailsProps {
  project: Project;
  onContextAction: (action: string, person: ProjectMember) => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onContextAction }) => {
  const [showEditProject, setShowEditProject] = useState(false);
  const currentYear = new Date().getFullYear();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green':
        return 'bg-green-500';
      case 'amber':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleEditProject = (projectData: any) => {
    // Handle project update here
    console.log('Project updated:', projectData);
    setShowEditProject(false);
  };

  return (
    <>
      <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
        {/* Header with Edit Button */}
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-base font-semibold text-gray-900">Project Information</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditProject(true)}
            className="text-xs px-2 py-1 h-7"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>

        {/* Project Details Grid - Optimized Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-md">
            <span className="text-xs text-gray-600 block mb-1">Project Name</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{project.name}</span>
              {project.scorecardProject === 'Yes' && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-500 flex items-center gap-1 text-xs px-2 py-0.5">
                  <Award className="h-3 w-3" />
                  Scorecard
                </Badge>
              )}
            </div>
          </div>
          
          <div className="p-2 bg-gray-50 rounded-md">
            <span className="text-xs text-gray-600 block mb-1">Plant</span>
            <span className="text-sm font-medium text-gray-900">{project.plant}</span>
          </div>

          {project.subdivision && project.plant === 'Compressor Station (CS)' && (
            <div className="p-2 bg-gray-50 rounded-md">
              <span className="text-xs text-gray-600 block mb-1">Subdivision</span>
              <span className="text-sm font-medium text-gray-900">{project.subdivision}</span>
            </div>
          )}

          {project.milestone && (
            <div className="p-2 bg-green-50 rounded-md">
              <span className="text-xs text-gray-600 block mb-1">{currentYear} Project Milestone</span>
              <span className="text-sm font-medium text-gray-900">{project.milestone}</span>
            </div>
          )}
        </div>

        {/* Project Scope - Compact */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-900 mb-2">PSSR Scope Description</h5>
          <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-gray-700 leading-relaxed">{project.scope}</p>
          </div>
        </div>
        
        {/* Project Team - Compact Layout */}
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-gray-900">Project Team</h5>
          
          <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-md">
            {/* Project Hub Lead */}
            <div className="flex items-center gap-2">
              <ContextMenu>
                <ContextMenuTrigger>
                  <div className="relative cursor-pointer">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={project.hubLead.avatar} alt={project.hubLead.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                        {project.hubLead.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(project.hubLead.status)} rounded-full border-2 border-white`}></div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => onContextAction('chat', project.hubLead)}>
                    Chat with {project.hubLead.name}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onContextAction('email', project.hubLead)}>
                    Send {project.hubLead.name} an email
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onContextAction('copy', project.hubLead)}>
                    Copy {project.hubLead.name} email address
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              <div>
                <p className="font-medium text-gray-900 text-xs">{project.hubLead.name}</p>
                <p className="text-xs text-gray-600">Project Hub Lead</p>
              </div>
            </div>

            {/* Others */}
            {project.others.map((member, index) => (
              <div key={index} className="flex items-center gap-2">
                <ContextMenu>
                  <ContextMenuTrigger>
                    <div className="relative cursor-pointer">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-white`}></div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onContextAction('chat', member)}>
                      Chat with {member.name}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onContextAction('email', member)}>
                      Send {member.name} an email
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onContextAction('copy', member)}>
                      Copy {member.name} email address
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                <div>
                  <p className="font-medium text-gray-900 text-xs">{member.name}</p>
                  <p className="text-xs text-gray-600">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Project Widget */}
      <AddNewProjectWidget
        open={showEditProject}
        onClose={() => setShowEditProject(false)}
        onSubmit={handleEditProject}
        editMode={true}
        existingProject={{
          projectId: project.id,
          projectTitle: project.name,
          plant: project.plant,
          csLocation: project.subdivision || '',
          projectScope: project.scope,
          projectMilestone: project.milestone || '',
          projectHubLead: project.hubLead,
          commissioningLead: project.others.find(m => m.role === 'Commissioning Lead') || { name: '', email: '' },
          constructionLead: project.others.find(m => m.role === 'Construction Lead') || { name: '', email: '' },
          additionalPersons: project.others.filter(m => !['Commissioning Lead', 'Construction Lead'].includes(m.role || '')).map(m => ({
            name: m.name,
            email: m.email,
            role: m.role || ''
          })),
          supportingDocs: [],
          scorecardProject: project.scorecardProject || 'No'
        }}
      />
    </>
  );
};

export default ProjectDetails;
