
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, X } from 'lucide-react';

interface AdditionalPerson {
  name: string;
  email: string;
  role: string;
}

interface AdditionalPersonInputProps {
  person: AdditionalPerson;
  index: number;
  onUpdate: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}

export const AdditionalPersonInput: React.FC<AdditionalPersonInputProps> = ({
  person,
  index,
  onUpdate,
  onRemove
}) => {
  return (
    <div className="p-4 border border-purple-200 rounded-xl bg-purple-50/50">
      <div className="grid grid-cols-4 gap-3">
        <Input
          placeholder="Full name"
          value={person.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          className="h-9 border-gray-300 focus:border-purple-400"
        />
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="email"
            placeholder="Email"
            value={person.email}
            onChange={(e) => onUpdate(index, 'email', e.target.value)}
            className="h-9 pl-10 border-gray-300 focus:border-purple-400"
          />
        </div>
        <Input
          placeholder="Role/Title"
          value={person.role}
          onChange={(e) => onUpdate(index, 'role', e.target.value)}
          className="h-9 border-gray-300 focus:border-purple-400"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-9 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
