import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, Wrench, Building2, Shield, Users } from 'lucide-react';
import { useCategorizedRoles } from '@/hooks/useCategorizedRoles';

interface GroupedRoleSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  includeOther?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Project': <Briefcase className="h-4 w-4 inline mr-2" />,
  'Engineering': <Wrench className="h-4 w-4 inline mr-2" />,
  'Operations': <Building2 className="h-4 w-4 inline mr-2" />,
  'Safety': <Shield className="h-4 w-4 inline mr-2" />,
};

export const GroupedRoleSelector: React.FC<GroupedRoleSelectorProps> = ({
  value,
  onValueChange,
  placeholder = "Select a role",
  className = "",
  error = false,
  includeOther = true,
}) => {
  const { data: groupedRoles, isLoading } = useCategorizedRoles();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`${error ? 'border-red-500' : ''} ${className}`}>
        <SelectValue placeholder={isLoading ? "Loading roles..." : placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-popover border shadow-lg z-50 max-h-[300px]">
        {groupedRoles?.map((group) => (
          <SelectGroup key={group.category.id}>
            <SelectLabel className="flex items-center px-2 py-2 text-sm font-semibold text-muted-foreground bg-muted/50">
              {categoryIcons[group.category.name] || <Users className="h-4 w-4 inline mr-2" />}
              {group.category.name}
            </SelectLabel>
            {group.roles.filter((role) => role.name).map((role) => (
              <SelectItem key={role.id} value={role.name} className="pl-6">
                {role.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {includeOther && (
          <SelectGroup>
            <SelectLabel className="flex items-center px-2 py-2 text-sm font-semibold text-muted-foreground bg-muted/50">
              <Users className="h-4 w-4 inline mr-2" />
              Other
            </SelectLabel>
            <SelectItem value="Others (specify)" className="pl-6">
              Others (specify)
            </SelectItem>
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
};

export default GroupedRoleSelector;
