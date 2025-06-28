
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { CoreTeamMemberInput } from './CoreTeamMemberInput';
import { AdditionalTeamMembersSection } from './AdditionalTeamMembersSection';

interface TeamMember {
  name: string;
  email: string;
}

interface AdditionalPerson {
  name: string;
  email: string;
  role: string;
}

interface TeamMembersSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

// Mock team member data with avatars and status
const getTeamMemberData = (name: string, email: string) => {
  if (!name) return null;
  
  const avatarSeed = name.charCodeAt(0) + email.charCodeAt(0);
  const statuses = ['active', 'pending', 'inactive'];
  const status = statuses[avatarSeed % 3];
  
  return {
    name,
    email,
    avatar: `https://images.unsplash.com/photo-${1581090464777 + (avatarSeed % 100)}-f3220bbe1b8b?w=100&h=100&fit=crop&crop=face`,
    status
  };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700 border-green-200';
    case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'inactive': return 'bg-gray-100 text-gray-700 border-gray-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <CheckCircle className="h-3 w-3" />;
    case 'pending': return <Clock className="h-3 w-3" />;
    case 'inactive': return <AlertTriangle className="h-3 w-3" />;
    default: return <AlertTriangle className="h-3 w-3" />;
  }
};

export const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({ 
  formData, 
  setFormData 
}) => {
  const addAdditionalPerson = () => {
    setFormData((prev: any) => ({
      ...prev,
      additionalPersons: [...(prev.additionalPersons || []), { name: '', email: '', role: '' }]
    }));
  };

  const updateAdditionalPerson = (index: number, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      additionalPersons: (prev.additionalPersons || []).map((person: AdditionalPerson, i: number) => 
        i === index ? { ...person, [field]: value } : person
      )
    }));
  };

  const removeAdditionalPerson = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      additionalPersons: (prev.additionalPersons || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const updateTeamMember = (role: keyof typeof formData, field: keyof TeamMember, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [field]: value }
    }));
  };

  const renderTeamMemberCard = (role: string, member: any) => {
    const memberData = getTeamMemberData(member?.name || '', member?.email || '');
    if (!memberData) return null;

    return (
      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
        <Avatar className="h-10 w-10 ring-2 ring-white shadow-md">
          <AvatarImage src={memberData.avatar} alt={memberData.name} />
          <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
            {memberData.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{memberData.name}</p>
          <p className="text-xs text-gray-500 truncate">{role}</p>
        </div>
        <Badge 
          variant="outline" 
          className={`flex items-center gap-1 text-xs ${getStatusColor(memberData.status)}`}
        >
          {getStatusIcon(memberData.status)}
          {memberData.status}
        </Badge>
      </div>
    );
  };

  return (
    <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-300 to-purple-400 text-white rounded-t-lg">
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          Team Members
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Core Team Members Input */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CoreTeamMemberInput
            role="Project Manager"
            name={formData.projectHubLead?.name || ""}
            email={formData.projectHubLead?.email || ""}
            onNameChange={(value) => updateTeamMember('projectHubLead', 'name', value)}
            onEmailChange={(value) => updateTeamMember('projectHubLead', 'email', value)}
            required
          />
          <CoreTeamMemberInput
            role="Commissioning Lead"
            name={formData.commissioningLead?.name || ""}
            email={formData.commissioningLead?.email || ""}
            onNameChange={(value) => updateTeamMember('commissioningLead', 'name', value)}
            onEmailChange={(value) => updateTeamMember('commissioningLead', 'email', value)}
            required
          />
          <CoreTeamMemberInput
            role="Construction Lead"
            name={formData.constructionLead?.name || ""}
            email={formData.constructionLead?.email || ""}
            onNameChange={(value) => updateTeamMember('constructionLead', 'name', value)}
            onEmailChange={(value) => updateTeamMember('constructionLead', 'email', value)}
            required
          />
        </div>

        {/* Project Team Members Display - Single Row */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            Project Team Overview
          </h4>
          <div className="flex flex-wrap gap-4">
            {formData.projectHubLead?.name && renderTeamMemberCard('Project Manager', formData.projectHubLead)}
            {formData.commissioningLead?.name && renderTeamMemberCard('Commissioning Lead', formData.commissioningLead)}
            {formData.constructionLead?.name && renderTeamMemberCard('Construction Lead', formData.constructionLead)}
          </div>
        </div>

        {/* Additional Team Members */}
        <AdditionalTeamMembersSection
          additionalPersons={formData.additionalPersons || []}
          onAdd={addAdditionalPerson}
          onUpdate={updateAdditionalPerson}
          onRemove={removeAdditionalPerson}
        />
      </CardContent>
    </Card>
  );
};
