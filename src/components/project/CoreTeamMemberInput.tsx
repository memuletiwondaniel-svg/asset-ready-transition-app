
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail } from 'lucide-react';

interface CoreTeamMemberInputProps {
  role: string;
  name: string;
  email: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  required?: boolean;
}

export const CoreTeamMemberInput: React.FC<CoreTeamMemberInputProps> = ({
  role,
  name,
  email,
  onNameChange,
  onEmailChange,
  required = false
}) => {
  return (
    <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <User className="h-4 w-4 text-purple-500" />
        {role} {required && '*'}
      </Label>
      <Input
        placeholder="Full name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        required={required}
        className="h-9 border-gray-300 focus:border-purple-400"
      />
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required={required}
          className="h-9 pl-10 border-gray-300 focus:border-purple-400"
        />
      </div>
    </div>
  );
};
