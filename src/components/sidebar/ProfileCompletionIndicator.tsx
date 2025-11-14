import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCompletionIndicatorProps {
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    position: string | null;
    email: string | null;
    company: string | null;
    phone_number: string | null;
  } | null;
  onOpenProfile: () => void;
  collapsed?: boolean;
}

export const ProfileCompletionIndicator: React.FC<ProfileCompletionIndicatorProps> = ({
  profile,
  onOpenProfile,
  collapsed = false
}) => {
  if (!profile) return null;

  const fields = [
    { key: 'full_name', label: 'Full Name', value: profile.full_name },
    { key: 'avatar_url', label: 'Profile Picture', value: profile.avatar_url },
    { key: 'position', label: 'Position', value: profile.position },
    { key: 'email', label: 'Email', value: profile.email },
    { key: 'company', label: 'Company', value: profile.company },
    { key: 'phone_number', label: 'Phone', value: profile.phone_number }
  ];

  const completedFields = fields.filter(f => f.value).length;
  const totalFields = fields.length;
  const completionPercentage = (completedFields / totalFields) * 100;
  const isComplete = completionPercentage === 100;

  // Auto-hide if profile is complete
  if (isComplete) return null;

  return (
    <Card className={cn(
      "border-border/40 bg-gradient-to-br transition-all duration-300 from-orange-500/10 to-amber-500/10 border-orange-500/20"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <h4 className="text-sm font-medium">Complete Your Profile</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {completedFields} of {totalFields} fields completed
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={completionPercentage} className="h-2" />
          
          <div className="space-y-1">
            {fields.filter(f => !f.value).slice(0, 2).map((field) => (
              <div key={field.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-orange-500" />
                <span>Add {field.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={onOpenProfile}
          size="sm"
          className="w-full h-8 text-xs"
          variant="outline"
        >
          Complete Profile
        </Button>
      </CardContent>
    </Card>
  );
};
