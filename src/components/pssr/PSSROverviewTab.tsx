import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  MapPin,
  Calendar,
  User,
  FileText,
  ChevronDown,
  ChevronRight,
  Wrench,
  Shield,
  Users,
  Settings,
  Leaf,
  ClipboardCheck,
  FileCheck,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Target,
  Settings2,
  Layers,
} from 'lucide-react';
import { usePSSRDetails } from '@/hooks/usePSSRDetails';
import { usePSSRCategoryProgress } from '@/hooks/usePSSRCategoryProgress';
import { usePSSRApprovers } from '@/hooks/usePSSRApprovers';
import { usePSSRPriorityActions } from '@/hooks/usePSSRPriorityActions';
import { usePSSRKeyActivities, PSSRKeyActivity } from '@/hooks/usePSSRKeyActivities';
import { ScheduleActivitySheet } from './ScheduleActivitySheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

interface PSSROverviewTabProps {
  pssrId: string;
  pssrDisplayId: string;
}

// ─── Helpers ────────────────────────────────────────────────

const getCategoryIcon = (name: string) => {
  const map: Record<string, React.ElementType> = {
    'Design Integrity': Target,
    'Technical Integrity': Settings2,
    'Operating Integrity': Layers,
    'Management Systems': Users,
    'Health & Safety': Shield,
    // Legacy / fallback names
    'Process Safety': Shield,
    'Organization': Users,
    'HSE & Environment': Leaf,
    'Maintenance Readiness': ClipboardCheck,
    'Documentation': FileCheck,
    'Electrical': Zap,
  };
  return map[name] || ClipboardCheck;
};

const getCategoryColor = (name: string) => {
  const map: Record<string, { bg: string; bar: string }> = {
    'Design Integrity': { bg: 'bg-violet-400/10 text-violet-500', bar: 'bg-violet-400/70' },
    'Technical Integrity': { bg: 'bg-blue-400/10 text-blue-500', bar: 'bg-blue-400/70' },
    'Operating Integrity': { bg: 'bg-cyan-400/10 text-cyan-500', bar: 'bg-cyan-400/70' },
    'Management Systems': { bg: 'bg-amber-400/10 text-amber-500', bar: 'bg-amber-400/70' },
    'Health & Safety': { bg: 'bg-emerald-400/10 text-emerald-500', bar: 'bg-emerald-400/70' },
    // Legacy / fallback names
    'Process Safety': { bg: 'bg-red-400/10 text-red-500', bar: 'bg-red-400/70' },
    'Organization': { bg: 'bg-purple-400/10 text-purple-500', bar: 'bg-purple-400/70' },
    'Operations': { bg: 'bg-amber-400/10 text-amber-500', bar: 'bg-amber-400/70' },
    'HSE & Environment': { bg: 'bg-green-400/10 text-green-500', bar: 'bg-green-400/70' },
    'Maintenance Readiness': { bg: 'bg-indigo-400/10 text-indigo-500', bar: 'bg-indigo-400/70' },
    'Documentation': { bg: 'bg-teal-400/10 text-teal-500', bar: 'bg-teal-400/70' },
    'Electrical': { bg: 'bg-yellow-400/10 text-yellow-500', bar: 'bg-yellow-400/70' },
  };
  return map[name] || { bg: 'bg-muted text-muted-foreground', bar: 'bg-primary' };
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ─── Component ──────────────────────────────────────────────

export const PSSROverviewTab: React.FC<PSSROverviewTabProps> = ({ pssrId, pssrDisplayId }) => {
  const { pssr, isLoading: detailsLoading } = usePSSRDetails(pssrId);
  const { data: categoryProgress, isLoading: catLoading } = usePSSRCategoryProgress(pssrId);
  const { approvers: pssrApprovers, isLoading: approversLoading } = usePSSRApprovers(pssrId);
  const { actions, stats: actionStats } = usePSSRPriorityActions(pssrId);
  const { activities, scheduleActivity } = usePSSRKeyActivities(pssrId);
  const [selectedActivity, setSelectedActivity] = useState<PSSRKeyActivity | null>(null);

  // Fetch SoF approvers
  const { data: sofApprovers } = useQuery({
    queryKey: ['sof-approvers', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sof_approvers')
        .select('*')
        .eq('pssr_id', pssrId)
        .order('approver_level', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!pssrId,
  });

  // Fetch delivering/approving parties from item approvals
  const { data: itemApprovals } = useQuery({
    queryKey: ['pssr-item-approvals-summary', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_item_approvals')
        .select('approver_role, approver_user_id, status')
        .eq('pssr_id', pssrId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!pssrId,
  });

  // Fetch delivering parties from checklist items (responsible field) when item approvals are empty
  const { data: deliveringParties } = useQuery({
    queryKey: ['pssr-delivering-parties', pssrId],
    queryFn: async () => {
      // Get all checklist items for this PSSR's responses with their responsible roles
      const { data, error } = await supabase
        .from('pssr_checklist_responses')
        .select(`
          id,
          pssr_checklist_items!inner(
            responsible
          )
        `)
        .eq('pssr_id', pssrId);
      if (error) throw error;

      // Group by responsible role
      const roleMap: Record<string, number> = {};
      (data || []).forEach((resp: any) => {
        const role = resp.pssr_checklist_items?.responsible;
        if (role) {
          roleMap[role] = (roleMap[role] || 0) + 1;
        }
      });
      return roleMap;
    },
    enabled: !!pssrId,
  });

  // Fetch profiles for approvers
  const approverUserIds = useMemo(() => {
    const ids = new Set<string>();
    pssrApprovers?.forEach(a => { if (a.user_id) ids.add(a.user_id); });
    sofApprovers?.forEach((a: any) => { if (a.user_id) ids.add(a.user_id); });
    itemApprovals?.forEach(a => { if (a.approver_user_id) ids.add(a.approver_user_id); });
    return Array.from(ids);
  }, [pssrApprovers, sofApprovers, itemApprovals]);

  const { data: approverProfiles } = useQuery({
    queryKey: ['approver-profiles', approverUserIds],
    queryFn: async () => {
      if (approverUserIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, position')
        .in('user_id', approverUserIds);
      const map: Record<string, { full_name: string; avatar_url: string | null; position: string | null }> = {};
      data?.forEach(p => {
        let avatarUrl = p.avatar_url;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl);
          avatarUrl = publicUrl;
        }
        map[p.user_id] = { full_name: p.full_name || '', avatar_url: avatarUrl, position: p.position };
      });
      return map;
    },
    enabled: approverUserIds.length > 0,
  });

  // Fetch location names
  const { data: locationInfo } = useQuery({
    queryKey: ['pssr-location', pssr?.plant_id, pssr?.field_id, pssr?.station_id],
    queryFn: async () => {
      const result: { plant?: string; field?: string; station?: string } = {};
      if (pssr?.plant_id) {
        const { data } = await supabase.from('plant').select('name').eq('id', pssr.plant_id).single();
        if (data) result.plant = data.name;
      }
      if (pssr?.field_id) {
        const { data } = await supabase.from('field').select('name').eq('id', pssr.field_id).single();
        if (data) result.field = data.name;
      }
      if (pssr?.station_id) {
        const { data } = await supabase.from('station').select('name').eq('id', pssr.station_id).single();
        if (data) result.station = data.name;
      }
      return result;
    },
    enabled: !!pssr,
  });

  // Collapsible states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // User detail sheet state
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; role: string } | null>(null);

  // Fetch items for selected user
  const { data: userItems } = useQuery({
    queryKey: ['pssr-user-items', pssrId, selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const { data, error } = await supabase
        .from('pssr_item_approvals')
        .select(`
          id, status, approver_role,
          pssr_checklist_responses!inner(
            id, response,
            pssr_checklist_items!inner(unique_id, question, category)
          )
        `)
        .eq('pssr_id', pssrId)
        .eq('approver_user_id', selectedUser.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUser?.id && !!pssrId,
  });

  // Overall progress
  const overallProgress = useMemo(() => {
    if (!categoryProgress || categoryProgress.length === 0) return 0;
    const total = categoryProgress.reduce((s, c) => s + c.total, 0);
    const done = categoryProgress.reduce((s, c) => s + c.completed, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [categoryProgress]);

  const totalItems = categoryProgress?.reduce((s, c) => s + c.total, 0) || 0;
  const completedItems = categoryProgress?.reduce((s, c) => s + c.completed, 0) || 0;
  const pendingItems = totalItems - completedItems;

  // Group item approvals by role for delivering/approving parties
  const partiesByRole = useMemo(() => {
    if (!itemApprovals) return {};
    const grouped: Record<string, { total: number; completed: number; userIds: Set<string> }> = {};
    itemApprovals.forEach(a => {
      if (!grouped[a.approver_role]) grouped[a.approver_role] = { total: 0, completed: 0, userIds: new Set() };
      grouped[a.approver_role].total++;
      if (a.status === 'approved') grouped[a.approver_role].completed++;
      if (a.approver_user_id) grouped[a.approver_role].userIds.add(a.approver_user_id);
    });
    return grouped;
  }, [itemApprovals]);

  if (detailsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="bg-muted/40 border-b py-3"><div className="h-4 w-32 bg-muted rounded" /></CardHeader>
            <CardContent className="p-4"><div className="space-y-3">{[1, 2, 3].map(j => <div key={j} className="h-3 bg-muted rounded" />)}</div></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ─── Panel 1: PSSR Info ───────────────────────────────

  const renderInfoPanel = () => (
    <Card className="h-full flex flex-col">
      <CardHeader className="relative overflow-hidden border-b py-3 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-500/8 to-blue-400/5" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-300" />
        <CardTitle className="relative text-base font-semibold flex items-center justify-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* PSSR ID */}
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">PSSR ID</span>
              <p className="text-sm font-semibold text-primary mt-0.5">{pssrDisplayId}</p>
            </div>

            {/* Title */}
            {pssr?.title && (
              <div>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Title</span>
                <p className="text-sm font-medium mt-0.5">{pssr.title}</p>
              </div>
            )}

            {/* Reason */}
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Reason for PSSR</span>
              <p className="text-sm mt-0.5">{pssr?.reason || '-'}</p>
            </div>

            <Separator />

            {/* Detailed Scope */}
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Detailed Scope</span>
              {pssr?.scope ? (
                <div
                  className="text-sm mt-1 prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(pssr.scope) }}
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">No scope defined</p>
              )}
              {pssr?.scope_image_url && (
                <img
                  src={pssr.scope_image_url}
                  alt="Scope"
                  className="mt-2 rounded-lg max-h-48 object-cover w-full"
                />
              )}
            </div>

            <Separator />

            {/* PSSR Lead */}
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">PSSR Lead</span>
            </div>
            {pssr?.pssr_lead ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={pssr.pssr_lead.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(pssr.pssr_lead.full_name || '')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{pssr.pssr_lead.full_name}</p>
                  {pssr.pssr_lead.position && (
                    <p className="text-[10px] text-muted-foreground">{pssr.pssr_lead.position}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unassigned</p>
            )}

            <Separator />

            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Location</span>
            </div>
            <p className="text-sm">
              {[locationInfo?.plant, locationInfo?.field, locationInfo?.station].filter(Boolean).join(' > ') || pssr?.plant || '-'}
            </p>

            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Created</span>
            </div>
            <p className="text-sm">
              {pssr?.created_at ? format(new Date(pssr.created_at), 'dd-MMM-yyyy') : '-'}
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  // ─── Panel 2: Progress & Activities ───────────────────

  const renderProgressPanel = () => (
    <Card className="h-full flex flex-col">
      <CardHeader className="relative overflow-hidden border-b py-3 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/8 to-amber-400/5" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300" />
        <CardTitle className="relative text-base font-semibold flex items-center justify-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-5">
            {/* Circular progress */}
             <div className="flex items-center gap-5">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle
                    cx="56" cy="56" r="48" fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - overallProgress / 100)}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{overallProgress}%</span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Complete</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">{pendingItems} items to go</p>
                <p className="text-xs text-muted-foreground">of {totalItems} total items</p>
              </div>
            </div>

            {/* Priority Actions */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2.5 rounded-lg border">
                <span className="text-xl font-bold">{actionStats.priorityA.open}</span>
                <div>
                  <p className="text-xs font-medium">Priority 1</p>
                  <p className="text-[10px] text-muted-foreground">Before startup</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg border">
                <span className="text-xl font-bold">{actionStats.priorityB.open}</span>
                <div>
                  <p className="text-xs font-medium">Priority 2</p>
                  <p className="text-[10px] text-muted-foreground">After startup</p>
                </div>
              </div>
            </div>

            {/* Status summary */}
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px]">
                {pendingItems} Pending
              </Badge>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                {totalItems - completedItems - pendingItems >= 0 ? 0 : 0} In Review
              </Badge>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                {completedItems} Completed
              </Badge>
            </div>

            <Separator />

            {/* Progress by Category */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Progress by Category
              </p>
              <div className="space-y-4">
                {(categoryProgress || []).map((cat) => {
                  const Icon = getCategoryIcon(cat.name);
                  const colors = getCategoryColor(cat.name);
                  return (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div className={cn('w-6 h-6 rounded flex items-center justify-center shrink-0', colors.bg)}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{cat.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">{cat.completed}/{cat.total}</span>
                        </div>
                        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', colors.bar)} style={{ width: `${cat.percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!categoryProgress || categoryProgress.length === 0) && (
                  <p className="text-xs text-muted-foreground">No checklist data yet</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Key Activities */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Key Activities
              </p>
              <div className="space-y-2">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center',
                        activity.status === 'scheduled' || activity.status === 'completed'
                          ? 'bg-emerald-500/10'
                          : 'bg-muted'
                      )}>
                        {activity.status === 'scheduled' || activity.status === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs font-medium flex-1">{activity.label}</span>
                      {activity.scheduled_date ? (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(activity.scheduled_date), 'dd MMM yyyy')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 italic">Not scheduled</span>
                      )}
                    </div>
                  ))
                ) : (
                  // Fallback for PSSRs without activities yet (pre-UNDER_REVIEW)
                  [
                    { label: 'PSSR Kick-off', done: false },
                    { label: 'PSSR Walkdown', done: false },
                    { label: 'SoF Meeting', done: false },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-medium flex-1 text-muted-foreground">{activity.label}</span>
                      <span className="text-[10px] text-muted-foreground/60 italic">Pending</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>

      <ScheduleActivitySheet
        open={!!selectedActivity}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
        activity={selectedActivity}
        pssrTitle={pssr?.title}
        onSchedule={async (data) => {
          await scheduleActivity.mutateAsync(data);
        }}
      />
    </Card>
  );

  // ─── Panel 3: Review & Approvals ──────────────────────

  const renderApprovalPerson = (
    name: string,
    avatarUrl: string | null,
    position: string | null,
    status: string,
    completed: number,
    total: number,
    userId: string | null
  ) => (
    <div
      key={`${name}-${userId}`}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={() => userId && setSelectedUser({ id: userId, name, role: position || '' })}
    >
      <Avatar className="h-7 w-7">
        <AvatarImage src={avatarUrl || ''} />
        <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{name}</p>
        {position && <p className="text-[10px] text-muted-foreground truncate">{position}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {status === 'APPROVED' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : status === 'REJECTED' ? (
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-[10px] text-muted-foreground">{completed}/{total}</span>
      </div>
    </div>
  );

  const renderApprovalsPanel = () => (
    <Card className="h-full flex flex-col">
      <CardHeader className="relative overflow-hidden border-b py-3 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/8 to-emerald-400/5" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-green-300" />
        <CardTitle className="relative text-base font-semibold flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-emerald-500" />
          Review & Approvals
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {/* Delivering Parties */}
            <Collapsible open={openSections['delivering']} onOpenChange={() => toggleSection('delivering')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/30">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivering Parties</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {Object.keys(partiesByRole).length > 0 ? Object.keys(partiesByRole).length : Object.keys(deliveringParties || {}).length}
                  </Badge>
                  {openSections['delivering'] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {/* If item approvals exist, show resolved users */}
                {Object.keys(partiesByRole).length > 0 && Object.entries(partiesByRole).map(([role, data]) => {
                  const userIds = Array.from(data.userIds);
                  return userIds.map(uid => {
                    const profile = approverProfiles?.[uid];
                    return renderApprovalPerson(
                      profile?.full_name || role,
                      profile?.avatar_url || null,
                      role,
                      data.completed === data.total ? 'APPROVED' : 'PENDING',
                      data.completed,
                      data.total,
                      uid
                    );
                  });
                })}
                {/* If no item approvals, show delivering parties from checklist items responsible field */}
                {Object.keys(partiesByRole).length === 0 && deliveringParties && Object.entries(deliveringParties).map(([role, count]) => (
                  <div key={role} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">{getInitials(role)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{role}</p>
                      <p className="text-[10px] text-muted-foreground">{count} item{count !== 1 ? 's' : ''}</p>
                    </div>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                ))}
                {Object.keys(partiesByRole).length === 0 && (!deliveringParties || Object.keys(deliveringParties).length === 0) && (
                  <p className="text-xs text-muted-foreground px-2">No delivering parties assigned</p>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* PSSR Approvers */}
            <Collapsible open={openSections['pssrApprovers']} onOpenChange={() => toggleSection('pssrApprovers')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/30">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PSSR Approvers</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {pssrApprovers?.filter(a => a.status === 'APPROVED').length || 0}/{pssrApprovers?.length || 0}
                  </Badge>
                  {openSections['pssrApprovers'] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {(pssrApprovers || []).map(approver => {
                  const profile = approver.user_id ? approverProfiles?.[approver.user_id] : null;
                  const displayName = profile?.full_name || (approver.approver_name !== 'Pending Assignment' ? approver.approver_name : approver.approver_role);
                  return renderApprovalPerson(
                    displayName,
                    profile?.avatar_url || null,
                    approver.approver_role,
                    approver.status,
                    approver.status === 'APPROVED' ? 1 : 0,
                    1,
                    approver.user_id
                  );
                })}
                {(!pssrApprovers || pssrApprovers.length === 0) && (
                  <p className="text-xs text-muted-foreground px-2">No PSSR approvers assigned</p>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* SoF Approvers */}
            <Collapsible open={openSections['sofApprovers']} onOpenChange={() => toggleSection('sofApprovers')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/30">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SoF Approvers</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {sofApprovers?.filter((a: any) => a.status === 'APPROVED').length || 0}/{sofApprovers?.length || 0}
                  </Badge>
                  {openSections['sofApprovers'] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {(sofApprovers || []).map((approver: any) => {
                  const profile = approver.user_id ? approverProfiles?.[approver.user_id] : null;
                  const displayName = profile?.full_name || (approver.approver_name !== 'Pending Assignment' ? approver.approver_name : approver.approver_role);
                  return renderApprovalPerson(
                    displayName,
                    profile?.avatar_url || null,
                    approver.approver_role,
                    approver.status,
                    approver.status === 'APPROVED' ? 1 : 0,
                    1,
                    approver.user_id
                  );
                })}
                {(!sofApprovers || sofApprovers.length === 0) && (
                  <p className="text-xs text-muted-foreground px-2">No SoF approvers assigned</p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  // ─── User Detail Sheet ─────────────────────────────────

  const renderUserDetailSheet = () => {
    if (!selectedUser) return null;
    const profile = approverProfiles?.[selectedUser.id];

    return (
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-[420px] sm:w-[480px] p-0">
          <SheetHeader className="p-5 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>{getInitials(selectedUser.name)}</AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-base">{selectedUser.name}</SheetTitle>
                <SheetDescription className="text-xs">{selectedUser.role}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned PSSR Items ({userItems?.length || 0})
              </p>
              {(userItems || []).map((item: any) => {
                const ci = item.pssr_checklist_responses?.pssr_checklist_items;
                const isApproved = item.status === 'approved';
                return (
                  <div key={item.id} className="flex items-start gap-2 p-2.5 rounded-lg border bg-card">
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0',
                      isApproved ? 'bg-emerald-500/10' : 'bg-muted'
                    )}>
                      {isApproved ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className="text-[9px] px-1 h-4">{ci?.unique_id}</Badge>
                        <Badge variant="secondary" className="text-[9px] px-1 h-4">{ci?.category}</Badge>
                      </div>
                      <p className="text-xs leading-relaxed">{ci?.question}</p>
                    </div>
                  </div>
                );
              })}
              {(!userItems || userItems.length === 0) && (
                <p className="text-xs text-muted-foreground">No items assigned to this user</p>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  };

  // ─── Main Render ──────────────────────────────────────

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[calc(95vh-120px)]">
        {renderInfoPanel()}
        {renderProgressPanel()}
        {renderApprovalsPanel()}
      </div>
      {renderUserDetailSheet()}
    </>
  );
};
