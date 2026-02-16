import React from 'react';
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
  FileText,
  User,
  ArrowRight,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

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

export const VCRItemDetailSheet: React.FC<VCRItemDetailSheetProps> = ({
  item,
  open,
  onOpenChange,
  vcrId,
}) => {
  const { id: projectId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ prerequisiteId, status }: { prerequisiteId: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'READY_FOR_REVIEW') {
        updateData.submitted_at = new Date().toISOString();
      } else if (status === 'ACCEPTED' || status === 'REJECTED') {
        updateData.reviewed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('p2a_vcr_prerequisites')
        .update(updateData)
        .eq('id', prerequisiteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-prereq-detail'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-progress-data'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-prerequisites'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-category-items'] });
      toast({ title: 'Status updated' });
      onOpenChange(false);
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
    updateStatus.mutate({ prerequisiteId: item.prerequisite_id, status: newStatus });
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

      // Collect all role IDs to resolve
      const allRoleIds: string[] = [];
      const delRoleId = (data as any)?.delivering_party_role_id;
      if (delRoleId) allRoleIds.push(delRoleId);
      const appRoleIds: string[] = (data as any)?.approving_party_role_ids || [];
      allRoleIds.push(...appRoleIds);

      // Fetch approving party role names
      let approvingRoles: { id: string; name: string }[] = [];
      if (appRoleIds.length > 0) {
        const { data: roles } = await supabase
          .from('roles')
          .select('id, name')
          .in('id', appRoleIds);
        approvingRoles = (roles as any[]) || [];
      }

      // Resolve actual users — project team members first, then Project-level TA2 fallback
      let teamMembers: { user_id: string; full_name: string; avatar_url: string | null; role_id: string; role_name: string }[] = [];
      if (allRoleIds.length > 0) {
        let candidateProfiles: any[] = [];
        let matchedRoleIds: string[] = [];

        if (projectId) {
          // Step 1: Get project team members with matching roles
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

        // Step 2: For roles NOT covered by project team members, find Project-level TA2s
        const coveredRoleIds = new Set(candidateProfiles.map((p: any) => p.role));
        const uncoveredRoleIds = allRoleIds.filter(rid => !coveredRoleIds.has(rid));

        if (uncoveredRoleIds.length > 0) {
          // Query profiles with these roles, but only "Project" positions (exclude "Asset")
          const { data: ta2Profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, role, position')
            .in('role', uncoveredRoleIds)
            .eq('is_active', true);

          if (ta2Profiles) {
            // Filter: include only those whose position contains "Project" or doesn't contain "Asset"
            const projectTA2s = ta2Profiles.filter((p: any) => {
              const pos = (p.position || '').toLowerCase();
              // If position distinguishes Project vs Asset, only include Project
              if (pos.includes('- asset') || pos.includes('asset')) return false;
              return true;
            });
            candidateProfiles.push(...projectTA2s);
          }
        }

        if (candidateProfiles.length > 0) {
          // Get role names for matched profiles
          matchedRoleIds = [...new Set(candidateProfiles.map((p: any) => p.role).filter(Boolean))];
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

      return {
        ...(data as any),
        approving_roles: approvingRoles,
        team_members: teamMembers,
      };
    },
    enabled: open && !!item?.id,
  });

  if (!item) return null;

  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.NOT_STARTED;
  const StatusIcon = statusCfg.icon;

  // Resolve delivering party user(s)
  const delRoleId = vcrItemDetail?.delivering_party_role_id;
  const deliveringMembers = vcrItemDetail?.team_members?.filter((m: any) => m.role_id === delRoleId) || [];
  const deliveringRoleName = vcrItemDetail?.delivering_party?.name || 'Not assigned';

  // Resolve approving party users grouped by role
  const approvingRoles: { id: string; name: string }[] = vcrItemDetail?.approving_roles || [];
  const approvingMembers = vcrItemDetail?.team_members?.filter((m: any) =>
    (vcrItemDetail?.approving_party_role_ids || []).includes(m.role_id)
  ) || [];

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return undefined;
    if (avatarPath.startsWith('http')) return avatarPath;
    return `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${avatarPath}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-[10px]">
              {item.itemCode}
            </Badge>
            <Badge className={cn('text-[10px] border', statusCfg.color, statusCfg.textColor)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusCfg.label}
            </Badge>
          </div>
          {item.topic && (
            <p className="text-xs text-muted-foreground mt-1">{item.topic}</p>
          )}
          <SheetTitle className="text-base mt-1">{item.vcr_item}</SheetTitle>
          <SheetDescription className="sr-only">VCR Item Detail</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-5">
            {/* Category */}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Category</div>
              <Badge variant="secondary" className="text-xs">{item.category_name}</Badge>
            </div>

            <Separator />

            {/* Responsible Parties */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Responsible Parties</div>

              {/* Delivering Party */}
              <Card>
                <CardContent className="p-3">
                  <div className="text-[10px] text-muted-foreground mb-2">Delivering Party</div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{deliveringRoleName}</Badge>
                  </div>
                  {deliveringMembers.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {deliveringMembers.map((member: any) => (
                        <div key={member.user_id} className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={getAvatarUrl(member.avatar_url)} />
                            <AvatarFallback className="text-[10px]">{getInitials(member.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{member.full_name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic mt-1">No team member assigned</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
              </div>

              {/* Approving Parties */}
              <Card>
                <CardContent className="p-3">
                  <div className="text-[10px] text-muted-foreground mb-2">Approving Parties</div>
                  {approvingRoles.length > 0 ? (
                    <div className="space-y-3">
                      {approvingRoles.map((role: any) => {
                        const membersForRole = approvingMembers.filter((m: any) => m.role_id === role.id);
                        return (
                          <div key={role.id}>
                            <Badge variant="outline" className="text-[10px] mb-1">{role.name}</Badge>
                            {membersForRole.length > 0 ? (
                              <div className="space-y-1.5 mt-1.5">
                                {membersForRole.map((member: any) => (
                                  <div key={member.user_id} className="flex items-center gap-2">
                                    <Avatar className="w-7 h-7">
                                      <AvatarImage src={getAvatarUrl(member.avatar_url)} />
                                      <AvatarFallback className="text-[10px]">{getInitials(member.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium">{member.full_name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic mt-0.5">No team member assigned</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Not assigned</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Supporting Evidence */}
            {vcrItemDetail?.supporting_evidence && (
              <>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Supporting Evidence Required</div>
                  <p className="text-xs text-foreground bg-muted/50 p-3 rounded-lg">
                    {vcrItemDetail.supporting_evidence}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Guidance Notes */}
            {vcrItemDetail?.guidance_notes && (
              <>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Guidance Notes</div>
                  <p className="text-xs text-foreground bg-muted/50 p-3 rounded-lg">
                    {vcrItemDetail.guidance_notes}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Timeline */}
            {prereqDetail && (
              <>
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
                <Separator />
              </>
            )}

            {/* Evidence Documents */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Evidence Documents</div>
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No evidence uploaded yet</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
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

            {/* Qualification notice */}
            {item.status === 'QUALIFICATION_REQUESTED' && (
              <>
                <Separator />
                <Card className="border-purple-500/50 bg-purple-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-purple-600 text-sm">Qualification Raised</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          A qualification has been requested for this item.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 flex gap-2">
          {item.status === 'NOT_STARTED' && (
            <Button className="flex-1" size="sm" disabled={updateStatus.isPending} onClick={() => handleStatusChange('IN_PROGRESS')}>
              {updateStatus.isPending ? 'Updating...' : 'Start Progress'}
            </Button>
          )}
          {item.status === 'IN_PROGRESS' && (
            <Button className="flex-1" size="sm" disabled={updateStatus.isPending} onClick={() => handleStatusChange('READY_FOR_REVIEW')}>
              {updateStatus.isPending ? 'Updating...' : 'Submit for Review'}
            </Button>
          )}
          {item.status === 'READY_FOR_REVIEW' && (
            <>
              <Button className="flex-1" variant="outline" size="sm" disabled={updateStatus.isPending} onClick={() => handleStatusChange('QUALIFICATION_REQUESTED')}>
                Request Qualification
              </Button>
              <Button className="flex-1" size="sm" disabled={updateStatus.isPending} onClick={() => handleStatusChange('ACCEPTED')}>
                Approve
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
