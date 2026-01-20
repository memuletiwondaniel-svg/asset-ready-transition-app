import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X, Sparkles, Wand2 } from 'lucide-react';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useAutoPopulateTeam } from '@/hooks/useAutoPopulateTeam';

interface ProjectTeamSectionProps {
  teamMembers: any[];
  setTeamMembers: React.Dispatch<React.SetStateAction<any[]>>;
  regionName?: string | null;
  hubName?: string | null;
  hubId?: string | null;
}

const REQUIRED_ROLES = [
  { role: 'Project Manager', required: true, function: 'Project Management' },
  { role: 'Project Hub Lead', required: true, function: 'Hub Operations' },
  { role: 'Project Engr', required: true, function: 'Engineering' },
  { role: 'Construction Lead', required: true, function: 'Construction' },
  { role: 'Commissioning Lead', required: true, function: 'Commissioning' },
  { role: 'ORA Engr.', required: true, function: 'Operations Readiness' }
];

export const ProjectTeamSection: React.FC<ProjectTeamSectionProps> = ({ 
  teamMembers, 
  setTeamMembers,
  regionName = null,
  hubName = null,
  hubId = null
}) => {
  const { data: allUsers = [], isLoading } = useProfileUsers();
  const { suggestedTeam, isLoading: isAutoPopulating } = useAutoPopulateTeam(regionName, hubName, hubId);
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);

  // Auto-populate when hub changes and team is empty
  useEffect(() => {
    if (hubId && suggestedTeam.length > 0 && !hasAutoPopulated && teamMembers.length === 0) {
      // Process suggested team: first member per role goes to required slot, others become additional
      const requiredRoleNames = REQUIRED_ROLES.map(r => r.role);
      const processedRoles = new Set<string>();
      const newTeamMembers: any[] = [];
      
      suggestedTeam.forEach(member => {
        if (requiredRoleNames.includes(member.role)) {
          if (!processedRoles.has(member.role)) {
            newTeamMembers.push(member);
            processedRoles.add(member.role);
          } else {
            newTeamMembers.push({
              ...member,
              id: `additional-${member.role}-${Date.now()}-${Math.random()}`,
              role: 'Additional Team Member'
            });
          }
        } else {
          newTeamMembers.push(member);
        }
      });
      
      setTeamMembers(newTeamMembers);
      setHasAutoPopulated(true);
    }
  }, [hubId, suggestedTeam, hasAutoPopulated, teamMembers.length, setTeamMembers]);

  // Reset auto-populate flag when hub changes
  useEffect(() => {
    setHasAutoPopulated(false);
  }, [hubId]);

  const handleAutoPopulate = () => {
    if (suggestedTeam.length > 0) {
      // Separate suggested team into required roles and additional (for roles allowing multiple)
      const requiredRoleNames = REQUIRED_ROLES.map(r => r.role);
      const processedRoles = new Set<string>();
      const newTeamMembers: any[] = [];
      
      // For each required role, take the first matching suggested member
      suggestedTeam.forEach(member => {
        if (requiredRoleNames.includes(member.role)) {
          if (!processedRoles.has(member.role)) {
            // First member for this required role
            newTeamMembers.push(member);
            processedRoles.add(member.role);
          } else {
            // Additional members for this role become "Additional Team Member"
            newTeamMembers.push({
              ...member,
              id: `additional-${member.role}-${Date.now()}-${Math.random()}`,
              role: 'Additional Team Member'
            });
          }
        } else {
          newTeamMembers.push(member);
        }
      });
      
      // Keep manually assigned members that don't conflict with suggested
      const manualMembers = teamMembers.filter(m => !m.is_auto_populated);
      const suggestedRoles = [...processedRoles];
      const filteredManual = manualMembers.filter(m => !suggestedRoles.includes(m.role));
      
      setTeamMembers([...filteredManual, ...newTeamMembers]);
      setHasAutoPopulated(true);
    }
  };

  const updateRoleMember = (role: string, userId: string) => {
    const selectedUser = allUsers.find(user => user.user_id === userId);
    
    // Remove existing member with this role
    const updatedMembers = teamMembers.filter(member => member.role !== role);
    
    if (selectedUser) {
      // Add new member for this role (mark as manual, not auto-populated)
      const newMember = {
        id: `${role}-${Date.now()}`,
        role: role,
        user_id: userId,
        user_name: selectedUser.full_name,
        is_lead: ['Project Manager', 'Project Engr'].includes(role),
        avatar_url: selectedUser.avatar_url || '',
        position: selectedUser.position || '',
        function_role: selectedUser.role || '',
        is_auto_populated: false
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
      position: '',
      function_role: ''
    };
    setTeamMembers(prev => [...prev, newMember]);
  };

  const updateAdditionalMember = (memberId: string, field: string, value: any) => {
    if (field === 'user_id') {
      const selectedUser = allUsers.find(user => user.user_id === value);
      setTeamMembers(prev => prev.map(member => 
        member.id === memberId ? { 
          ...member, 
          user_id: value,
          user_name: selectedUser?.full_name || '',
          avatar_url: selectedUser?.avatar_url || '',
          position: selectedUser?.position || '',
          function_role: selectedUser?.role || ''
        } : member
      ));
    } else {
      setTeamMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, [field]: value } : member
      ));
    }
  };

  const removeAdditionalMember = (memberId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
  };

  const getRequiredRolesStatus = () => {
    return REQUIRED_ROLES.map(({ role, required, function: func }) => ({
      role,
      required,
      function: func,
      assigned: teamMembers.some(member => member.role === role)
    }));
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary" />
            Project Team
            <Badge variant="secondary" className="ml-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-medium bg-primary/10 text-primary">
              {teamMembers.length}
            </Badge>
          </CardTitle>
          {hubId && suggestedTeam.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoPopulate}
              disabled={isAutoPopulating}
              className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50 hover:border-amber-400 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
            >
              <Wand2 className="h-4 w-4" />
              Auto-populate Team
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Roles Status */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
          <h4 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2 mb-3">Required Team Roles</h4>
          <div className="flex flex-wrap gap-2">
            {getRequiredRolesStatus().map(({ role, required, assigned }) => (
              <Badge 
                key={role}
                variant={assigned ? "default" : "outline"}
                className={assigned 
                  ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" 
                  : required 
                    ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                    : "bg-muted text-muted-foreground border-border"
                }
              >
                {role} {assigned ? '✓' : required ? '○' : ''}
              </Badge>
            ))}
          </div>
        </div>

        {/* Required Roles Assignment */}
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/40">
          <h4 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">Assign Team Members</h4>
          {REQUIRED_ROLES.map(({ role, required, function: func }) => {
            const assignedMember = getRoleMember(role);
            const isAutoPopulated = assignedMember?.is_auto_populated;
            return (
              <div key={role} className={`p-4 border rounded-lg transition-colors ${
                isAutoPopulated ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-background border-border/60'
              }`}>
                {/* Role Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-muted/50">
                      {func}
                    </Badge>
                    <h5 className="font-medium text-foreground">{role}</h5>
                    {required && <span className="text-destructive text-xs">*</span>}
                    {isAutoPopulated && (
                      <span title="Auto-populated from hub" className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-xs">Auto</span>
                      </span>
                    )}
                  </div>
                  {assignedMember && (
                    <span className="text-xs text-muted-foreground">
                      {assignedMember.position || assignedMember.function_role || ''}
                    </span>
                  )}
                </div>
                
                {/* Person Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Assigned Person
                  </label>
                  <EnhancedCombobox
                    options={allUsers
                      .filter(user => {
                        const userRole = (user.role || '').toLowerCase().trim();
                        const userPos = (user.position || '').toLowerCase().trim();
                        
                        switch (role) {
                          case 'Project Manager':
                            return userRole.includes('proj manager') || 
                                   userRole.includes('project manager') ||
                                   userPos.includes('proj manager') ||
                                   userPos.includes('project manager');
                          case 'Project Engr':
                            return userRole.includes('proj eng') || 
                                   userRole.includes('project eng') ||
                                   userPos.includes('proj eng') ||
                                   userPos.includes('project eng');
                          case 'Commissioning Lead':
                            return userRole.includes('commissioning lead') ||
                                   userPos.includes('commissioning lead') ||
                                   userRole.includes('commissioning') ||
                                   userPos.includes('commissioning');
                          case 'Construction Lead':
                            return userRole.includes('construction lead') ||
                                   userPos.includes('construction lead') ||
                                   userRole.includes('construction') ||
                                   userPos.includes('construction');
                          case 'ORA Engr.':
                            return userRole.includes('ora') ||
                                   userPos.includes('ora');
                          case 'Project Hub Lead':
                            return userRole.includes('hub lead') ||
                                   userPos.includes('hub lead') ||
                                   userRole.includes('project hub') ||
                                   userPos.includes('project hub');
                          default:
                            return true;
                        }
                      })
                      .map(user => ({
                        value: user.user_id,
                        label: `${user.full_name}`,
                        description: user.role ? `${user.role}${user.position ? ` • ${user.position}` : ''}` : user.position || ''
                      }))
                    }
                    value={assignedMember?.user_id || ''}
                    onValueChange={(value) => updateRoleMember(role, value)}
                    placeholder={isLoading ? "Loading users..." : "Search and select person..."}
                    emptyText="No matching users found"
                    allowCreate={false}
                    disabled={isLoading}
                    className="w-full bg-background"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Team Members */}
        {teamMembers.filter(member => !REQUIRED_ROLES.some(r => r.role === member.role)).length > 0 && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/40">
            <h4 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">Additional Team Members</h4>
            <div className="space-y-3">
              {teamMembers
                .filter(member => !REQUIRED_ROLES.some(r => r.role === member.role))
                .map((member) => (
                  <div 
                    key={member.id}
                    className="p-4 border rounded-lg bg-background border-border/60"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="text-xs bg-muted/50">
                        Additional
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAdditionalMember(member.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Team Member
                      </label>
                      <EnhancedCombobox
                        options={allUsers.map(user => ({
                          value: user.user_id,
                          label: user.full_name,
                          description: user.role ? `${user.role}${user.position ? ` • ${user.position}` : ''}` : user.position || ''
                        }))}
                        value={member.user_id}
                        onValueChange={(value) => updateAdditionalMember(member.id, 'user_id', value)}
                        placeholder="Search and select person..."
                        emptyText="No users found"
                        allowCreate={false}
                        disabled={isLoading}
                        className="w-full bg-background"
                      />
                    </div>
                    {member.user_name && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {member.function_role || member.position || 'No role/position defined'}
                      </p>
                    )}
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
          className="w-full border-dashed border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Additional Team Member
        </Button>
      </CardContent>
    </Card>
  );
};
