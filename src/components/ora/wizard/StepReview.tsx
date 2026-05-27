import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardActivity, PROJECT_PHASES, PROJECT_TYPES } from './types';
import { WizardApprover } from './StepApprovers';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  phase: string;
  projectType: string;
  activities: WizardActivity[];
  approvers: WizardApprover[];
}

const getFullAvatarUrl = (avatarUrl: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export const StepReview: React.FC<Props> = ({ phase, projectType, activities, approvers }) => {
  const selectedActivities = activities.filter(a => a.selected);
  const phaseLabel = PROJECT_PHASES.find(p => p.value === phase)?.label || phase;
  const typeInfo = PROJECT_TYPES.find(t => t.value === projectType);

  return (
    <div className="space-y-4 p-1">
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold">Review &amp; Submit</h3>
        <p className="text-xs text-muted-foreground">
          Confirm the details below before submitting your ORA Plan.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Project Phase</p>
            <p className="font-semibold mt-0.5 text-sm">{phaseLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Project Type</p>
            <p className="font-semibold mt-0.5 text-sm">{typeInfo?.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Activities</p>
            <p className="font-semibold mt-0.5 text-sm">{selectedActivities.length}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Approval Chain</h4>
          <Badge variant="outline" className="text-[10px]">{approvers.length} {approvers.length === 1 ? 'approver' : 'approvers'}</Badge>
        </div>
        <div className="space-y-2">
          {approvers.map((approver, idx) => (
            <div
              key={approver.user_id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card"
            >
              <span className="text-xs font-mono text-muted-foreground w-5 text-center">{idx + 1}</span>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={getFullAvatarUrl(approver.avatar_url)} alt={approver.full_name} />
                <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                  {getInitials(approver.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold truncate">{approver.full_name}</p>
                  <span className="text-[10px] text-primary font-medium shrink-0">{approver.role_label}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{approver.position || 'No position'}</p>
              </div>
            </div>
          ))}
          {approvers.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
              No approvers selected. Go back to Step 5 to add approvers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
