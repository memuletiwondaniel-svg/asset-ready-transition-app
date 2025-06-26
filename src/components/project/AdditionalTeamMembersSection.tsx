
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Users, Plus } from 'lucide-react';
import { AdditionalPersonInput } from './AdditionalPersonInput';

interface AdditionalPerson {
  name: string;
  email: string;
  role: string;
}

interface AdditionalTeamMembersSectionProps {
  additionalPersons: AdditionalPerson[];
  onAdd: () => void;
  onUpdate: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}

export const AdditionalTeamMembersSection: React.FC<AdditionalTeamMembersSectionProps> = ({
  additionalPersons,
  onAdd,
  onUpdate,
  onRemove
}) => {
  return (
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
          onClick={onAdd}
          className="flex items-center gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
        >
          <Plus className="h-4 w-4" />
          Add Person
        </Button>
      </div>
      
      {additionalPersons.length > 0 && (
        <div className="space-y-3 max-h-40 overflow-y-auto">
          {additionalPersons.map((person, index) => (
            <AdditionalPersonInput
              key={index}
              person={person}
              index={index}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
};
