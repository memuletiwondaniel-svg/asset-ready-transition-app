
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Users, Mail, Plus, X } from 'lucide-react';

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
      [role]: { ...(prev[role] as TeamMember), [field]: value }
    }));
  };

  return (
    <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-300 to-purple-400 text-white rounded-t-lg">
        <CardTitle className="text-2xl flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Users className="h-8 w-8" />
          </div>
          Team Members
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Core Team Members */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Hub Lead */}
          <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              Project Hub Lead *
            </Label>
            <Input
              placeholder="Full name"
              value={formData.projectHubLead.name}
              onChange={(e) => updateTeamMember('projectHubLead', 'name', e.target.value)}
              required
              className="h-9 border-gray-300 focus:border-purple-400"
            />
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Email address"
                value={formData.projectHubLead.email}
                onChange={(e) => updateTeamMember('projectHubLead', 'email', e.target.value)}
                required
                className="h-9 pl-10 border-gray-300 focus:border-purple-400"
              />
            </div>
          </div>

          {/* Commissioning Lead */}
          <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              Commissioning Lead *
            </Label>
            <Input
              placeholder="Full name"
              value={formData.commissioningLead.name}
              onChange={(e) => updateTeamMember('commissioningLead', 'name', e.target.value)}
              required
              className="h-9 border-gray-300 focus:border-purple-400"
            />
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Email address"
                value={formData.commissioningLead.email}
                onChange={(e) => updateTeamMember('commissioningLead', 'email', e.target.value)}
                required
                className="h-9 pl-10 border-gray-300 focus:border-purple-400"
              />
            </div>
          </div>

          {/* Construction Lead */}
          <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              Construction Lead *
            </Label>
            <Input
              placeholder="Full name"
              value={formData.constructionLead.name}
              onChange={(e) => updateTeamMember('constructionLead', 'name', e.target.value)}
              required
              className="h-9 border-gray-300 focus:border-purple-400"
            />
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Email address"
                value={formData.constructionLead.email}
                onChange={(e) => updateTeamMember('constructionLead', 'email', e.target.value)}
                required
                className="h-9 pl-10 border-gray-300 focus:border-purple-400"
              />
            </div>
          </div>
        </div>

        {/* Additional Team Members */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Additional Team Members
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAdditionalPerson}
              className="flex items-center gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              <Plus className="h-4 w-4" />
              Add Person
            </Button>
          </div>
          
          {formData.additionalPersons.length > 0 && (
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {formData.additionalPersons.map((person: AdditionalPerson, index: number) => (
                <div key={index} className="p-4 border border-purple-200 rounded-xl bg-purple-50/50">
                  <div className="grid grid-cols-4 gap-3">
                    <Input
                      placeholder="Full name"
                      value={person.name}
                      onChange={(e) => updateAdditionalPerson(index, 'name', e.target.value)}
                      className="h-9 border-gray-300 focus:border-purple-400"
                    />
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Email"
                        value={person.email}
                        onChange={(e) => updateAdditionalPerson(index, 'email', e.target.value)}
                        className="h-9 pl-10 border-gray-300 focus:border-purple-400"
                      />
                    </div>
                    <Input
                      placeholder="Role/Title"
                      value={person.role}
                      onChange={(e) => updateAdditionalPerson(index, 'role', e.target.value)}
                      className="h-9 border-gray-300 focus:border-purple-400"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdditionalPerson(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-9 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
