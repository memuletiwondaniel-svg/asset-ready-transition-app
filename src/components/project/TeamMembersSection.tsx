
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
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

export const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({ 
  formData, 
  setFormData 
}) => {
  const addAdditionalPerson = () => {
    setFormData((prev: any) => ({
      ...prev,
      additionalPersons: [...prev.additionalPersons, { name: '', email: '', role: '' }]
    }));
  };

  const updateAdditionalPerson = (index: number, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      additionalPersons: prev.additionalPersons.map((person: AdditionalPerson, i: number) => 
        i === index ? { ...person, [field]: value } : person
      )
    }));
  };

  const removeAdditionalPerson = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      additionalPersons: prev.additionalPersons.filter((_: any, i: number) => i !== index)
    }));
  };

  const updateTeamMember = (role: keyof typeof formData, field: keyof TeamMember, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [field]: value }
    }));
  };

  return (
    <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-300 to-purple-400 text-white rounded-t-lg" style={{ minHeight: '60px' }}>
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          Team Members
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Core Team Members */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CoreTeamMemberInput
            role="Project Hub Lead"
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
