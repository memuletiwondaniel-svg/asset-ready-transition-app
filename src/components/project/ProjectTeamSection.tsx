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
  { role: 'Project Manager', required: true },
  { role: 'Project Engineer', required: true },
  { role: 'Safety Lead', required: true },
  { role: 'Quality Lead', required: true }
];

export const ProjectTeamSection: React.FC<ProjectTeamSectionProps> = ({ 
  teamMembers, 
  setTeamMembers 
}) => {
  const { data: allUsers = [], isLoading } = useProfileUsers();

  const updateRoleMember = (role: string, userId: string) => {
    const selectedUser = allUsers.find(user => user.user_id === userId);
    
    // Remove existing member with this role
    const updatedMembers = teamMembers.filter(member => member.role !== role);
    
    if (selectedUser) {
      // Add new member for this role
      const newMember = {
        id: `${role}-${Date.now()}`,
        role: role,
        user_id: userId,
        user_name: selectedUser.full_name,
        is_lead: ['Project Manager', 'Project Engineer'].includes(role),
        avatar_url: selectedUser.avatar_url || '',
        position: selectedUser.position || ''
      };
      setTeamMembers([...updatedMembers, newMember]);
    } else {
      setTeamMembers(updatedMembers);
    }
  };

  const getRoleMember = (role: string) => {
    return teamMembers.find(member => member.role === role);
  };

  const addAdditionalMember = () => {
    const newMember = {
      id: `additional-${Date.now()}`,
      role: 'Additional Team Member',
      user_id: '',
      user_name: '',
      is_lead: false,
      avatar_url: '',
      position: ''
    };
    setTeamMembers(prev => [...prev, newMember]);
  };

  const updateAdditionalMember = (memberId: string, field: string, value: any) => {
    setTeamMembers(prev => prev.map(member => 
      member.id === memberId ? { ...member, [field]: value } : member
    ));
  };

  const removeAdditionalMember = (memberId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
  };

  const getRequiredRolesStatus = () => {
    return REQUIRED_ROLES.map(({ role, required }) => ({
      role,
      required,
      assigned: teamMembers.some(member => member.role === role)
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
      <CardContent className="space-y-6">
        {/* Required Roles Status */}
        <div className="bg-blue-50/50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3">Required Team Roles</h4>
          <div className="flex flex-wrap gap-2">
            {getRequiredRolesStatus().map(({ role, required, assigned }) => (
              <Badge 
                key={role}
                variant={assigned ? "default" : "outline"}
                className={assigned 
                  ? "bg-green-100 text-green-700 border-green-200" 
                  : required 
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }
              >
                {role} {assigned ? '✓' : required ? '○' : ''}
              </Badge>
            ))}
          </div>
        </div>

        {/* Required Roles Assignment */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Assign Team Members</h4>
          {REQUIRED_ROLES.map(({ role, required }) => {
            const assignedMember = getRoleMember(role);
            return (
              <div key={role} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{role}</h5>
                    {required && (
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-xs mt-1">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <EnhancedCombobox
                    options={allUsers.map(user => ({
                      value: user.user_id,
                      label: `${user.full_name} ${user.position ? `(${user.position})` : ''}`
                    }))}
                    value={assignedMember?.user_id || ''}
                    onValueChange={(value) => updateRoleMember(role, value)}
                    placeholder={isLoading ? "Loading users..." : "Search and select team member"}
                    emptyText="No users found"
                    allowCreate={false}
                    disabled={isLoading}
                    className="w-full"
                  />
                  
                  {assignedMember && (
                    <div className="flex items-center gap-3 pt-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={assignedMember.avatar_url} alt={assignedMember.user_name} />
                        <AvatarFallback className="text-xs">
                          {assignedMember.user_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          {assignedMember.user_name}
                        </Badge>
                        {assignedMember.position && (
                          <Badge variant="outline" className="bg-gray-100/80 text-gray-700 border-gray-200/60 text-xs">
                            {assignedMember.position}
                          </Badge>
                        )}
                        {assignedMember.is_lead && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                            Lead
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Team Members */}
        {teamMembers.filter(member => !REQUIRED_ROLES.some(r => r.role === member.role)).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Additional Team Members</h4>
            <div className="space-y-2">
              {teamMembers
                .filter(member => !REQUIRED_ROLES.some(r => r.role === member.role))
                .map((member) => (
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
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
                            {member.role}
                          </Badge>
                          {member.position && (
                            <span className="text-xs text-muted-foreground">{member.position}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdditionalMember(member.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Add Additional Member Button */}
        <Button
          type="button"
          variant="outline"
          onClick={addAdditionalMember}
          className="w-full border-dashed border-2 hover:border-blue-300 hover:bg-blue-50/50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Additional Team Member
        </Button>
      </CardContent>
    </Card>
  );
};