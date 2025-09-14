import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X } from 'lucide-react';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    is_lead: false,
    avatar_url: '',
    position: ''
  });

  const { data: allUsers = [], isLoading } = useProfileUsers();

  const addTeamMember = () => {
    if (newMember.role && newMember.user_name) {
      const member = {
        id: Date.now().toString(),
        ...newMember,
        is_lead: REQUIRED_ROLES.includes(newMember.role)
      };
      setTeamMembers(prev => [...prev, member]);
      setNewMember({ role: '', user_id: '', user_name: '', is_lead: false, avatar_url: '', position: '' });
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

          <EnhancedCombobox
            options={
              newMember.role 
                ? allUsers
                    .filter(user => {
                      // Filter users based on role matching
                      if (newMember.role === 'Other') return true;
                      return user.position?.toLowerCase().includes(newMember.role.toLowerCase()) || 
                             user.full_name.toLowerCase().includes(newMember.role.toLowerCase());
                    })
                    .map(user => ({
                      value: user.user_id,
                      label: `${user.full_name} ${user.position ? `(${user.position})` : ''}`
                    }))
                : []
            }
            value={newMember.user_id}
            onValueChange={(value) => {
              const selectedUser = allUsers.find(user => user.user_id === value);
              setNewMember(prev => ({ 
                ...prev, 
                user_id: value, 
                user_name: selectedUser?.full_name || value,
                avatar_url: selectedUser?.avatar_url || '',
                position: selectedUser?.position || ''
              }));
            }}
            placeholder={
              !newMember.role 
                ? "Select role first" 
                : isLoading 
                  ? "Loading users..." 
                  : "Search and select team member"
            }
            emptyText={!newMember.role ? "Select role first" : "No matching users found"}
            allowCreate={false}
            disabled={isLoading || !newMember.role}
            className="w-full"
          />

          <Button 
            type="button"
            onClick={addTeamMember}
            disabled={!newMember.role || !newMember.user_id || isLoading}
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
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url} alt={member.user_name} />
                      <AvatarFallback className="text-xs">
                        {member.user_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{member.user_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={member.is_lead ? "default" : "outline"}
                          className={member.is_lead 
                            ? "bg-blue-100 text-blue-700 border-blue-200 text-xs" 
                            : "bg-gray-100 text-gray-700 border-gray-200 text-xs"
                          }
                        >
                          {member.role}
                        </Badge>
                        {member.position && (
                          <span className="text-xs text-muted-foreground">{member.position}</span>
                        )}
                        {member.is_lead && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                            Lead
                          </Badge>
                        )}
                      </div>
                    </div>
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