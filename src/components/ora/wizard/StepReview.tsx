import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardActivity, PROJECT_PHASES, PROJECT_TYPES } from './types';
import { WizardApprover, sortApprovers } from './StepApprovers';
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
  const [showActivities, setShowActivities] = useState(false);

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
        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-primary/50",
            showActivities && "border-primary bg-primary/5"
          )}
          onClick={() => setShowActivities(v => !v)}
        >
          <CardContent className="pt-3 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Activities</p>
              <p className="font-semibold mt-0.5 text-sm">{selectedActivities.length}</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showActivities && "rotate-180")} />
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Approval Chain</h4>
          <Badge variant="outline" className="text-[10px]">{approvers.length} {approvers.length === 1 ? 'approver' : 'approvers'}</Badge>
        </div>
        <div className="space-y-2">
          {sortApprovers(approvers).map((approver, idx) => (
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
                <p className="text-sm font-semibold truncate">{approver.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{approver.position || approver.role_label}</p>
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

      {showActivities && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Activities</h4>
            <Badge variant="outline" className="text-[10px]">{selectedActivities.length} selected</Badge>
          </div>
          <ScrollArea className="h-[260px] rounded-lg border">
            <div className="space-y-1.5 p-2">
              {selectedActivities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card"
                >
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground tabular-nums w-12 shrink-0">
                    {a.activityCode}
                  </span>
                  <span className="text-sm flex-1 min-w-0 truncate">{a.activity}</span>
                </div>
              ))}
              {selectedActivities.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                  No activities selected.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
