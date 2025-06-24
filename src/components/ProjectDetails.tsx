import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';

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
  hubLead: ProjectMember;
  others: ProjectMember[];
}

interface ProjectDetailsProps {
  project: Project;
  onContextAction: (action: string, person: ProjectMember) => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onContextAction }) => {
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

  return (
    <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500 block mb-1">Plant</span>
          <span className="text-lg font-semibold text-gray-900">{project.plant}</span>
        </div>
        {project.subdivision && project.plant === 'Compressor Station (CS)' && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500 block mb-1">Subdivision</span>
            <span className="text-lg font-semibold text-gray-900">{project.subdivision}</span>
          </div>
        )}
      </div>

      {/* Project Scope */}
      <div className="mb-6">
        <h5 className="font-medium text-gray-900 mb-3">Project Scope</h5>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-gray-700 leading-relaxed">{project.scope}</p>
        </div>
      </div>
      
      {/* Project Team - Single Row Layout */}
      <div className="space-y-4">
        <h5 className="font-medium text-gray-900">Project Team</h5>
        
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Project Hub Lead */}
          <div className="flex items-center gap-3">
            <ContextMenu>
              <ContextMenuTrigger>
                <div className="relative cursor-pointer">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={project.hubLead.avatar} alt={project.hubLead.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {project.hubLead.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(project.hubLead.status)} rounded-full border-2 border-white`}></div>
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
              <p className="font-medium text-gray-900 text-sm">{project.hubLead.name}</p>
              <p className="text-xs text-gray-600">Project Hub Lead</p>
            </div>
          </div>

          {/* Others */}
          {project.others.map((member, index) => (
            <div key={index} className="flex items-center gap-3">
              <ContextMenu>
                <ContextMenuTrigger>
                  <div className="relative cursor-pointer">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(member.status)} rounded-full border-2 border-white`}></div>
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
                <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                <p className="text-xs text-gray-600">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
