import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Wrench, Cpu, Zap, FlaskConical } from 'lucide-react';
import { usePSSRTieInScopes } from '@/hooks/usePSSRReasons';

interface ATIScopeSelectorProps {
  selectedScopeIds: string[];
  onScopeChange: (scopeIds: string[]) => void;
}

// Scope-specific icon and color configuration
const scopeConfig: Record<string, {
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  'MECH': {
    icon: Wrench,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
  },
  'PACO': {
    icon: Cpu,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
  },
  'ELECT': {
    icon: Zap,
    colorClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
  'PROCESS': {
    icon: FlaskConical,
    colorClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-900/20',
    borderClass: 'border-purple-200 dark:border-purple-800',
  },
};

const getScopeConfig = (code: string) => {
  return scopeConfig[code] || {
    icon: Wrench,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/20',
    borderClass: 'border-border',
  };
};

const ATIScopeSelector: React.FC<ATIScopeSelectorProps> = ({
  selectedScopeIds,
  onScopeChange,
}) => {
  const { data: scopes, isLoading } = usePSSRTieInScopes();

  const handleToggleScope = (scopeId: string) => {
    if (selectedScopeIds.includes(scopeId)) {
      onScopeChange(selectedScopeIds.filter(id => id !== scopeId));
    } else {
      onScopeChange([...selectedScopeIds, scopeId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!scopes || scopes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center bg-muted/20 rounded-lg">
        No ATI scopes configured
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-primary">
          {selectedScopeIds.length} of {scopes.length} scopes selected
        </span>
      </div>
      
      <div className="grid gap-3">
        {scopes.map((scope) => {
          const config = getScopeConfig(scope.code);
          const IconComponent = config.icon;
          const isSelected = selectedScopeIds.includes(scope.id);
          
          return (
            <div
              key={scope.id}
              onClick={() => handleToggleScope(scope.id)}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? `${config.borderClass} ${config.bgClass} shadow-sm`
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
              }`}
            >
              <Checkbox
                id={`scope-${scope.id}`}
                checked={isSelected}
                onCheckedChange={() => handleToggleScope(scope.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`scope-${scope.id}`} 
                  className="cursor-pointer flex items-center justify-between"
                >
                  <span className="font-semibold flex items-center gap-2">
                    <IconComponent className={`h-4 w-4 ${config.colorClass}`} />
                    {scope.code}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgClass} ${config.colorClass} font-medium`}>
                    {scope.code}
                  </span>
                </Label>
                {scope.description && (
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {scope.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ATIScopeSelector;
