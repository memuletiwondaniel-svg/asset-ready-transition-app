import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Box, CheckCircle2, AlertCircle, Clock, XCircle, 
  Key, Maximize2 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface P2APlanSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planStatus: string;
  onOpenWorkspace: () => void;
}

function usePlanSummaryData(planId: string) {
  const client = supabase as any;

  const { data: systems, isLoading: systemsLoading } = useQuery({
    queryKey: ['p2a-summary-systems', planId],
    queryFn: async () => {
      const { data } = await client
        .from('p2a_systems')
        .select('id, system_id, name')
        .eq('handover_plan_id', planId);
      return data || [];
    },
    enabled: !!planId,
  });

  const { data: vcrs, isLoading: vcrsLoading } = useQuery({
    queryKey: ['p2a-summary-vcrs', planId],
    queryFn: async () => {
      const { data } = await client
        .from('p2a_handover_points')
        .select('id, vcr_code, name, phase_id')
        .eq('handover_plan_id', planId);
      return data || [];
    },
    enabled: !!planId,
  });

  const { data: phases, isLoading: phasesLoading } = useQuery({
    queryKey: ['p2a-summary-phases', planId],
    queryFn: async () => {
      const { data } = await client
        .from('p2a_project_phases')
        .select('id, name, display_order')
        .eq('handover_plan_id', planId)
        .order('display_order');
      return data || [];
    },
    enabled: !!planId,
  });

  const { data: approvers, isLoading: approversLoading } = useQuery({
    queryKey: ['p2a-summary-approvers', planId],
    queryFn: async () => {
      const { data } = await client
        .from('p2a_handover_approvers')
        .select('id, role_name, user_id, display_order, status, approved_at, comments')
        .eq('handover_id', planId)
        .order('display_order');
      
      // Fetch profile data for assigned approvers
      const userIds = (data || []).filter((a: any) => a.user_id).map((a: any) => a.user_id);
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await client
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        (profiles || []).forEach((p: any) => {
          profileMap[p.user_id] = p;
        });
      }

      return (data || []).map((a: any) => ({
        ...a,
        user_name: profileMap[a.user_id]?.full_name || null,
        user_avatar: profileMap[a.user_id]?.avatar_url || null,
      }));
    },
    enabled: !!planId,
  });

  const { data: mappings } = useQuery({
    queryKey: ['p2a-summary-mappings', planId],
    queryFn: async () => {
      const vcrIds = vcrs?.map((v: any) => v.id) || [];
      if (vcrIds.length === 0) return {};
      const { data } = await client
        .from('p2a_handover_point_systems')
        .select('handover_point_id, system_id')
        .in('handover_point_id', vcrIds);
      const map: Record<string, string[]> = {};
      (data || []).forEach((m: any) => {
        if (!map[m.handover_point_id]) map[m.handover_point_id] = [];
        map[m.handover_point_id].push(m.system_id);
      });
      return map;
    },
    enabled: !!planId && (vcrs?.length ?? 0) > 0,
  });

  return {
    systems: systems || [],
    vcrs: vcrs || [],
    phases: phases || [],
    approvers: approvers || [],
    mappings: mappings || {},
    isLoading: systemsLoading || vcrsLoading || phasesLoading || approversLoading,
  };
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'In Review';
    case 'COMPLETED': return 'Approved';
    default: return 'Draft';
  }
};

const shortCode = (code?: string) => {
  if (!code) return '—';
  const parts = code.split('-');
  if (parts.length >= 2) return `VCR-${parts[parts.length - 1]}`;
  return code.length > 10 ? `VCR-${code.slice(-3)}` : code;
};

export const P2APlanSummaryDialog: React.FC<P2APlanSummaryDialogProps> = ({
  open,
  onOpenChange,
  planId,
  planStatus,
  onOpenWorkspace,
}) => {
  const { systems, vcrs, phases, approvers, mappings, isLoading } = usePlanSummaryData(planId);

  const assignedSystemsCount = new Set(Object.values(mappings).flat()).size;
  const assignedVCRsCount = vcrs.filter((v: any) => v.phase_id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 to-amber-500/40 rounded-lg blur-sm" />
              <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                <Key className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">P2A Handover Plan</DialogTitle>
            </div>
            <Badge variant="outline" className={cn("text-xs", statusBadgeClass(planStatus))}>
              {statusLabel(planStatus)}
            </Badge>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <Box className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[11px] font-medium">Systems</span>
                </div>
                <div className="text-lg font-bold">{systems.length}</div>
                <div className="text-[10px] text-muted-foreground">{assignedSystemsCount} mapped</div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <Box className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-medium">VCRs</span>
                </div>
                <div className="text-lg font-bold">{vcrs.length}</div>
                <div className="text-[10px] text-muted-foreground">{assignedVCRsCount} in phases</div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <Box className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] font-medium">Phases</span>
                </div>
                <div className="text-lg font-bold">{phases.length}</div>
                <div className="text-[10px] text-muted-foreground">configured</div>
              </div>
            </div>

            {/* VCR Table */}
            {vcrs.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  VCRs
                </div>
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1.5 text-xs items-center">
                  {vcrs.map((vcr: any) => {
                    const systemCount = (mappings[vcr.id] || []).length;
                    const phase = phases.find((p: any) => p.id === vcr.phase_id);
                    return (
                      <React.Fragment key={vcr.id}>
                        <span className="font-mono text-muted-foreground">{shortCode(vcr.vcr_code)}</span>
                        <span className="truncate">{vcr.name}</span>
                        <span className="text-muted-foreground">{systemCount} sys</span>
                        {phase ? (
                          <Badge variant="secondary" className="text-[10px]">{phase.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Approvers */}
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Approvers
              </div>
              {approvers.length > 0 ? (
                <div className="space-y-1.5">
                  {approvers.map((approver: any) => {
                    const avatarUrl = approver.user_avatar
                      ? (approver.user_avatar.startsWith('http')
                          ? approver.user_avatar
                          : supabase.storage.from('user-avatars').getPublicUrl(approver.user_avatar).data.publicUrl)
                      : undefined;
                    const initials = approver.user_name
                      ? approver.user_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      : '?';
                    const hasUser = !!approver.user_id;
                    return (
                      <div key={approver.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-card">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={avatarUrl} />
                          <AvatarFallback className="text-[9px] bg-muted">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          {hasUser ? (
                            <>
                              <span className="text-xs font-medium">{approver.user_name}</span>
                              <p className="text-[10px] text-muted-foreground truncate">{approver.role_name}</p>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-medium text-muted-foreground">{approver.role_name}</span>
                              <p className="text-[10px] text-amber-600">Not assigned</p>
                            </>
                          )}
                        </div>
                        {!hasUser ? (
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : approver.status === 'APPROVED' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : approver.status === 'REJECTED' ? (
                          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">No approvers configured yet.</p>
              )}
            </div>

            {/* Open Workspace Button */}
            <Button
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={() => {
                onOpenChange(false);
                onOpenWorkspace();
              }}
            >
              <Maximize2 className="h-4 w-4" />
              Open Full Workspace
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
