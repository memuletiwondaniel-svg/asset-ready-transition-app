import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X } from 'lucide-react';

interface ProjectTeamSectionProps {
  teamMembers: any[];
  setTeamMembers: React.Dispatch<React.SetStateAction<any[]>>;
}

const REQUIRED_ROLES = [
  'Project Manager',
  'Project Engineer',
  'Construction Lead',
  'Commissioning Lead',
  'ORA Lead'
];

export const ProjectTeamSection: React.FC<ProjectTeamSectionProps> = ({ 
  teamMembers, 
  setTeamMembers 
}) => {
  const [newMember, setNewMember] = useState({
    role: '',
    user_id: '',
    user_name: '',
    is_lead: false
  });

  const addTeamMember = () => {
    if (newMember.role && newMember.user_name) {
      const member = {
        id: Date.now().toString(),
        ...newMember,
        is_lead: REQUIRED_ROLES.includes(newMember.role)
      };
      setTeamMembers(prev => [...prev, member]);
      setNewMember({ role: '', user_id: '', user_name: '', is_lead: false });
    }
  };

  const removeMember = (id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  const getRequiredRolesStatus = () => {
    const assignedRoles = teamMembers.map(member => member.role);
    return REQUIRED_ROLES.map(role => ({
      role,
      assigned: assignedRoles.includes(role)
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Users className="h-5 w-5 mr-2" />
          Project Team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Required Roles Status */}
        <div className="bg-blue-50/50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3">Required Roles</h4>
          <div className="flex flex-wrap gap-2">
            {getRequiredRolesStatus().map(({ role, assigned }) => (
              <Badge 
                key={role}
                variant={assigned ? "default" : "outline"}
                className={assigned 
                  ? "bg-green-100 text-green-700 border-green-200" 
                  : "bg-red-100 text-red-700 border-red-200"
                }
              >
                {role} {assigned ? '✓' : '○'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Add Team Member */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select 
            value={newMember.role} 
            onValueChange={(value) => setNewMember(prev => ({ ...prev, role: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {REQUIRED_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={newMember.user_name} 
            onValueChange={(value) => setNewMember(prev => ({ ...prev, user_name: value, user_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="John Doe">John Doe</SelectItem>
              <SelectItem value="Jane Smith">Jane Smith</SelectItem>
              <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
              <SelectItem value="Add New User">+ Add New User</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            type="button"
            onClick={addTeamMember}
            disabled={!newMember.role || !newMember.user_name}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>

        {/* Team Members List */}
        {teamMembers.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Assigned Team Members</h4>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={member.is_lead ? "default" : "outline"}
                      className={member.is_lead 
                        ? "bg-blue-100 text-blue-700 border-blue-200" 
                        : "bg-gray-100 text-gray-700 border-gray-200"
                      }
                    >
                      {member.role}
                    </Badge>
                    <span className="font-medium text-gray-900">{member.user_name}</span>
                    {member.is_lead && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                        Lead
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(member.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};