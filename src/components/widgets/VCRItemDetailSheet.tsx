import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  FileText,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileCheck,
  Brain,
  TrendingUp,
  ShieldAlert,
  X,
  Plus,
  Search,
  UserPlus,
  ChevronDown,
  Info,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { useVCRItemDeliveringParties, useProjectTeamSearch } from '@/hooks/useVCRItemDeliveringParties';
import { useVCRChecklistIntelligence } from '@/hooks/useVCRChecklistIntelligence';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface VCRItemBasic {
  id: string;
  vcr_item: string;
  topic: string | null;
  category_name: string;
  category_code: string;
  status: string;
  prerequisite_id: string | null;
  itemCode: string;
}

interface VCRItemDetailSheetProps {
  item: VCRItemBasic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; icon: React.ElementType }> = {
  ACCEPTED: { label: 'Accepted', color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-600', icon: CheckCircle2 },
  QUALIFICATION_APPROVED: { label: 'Qualified', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-600', icon: CheckCircle2 },
  READY_FOR_REVIEW: { label: 'In Review', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-600', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-600', icon: Clock },
  REJECTED: { label: 'Rejected', color: 'bg-red-50 border-red-200', textColor: 'text-red-600', icon: XCircle },
  QUALIFICATION_REQUESTED: { label: 'Qualification Raised', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-500', icon: AlertTriangle },
  NOT_STARTED: { label: 'Not Started', color: 'bg-muted border-border', textColor: 'text-muted-foreground', icon: FileCheck },
  PENDING: { label: 'Pending', color: 'bg-muted border-border', textColor: 'text-muted-foreground', icon: FileCheck },
};

// ─── Helpers ────────────────────────────────────────────────────────
const getAvatarUrl = (avatarPath: string | null | undefined) => {
  if (!avatarPath) return undefined;
  if (avatarPath.startsWith('http')) return avatarPath;
  return `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${avatarPath}`;
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

// ─── Member-management popover (anchored inside the panel) ──────────
interface MemberManagePopoverProps {
  trigger: React.ReactNode;
  existingMembers: { user_id: string; full_name: string; avatar_url?: string | null; role_name?: string }[];
  candidates: { user_id: string; full_name: string; avatar_url: string | null; role_name?: string }[];
  onAdd: (userId: string) => void;
  onRemove?: (memberId: string) => void;
  removeKey?: (m: any) => string;
  emptyMessage?: string;
}

const MemberManagePopover: React.FC<MemberManagePopoverProps> = ({
  trigger, existingMembers, candidates, onAdd, onRemove, removeKey, emptyMessage,
}) => {
  const [search, setSearch] = useState('');
  const filtered = candidates.filter(c =>
    !existingMembers.some(m => m.user_id === c.user_id) &&
    (c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     c.role_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-72 p-2"
      >
        <div className="space-y-2">
          {existingMembers.length > 0 && (
            <div className="space-y-0.5 pb-2 border-b border-border/50">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 pb-1">Current ({existingMembers.length})</p>
              {existingMembers.map((m, i) => (
                <div key={m.user_id + i} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/40">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={getAvatarUrl(m.avatar_url)} />
                    <AvatarFallback className="text-[9px]">{getInitials(m.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs flex-1 truncate">{m.full_name}</span>
                  {onRemove && removeKey && (
                    <button
                      onClick={() => onRemove(removeKey(m))}
                      className="opacity-60 hover:opacity-100 hover:text-destructive transition"
                      title={`Remove ${m.full_name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Add team member…"
              className="h-8 pl-7 text-xs"
            />
          </div>
          <ScrollArea className="max-h-48">
            <div className="space-y-0.5">
              {filtered.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-4 px-2 leading-relaxed">
                  {emptyMessage || 'No team members assigned to this role yet — invite from Team Settings.'}
                </p>
              ) : (
                filtered.map(m => (
                  <button
                    key={m.user_id}
                    onClick={() => { onAdd(m.user_id); setSearch(''); }}
                    className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-muted/60 transition text-left"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={getAvatarUrl(m.avatar_url)} />
                      <AvatarFallback className="text-[9px]">{getInitials(m.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{m.full_name}</div>
                      {m.role_name && (
                        <div className="text-[10px] text-muted-foreground truncate">{m.role_name}</div>
                      )}
                    </div>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─── Avatar stack with "+N" overflow + hover tooltip ────────────────
const AvatarStack: React.FC<{
  members: { user_id?: string; full_name: string; avatar_url?: string | null }[];
}> = ({ members }) => {
  if (members.length === 0) {
    return (
      <div className="w-7 h-7 rounded-full border border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground">
        <UserPlus className="w-3 h-3" />
      </div>
    );
  }
  const first = members[0];
  const overflow = members.length - 1;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center -space-x-1.5 cursor-pointer">
            <Avatar className="w-7 h-7 ring-2 ring-background">
              <AvatarImage src={getAvatarUrl(first.avatar_url)} />
              <AvatarFallback className="text-[10px]">{getInitials(first.full_name)}</AvatarFallback>
            </Avatar>
            {overflow > 0 && (
              <div className="w-7 h-7 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                +{overflow}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          <ul className="space-y-0.5">
            {members.map((m, i) => (
              <li key={(m.user_id || '') + i}>{m.full_name}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const VCRItemDetailSheet: React.FC<VCRItemDetailSheetProps> = ({
  item,
  open,
  onOpenChange,
  vcrId,
}) => {
  const { id: projectId } = useParams<{ id: string }>();
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [guidanceOpen, setGuidanceOpen] = useState(false);

  const { members: deliveringParties, addMember, removeMember } = useVCRItemDeliveringParties({ vcrItemId: item?.id, handoverPointId: vcrId });
  const { data: teamMembers = [] } = useProjectTeamSearch(projectId);

  const categoryForIntelligence = item?.category_name?.toLowerCase().includes('training') ? 'training'
    : item?.category_name?.toLowerCase().includes('procedure') ? 'procedures'
    : item?.category_name?.toLowerCase().includes('document') ? 'documentation'
    : item?.category_name?.toLowerCase().includes('register') ? 'registers'
    : undefined;

  const { data: intelligence } = useVCRChecklistIntelligence(vcrId, projectId, categoryForIntelligence);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ prerequisiteId, status }: { prerequisiteId: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'READY_FOR_REVIEW') updateData.submitted_at = new Date().toISOString();
      else if (status === 'ACCEPTED' || status === 'REJECTED') updateData.reviewed_at = new Date().toISOString();
      const { error } = await supabase
        .from('p2a_vcr_prerequisites')
        .update(updateData)
        .eq('id', prerequisiteId);
      if (error) throw error;
      return status;
    },
    onSuccess: async (completedStatus) => {
      queryClient.invalidateQueries({ queryKey: ['vcr-prereq-detail'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-progress-data'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-prerequisites'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-category-items'] });
      toast({ title: 'Status updated' });
      onOpenChange(false);

      if (completedStatus === 'ACCEPTED' || completedStatus === 'QUALIFICATION_APPROVED') {
        try {
          const { checkVCRFinalizationReadiness } = await import('./hooks/useVCRDisciplineAssurance');
          await checkVCRFinalizationReadiness(vcrId, queryClient);
        } catch (e) {
          console.warn('[VCR Item] Finalization check failed:', e);
        }
      }
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (!item?.prerequisite_id) {
      toast({ title: 'Error', description: 'No prerequisite linked to this item', variant: 'destructive' });
      return;
    }
    if ((newStatus === 'ACCEPTED' || newStatus === 'READY_FOR_REVIEW') && intelligence && intelligence.total > 0 && intelligence.completed < intelligence.total) {
      setPendingStatus(newStatus);
      setShowWarningDialog(true);
      return;
    }
    updateStatus.mutate({ prerequisiteId: item.prerequisite_id, status: newStatus });
  };

  const confirmStatusChange = () => {
    if (!item?.prerequisite_id || !pendingStatus) return;
    updateStatus.mutate({ prerequisiteId: item.prerequisite_id, status: pendingStatus });
    setShowWarningDialog(false);
    setPendingStatus(null);
  };

  const { data: prereqDetail } = useQuery({
    queryKey: ['vcr-prereq-detail', item?.prerequisite_id],
    queryFn: async () => {
      if (!item?.prerequisite_id) return null;
      const { data, error } = await supabase
        .from('p2a_vcr_prerequisites')
        .select('*')
        .eq('id', item.prerequisite_id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: open && !!item?.prerequisite_id,
  });

  const { data: vcrItemDetail } = useQuery({
    queryKey: ['vcr-item-detail', item?.id, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vcr_items')
        .select(`
          *,
          delivering_party:roles!vcr_items_delivering_party_role_id_fkey(id, name),
          vcr_item_categories!vcr_items_category_id_fkey(name, code)
        `)
        .eq('id', item!.id)
        .maybeSingle();
      if (error) return null;

      const allRoleIds: string[] = [];
      const delRoleId = (data as any)?.delivering_party_role_id;
      if (delRoleId) allRoleIds.push(delRoleId);
      const appRoleIds: string[] = (data as any)?.approving_party_role_ids || [];
      allRoleIds.push(...appRoleIds);

      let approvingRoles: { id: string; name: string; is_b2b?: boolean }[] = [];
      if (appRoleIds.length > 0) {
        const { data: roles } = await supabase
          .from('roles')
          .select('id, name')
          .in('id', appRoleIds);
        approvingRoles = (roles as any[]) || [];
      }

      let teamMembers: { user_id: string; full_name: string; avatar_url: string | null; role_id: string; role_name: string }[] = [];
      if (allRoleIds.length > 0) {
        let candidateProfiles: any[] = [];

        if (projectId) {
          const { data: members } = await supabase
            .from('project_team_members')
            .select('user_id')
            .eq('project_id', projectId);

          if (members && members.length > 0) {
            const userIds = members.map((m: any) => m.user_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url, role')
              .in('user_id', userIds)
              .in('role', allRoleIds)
              .eq('is_active', true);
            candidateProfiles = profiles || [];
          }
        }

        const coveredRoleIds = new Set(candidateProfiles.map((p: any) => p.role));
        const uncoveredRoleIds = allRoleIds.filter(rid => !coveredRoleIds.has(rid));

        if (uncoveredRoleIds.length > 0) {
          const { data: ta2Profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, role, position')
            .in('role', uncoveredRoleIds)
            .eq('is_active', true);

          if (ta2Profiles) {
            const projectTA2s = ta2Profiles.filter((p: any) => {
              const pos = (p.position || '').toLowerCase();
              if (pos.includes('- asset') || pos.includes('asset')) return false;
              return true;
            });
            candidateProfiles.push(...projectTA2s);
          }
        }

        if (candidateProfiles.length > 0) {
          const matchedRoleIds = [...new Set(candidateProfiles.map((p: any) => p.role).filter(Boolean))];
          let roleMap: Record<string, string> = {};
          if (matchedRoleIds.length > 0) {
            const { data: roleNames } = await supabase
              .from('roles')
              .select('id, name')
              .in('id', matchedRoleIds);
            roleNames?.forEach((r: any) => { roleMap[r.id] = r.name; });
          }
          teamMembers = candidateProfiles.map((p: any) => ({
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            role_id: p.role,
            role_name: roleMap[p.role] || '',
          }));
        }
      }

      return { ...(data as any), approving_roles: approvingRoles, team_members: teamMembers };
    },
    enabled: open && !!item?.id,
  });

  if (!item) return null;

  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.NOT_STARTED;
  const StatusIcon = statusCfg.icon;

  const delRoleId = vcrItemDetail?.delivering_party_role_id;
  const deliveringRoleMembers = vcrItemDetail?.team_members?.filter((m: any) => m.role_id === delRoleId) || [];
  const deliveringRoleName = vcrItemDetail?.delivering_party?.name || 'Delivering Party';

  const approvingRoles: { id: string; name: string; is_b2b?: boolean }[] = vcrItemDetail?.approving_roles || [];
  const approvingPartyRoleIds: string[] = vcrItemDetail?.approving_party_role_ids || [];

  const hasGuidance = !!vcrItemDetail?.guidance_notes;
  const guidancePreview = vcrItemDetail?.guidance_notes
    ? vcrItemDetail.guidance_notes.slice(0, 90) + (vcrItemDetail.guidance_notes.length > 90 ? '…' : '')
    : '';

  // Footer action set
  const renderFooterActions = () => {
    if (item.status === 'NOT_STARTED') {
      return (
        <Button className="flex-1" size="sm" disabled={updateStatus.isPending} onClick={() => handleStatusChange('IN_PROGRESS')}>
          {updateStatus.isPending ? 'Saving…' : 'Start Progress'}
        </Button>
      );
    }
    if (item.status === 'IN_PROGRESS') {
      return (
        <Button className="flex-1" size="sm" disabled={updateStatus.isPending} onClick={() => handleStatusChange('READY_FOR_REVIEW')}>
          {updateStatus.isPending ? 'Saving…' : 'Submit for Review'}
        </Button>
      );
    }
    if (item.status === 'READY_FOR_REVIEW') {
      return (
        <>
          <Button className="flex-1" variant="outline" size="sm" disabled={updateStatus.isPending} onClick={() => handleStatusChange('QUALIFICATION_REQUESTED')}>
            Request Qualification
          </Button>
          <Button className="flex-1" size="sm" disabled={updateStatus.isPending} onClick={() => handleStatusChange('ACCEPTED')}>
            Approve
          </Button>
        </>
      );
    }
    return (
      <Button className="flex-1" size="sm" disabled>
        {statusCfg.label}
      </Button>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col p-0">
          {/* ─── Header ───────────────────────────────────────────── */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-[10px]">{item.itemCode}</Badge>
              <Badge className={cn('text-[10px] border', statusCfg.color, statusCfg.textColor)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusCfg.label}
              </Badge>
            </div>
            <SheetTitle className="text-base mt-1 leading-snug">{item.vcr_item}</SheetTitle>
            {item.topic && (
              <p className="text-xs text-muted-foreground">{item.topic}</p>
            )}
            <SheetDescription className="sr-only">VCR Item Detail</SheetDescription>
          </SheetHeader>

          {/* ─── Scrolling Content ────────────────────────────────── */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-4 space-y-5">
              {/* Category */}
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">{item.category_name}</Badge>
              </div>

              {/* Guidance Notes — collapsible, near top */}
              {hasGuidance && (
                <Collapsible open={guidanceOpen} onOpenChange={setGuidanceOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition text-left border border-border/40">
                      <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">Guidance Notes</span>
                          <ChevronDown className={cn(
                            'w-3.5 h-3.5 text-muted-foreground transition-transform',
                            guidanceOpen && 'rotate-180'
                          )} />
                        </div>
                        {!guidanceOpen && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{guidancePreview}</p>
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="text-xs text-foreground bg-muted/30 p-3 mt-1.5 rounded-lg whitespace-pre-wrap">
                      {vcrItemDetail?.guidance_notes}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <Separator />

              {/* ─── Responsible Parties — flat row list ─────────── */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Responsible Parties</div>

                {/* Delivering Party row */}
                <div className="border border-border/40 rounded-lg overflow-hidden divide-y divide-border/40">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Delivering</span>
                        <span className="text-xs font-medium truncate">{deliveringRoleName}</span>
                      </div>
                    </div>
                    <AvatarStack members={deliveringParties.length > 0 ? deliveringParties : deliveringRoleMembers} />
                    <MemberManagePopover
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      }
                      existingMembers={deliveringParties.map((dp: any) => ({
                        user_id: dp.user_id, full_name: dp.full_name, avatar_url: dp.avatar_url, role_name: dp.role_name,
                      }))}
                      candidates={teamMembers}
                      onAdd={(uid) => addMember.mutate(uid)}
                      onRemove={(id) => removeMember.mutate(id)}
                      removeKey={(m: any) => m.user_id}
                    />
                  </div>

                  {/* Approving Parties: each role = row */}
                  {approvingRoles.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] text-muted-foreground italic">No approving parties assigned</div>
                  ) : (
                    approvingRoles.map((role) => {
                      const roleMembers = vcrItemDetail?.team_members?.filter((m: any) => m.role_id === role.id) || [];
                      const isB2B = approvingPartyRoleIds.includes(role.id) && /b2b|external|client|operator/i.test(role.name);
                      return (
                        <div key={role.id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Approving</span>
                              <span className="text-xs font-medium truncate">{role.name}</span>
                              {isB2B && (
                                <TooltipProvider delayDuration={150}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="text-[9px] h-4 px-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0 font-semibold cursor-help">
                                        B2B
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="text-xs max-w-[200px]">
                                      Business-to-Business — external delivery party (e.g. operator, client)
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                          <AvatarStack members={roleMembers} />
                          <MemberManagePopover
                            trigger={
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            }
                            existingMembers={roleMembers}
                            candidates={teamMembers as any}
                            onAdd={() => { /* role-level membership managed in Team Settings */ }}
                            emptyMessage="No team members assigned to this role yet — invite from Team Settings."
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Supporting Evidence */}
              {vcrItemDetail?.supporting_evidence && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Supporting Evidence Required</div>
                    <p className="text-xs text-foreground bg-muted/40 p-3 rounded-lg whitespace-pre-wrap">
                      {vcrItemDetail.supporting_evidence}
                    </p>
                  </div>
                </>
              )}

              {/* Timeline */}
              {prereqDetail && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Timeline</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-[10px] text-muted-foreground">Created</div>
                          <div className="text-xs">{format(new Date(prereqDetail.created_at), 'dd MMM yyyy')}</div>
                        </div>
                      </div>
                      {prereqDetail.submitted_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="text-[10px] text-muted-foreground">Submitted</div>
                            <div className="text-xs">{format(new Date(prereqDetail.submitted_at), 'dd MMM yyyy')}</div>
                          </div>
                        </div>
                      )}
                      {prereqDetail.reviewed_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <div>
                            <div className="text-[10px] text-muted-foreground">Reviewed</div>
                            <div className="text-xs">{format(new Date(prereqDetail.reviewed_at), 'dd MMM yyyy')}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ORA Intelligence */}
              {intelligence && intelligence.total > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-primary" />
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">ORA Activity Intelligence</div>
                    </div>
                    <Card className={cn(
                      'border',
                      intelligence.percentage === 100 ? 'border-emerald-500/30 bg-emerald-500/5' :
                      intelligence.percentage > 0 ? 'border-amber-500/30 bg-amber-500/5' :
                      'border-border bg-muted/30'
                    )}>
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">
                            {categoryForIntelligence ? `${categoryForIntelligence.charAt(0).toUpperCase() + categoryForIntelligence.slice(1)} Activities` : 'Related Activities'}
                          </span>
                          <Badge variant="outline" className={cn('text-[10px]',
                            intelligence.percentage === 100 ? 'border-emerald-500 text-emerald-600' :
                            intelligence.percentage > 0 ? 'border-amber-500 text-amber-600' :
                            'text-muted-foreground'
                          )}>
                            {intelligence.completed}/{intelligence.total} completed
                          </Badge>
                        </div>
                        <Progress value={intelligence.percentage} className="h-1.5" />
                        <div className="flex gap-4 text-[10px] text-muted-foreground">
                          {intelligence.completed > 0 && (
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" />{intelligence.completed} done</span>
                          )}
                          {intelligence.inProgress > 0 && (
                            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-amber-500" />{intelligence.inProgress} in progress</span>
                          )}
                          {intelligence.notStarted > 0 && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" />{intelligence.notStarted} pending</span>
                          )}
                        </div>
                        {intelligence.percentage < 100 && (
                          <div className="flex items-start gap-2 pt-1 border-t border-border/50">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-muted-foreground">
                              ORA data indicates {intelligence.total - intelligence.completed} activit{intelligence.total - intelligence.completed === 1 ? 'y is' : 'ies are'} still outstanding. Confirm status before closing this item.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Evidence Documents */}
              <Separator />
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Evidence Documents</div>
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center">
                    <FileText className="w-7 h-7 text-muted-foreground/60 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No evidence uploaded yet</p>
                  </CardContent>
                </Card>
              </div>

              {/* Comments */}
              <Separator />
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Comments</div>
                {prereqDetail?.comments ? (
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <p className="text-xs text-foreground">{prereqDetail.comments}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No comments</p>
                )}
              </div>

              {/* Qualification banner */}
              {item.status === 'QUALIFICATION_REQUESTED' && (
                <Card className="border-purple-500/50 bg-purple-500/5">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-purple-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-purple-600 text-xs">Qualification Raised</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          A qualification has been requested for this item.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          {/* ─── Sticky Footer ────────────────────────────────────── */}
          <div className="border-t bg-background px-6 py-3 flex gap-2 shrink-0 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.08)]">
            {renderFooterActions()}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Warning dialog for incomplete ORA activities */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Incomplete Activities Detected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  ORA Activity data shows <strong>{intelligence ? intelligence.total - intelligence.completed : 0}</strong> of <strong>{intelligence?.total || 0}</strong> related activities are still outstanding.
                </p>
                {intelligence && intelligence.activities.filter(a => a.status !== 'COMPLETED').length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                    {intelligence.activities.filter(a => a.status !== 'COMPLETED').slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <span className="truncate mr-2">{a.name}</span>
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {a.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'}
                        </Badge>
                      </div>
                    ))}
                    {intelligence.activities.filter(a => a.status !== 'COMPLETED').length > 5 && (
                      <p className="text-[10px] text-muted-foreground italic">+{intelligence.activities.filter(a => a.status !== 'COMPLETED').length - 5} more</p>
                    )}
                  </div>
                )}
                <p className="text-xs">Are you sure you want to proceed?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>Proceed Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
