
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical, User, Building2, FileText, Award } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Project {
  id: string;
  name: string;
  plant: string;
  subdivision?: string;
  scope: string;
  hubLead: any;
  others: any[];
  scorecardProject?: string;
}

interface ProjectDetailsProps {
  project: Project;
  onContextAction: (action: string, person: any) => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onContextAction }) => {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-lg">{project.name}</h3>
              {project.scorecardProject === 'Yes' && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  <Award className="h-3 w-3 mr-1" />
                  Score Card
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{project.plant}</span>
              </div>
              {project.subdivision && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span>{project.subdivision}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Project Scope</label>
            <p className="text-sm text-gray-700 mt-1">{project.scope}</p>
          </div>

          {project.hubLead && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hub Lead</label>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{project.hubLead.name}</span>
                  <span className="text-xs text-gray-500">({project.hubLead.email})</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onContextAction('email', project.hubLead)}>
                      Send Email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onContextAction('call', project.hubLead)}>
                      Call
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {project.others && project.others.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Other Team Members</label>
              <div className="space-y-1 mt-1">
                {project.others.map((person, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{person.name}</span>
                      <span className="text-xs text-gray-500">({person.email})</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onContextAction('email', person)}>
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onContextAction('call', person)}>
                          Call
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectDetails;
