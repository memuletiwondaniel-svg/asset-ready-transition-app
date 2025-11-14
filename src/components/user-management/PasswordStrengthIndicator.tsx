import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePassword, getPasswordStrength, type PasswordRequirement } from '@/utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showRequirements = true
}) => {
  const requirements = validatePassword(password);
  const strength = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password Strength:</span>
          {strength.label && (
            <span className={cn(
              "font-medium",
              strength.score === 1 && "text-destructive",
              strength.score === 2 && "text-orange-500",
              strength.score === 3 && "text-yellow-500",
              strength.score === 4 && "text-green-500"
            )}>
              {strength.label}
            </span>
          )}
        </div>
        
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-300",
                level <= strength.score ? strength.color : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
          {requirements.map((req, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors duration-200",
                req.met ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
              )}
            >
              {req.met ? (
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
