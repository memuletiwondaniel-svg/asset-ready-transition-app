
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Building2, 
  Users, 
  Award, 
  MoreVertical, 
  MessageCircle, 
  Mail, 
  Copy, 
  Edit,
  Calendar
} from 'lucide-react';
import AddNewProjectWidget from './AddNewProjectWidget';

interface Project {
  id: string;
  name: string;
  plant: string;
  subdivision?: string;
  scope: string;
  milestone?: string;
  scorecardProject?: string;
  hubLead: any;
  others: any[];
}

interface ProjectDetailsProps {
  project: Project;
  onContextAction: (action: string, person: any) => void;
  onProjectUpdate?: (project: Project) => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ 
  project, 
  onContextAction, 
  onProjectUpdate 
}) => {
  const [showEditWidget, setShowEditWidget] = useState(false);

  const handleEditProject = (updatedProjectData: any) => {
    const updatedProject: Project = {
      id: updatedProjectData.projectId, // Store just the number without DP prefix
      name: updatedProjectData.projectTitle,
      plant: updatedProjectData.plant,
      subdivision: updatedProjectData.csLocation,
      scope: updatedProjectData.projectScope,
      milestone: updatedProjectData.projectMilestone,
      scorecardProject: updatedProjectData.scorecardProject,
      hubLead: {
        ...updatedProjectData.projectHubLead,
        role: 'Project Hub Lead'
      },
      others: [
        ...(updatedProjectData.commissioningLead?.name ? [{
          ...updatedProjectData.commissioningLead,
          role: 'Commissioning Lead'
        }] : []),
        ...(updatedProjectData.constructionLead?.name ? [{
          ...updatedProjectData.constructionLead,
          role: 'Construction Lead'
        }] : []),
        ...updatedProjectData.additionalPersons
      ]
    };

    onProjectUpdate?.(updatedProject);
    setShowEditWidget(false);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Format project ID for display only - add DP prefix only when displaying
  const formatProjectId = (id: string) => {
    // If ID already has DP, don't add it again
    return id.startsWith('DP') ? id : `DP ${id}`;
  };

  return (
    <>
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-3">
                  {formatProjectId(project.id)} - {project.name}
                  {project.scorecardProject === 'Yes' && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-0 shadow-sm">
                      <Award className="h-3 w-3 mr-1" />
                      Scorecard
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {project.plant}
                    {project.subdivision && ` - ${project.subdivision}`}
                  </span>
                  {project.milestone && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {project.milestone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditWidget(true)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Project Scope</h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
              {project.scope}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Team Members
            </h4>
            <div className="space-y-3">
              {/* Project Hub Lead */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={project.hubLead.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                        {project.hubLead.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(project.hubLead.status)} rounded-full border-2 border-white`}></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{project.hubLead.name}</p>
                    <p className="text-sm text-blue-600 font-medium">Project Hub Lead</p>
                    <p className="text-xs text-gray-500">{project.hubLead.email}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white border shadow-lg">
                    <DropdownMenuItem onClick={() => onContextAction('chat', project.hubLead)} className="cursor-pointer">
                      <MessageCircle className="h-4 w-4 mr-2 text-blue-600" />
                      Start Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onContextAction('email', project.hubLead)} className="cursor-pointer">
                      <Mail className="h-4 w-4 mr-2 text-green-600" />
                      Send Email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onContextAction('copy', project.hubLead)} className="cursor-pointer">
                      <Copy className="h-4 w-4 mr-2 text-gray-600" />
                      Copy Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Other Team Members */}
              {project.others.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-gray-200 text-gray-700 font-medium text-sm">
                          {member.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-white`}></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                      <p className="text-xs text-gray-600">{member.role}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-200">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white border shadow-lg">
                      <DropdownMenuItem onClick={() => onContextAction('chat', member)} className="cursor-pointer">
                        <MessageCircle className="h-4 w-4 mr-2 text-blue-600" />
                        Start Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onContextAction('email', member)} className="cursor-pointer">
                        <Mail className="h-4 w-4 mr-2 text-green-600" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onContextAction('copy', member)} className="cursor-pointer">
                        <Copy className="h-4 w-4 mr-2 text-gray-600" />
                        Copy Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Project Widget */}
      <AddNewProjectWidget
        open={showEditWidget}
        onClose={() => setShowEditWidget(false)}
        onSubmit={handleEditProject}
        editMode={true}
        existingProject={{
          projectId: project.id, // Pass the raw ID without DP prefix
          projectTitle: project.name,
          plant: project.plant,
          csLocation: project.subdivision,
          projectScope: project.scope,
          projectMilestone: project.milestone,
          scorecardProject: project.scorecardProject,
          projectHubLead: project.hubLead,
          commissioningLead: project.others.find(m => m.role === 'Commissioning Lead'),
          constructionLead: project.others.find(m => m.role === 'Construction Lead'),
          additionalPersons: project.others.filter(m => !['Commissioning Lead', 'Construction Lead'].includes(m.role)),
          supportingDocs: []
        }}
      />
    </>
  );
};

export default ProjectDetails;
