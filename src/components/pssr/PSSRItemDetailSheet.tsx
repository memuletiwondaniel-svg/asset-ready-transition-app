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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  FileText,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  BookOpen,
  ClipboardList,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface PSSRItemDetailSheetProps {
  itemId: string | null;
  pssrId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getAvatarUrl = (avatarPath: string | null) => {
  if (!avatarPath) return undefined;
  if (avatarPath.startsWith('http')) return avatarPath;
  return `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${avatarPath}`;
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

export const PSSRItemDetailSheet: React.FC<PSSRItemDetailSheetProps> = ({
  itemId,
  pssrId,
  open,
  onOpenChange,
}) => {
  // Fetch checklist item details
  const { data: itemDetail, isLoading } = useQuery({
    queryKey: ['pssr-item-detail', itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const { data, error } = await supabase
        .from('pssr_checklist_items')
        .select(`
          id, description, topic, responsible, approvers, 
          supporting_evidence, guidance_notes, sequence_number,
          pssr_checklist_categories!inner(id, name, ref_id)
        `)
        .eq('id', itemId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: open && !!itemId,
  });

  // Fetch the response for this item + this PSSR
  const { data: responseDetail } = useQuery({
    queryKey: ['pssr-item-response', pssrId, itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const { data, error } = await supabase
        .from('pssr_checklist_responses')
        .select('*')
        .eq('pssr_id', pssrId)
        .eq('checklist_item_id', itemId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: open && !!itemId && !!pssrId,
  });

  // Fetch item approval for this response
  const { data: approvalDetail } = useQuery({
    queryKey: ['pssr-item-approval', responseDetail?.id],
    queryFn: async () => {
      if (!responseDetail?.id) return null;
      const { data } = await supabase
        .from('pssr_item_approvals')
        .select('status, comments, reviewed_at, approver_user_id, approver_role')
        .eq('checklist_response_id', responseDetail.id)
        .maybeSingle();
      return data;
    },
    enabled: !!responseDetail?.id,
  });

  // Resolve delivering party users by role name
  const { data: deliveringUsers } = useQuery({
    queryKey: ['pssr-delivering-users', itemDetail?.responsible],
    queryFn: async () => {
      if (!itemDetail?.responsible) return [];
      // Try to find a role by name, then find profiles with that role
      const roleName = itemDetail.responsible.trim();
      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .ilike('name', roleName);
      
      if (!roles || roles.length === 0) return [];
      
      const roleIds = roles.map(r => r.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('role', roleIds)
        .eq('is_active', true)
        .limit(5);
      
      return (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || '',
        avatar_url: p.avatar_url,
      }));
    },
    enabled: open && !!itemDetail?.responsible,
  });

  // Resolve approving party users
  const { data: approvingData } = useQuery({
    queryKey: ['pssr-approving-users', itemDetail?.approvers],
    queryFn: async () => {
      if (!itemDetail?.approvers) return [];
      const roleNames = itemDetail.approvers.split(',').map((r: string) => r.trim()).filter(Boolean);
      
      // Find roles by name
      const results: { roleName: string; users: { user_id: string; full_name: string; avatar_url: string | null }[] }[] = [];
      
      for (const roleName of roleNames) {
        const { data: roles } = await supabase
          .from('roles')
          .select('id, name')
          .ilike('name', roleName);
        
        if (roles && roles.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('role', roles.map(r => r.id))
            .eq('is_active', true)
            .limit(3);
          
          results.push({
            roleName: roles[0].name,
            users: (profiles || []).map(p => ({
              user_id: p.user_id,
              full_name: p.full_name || '',
              avatar_url: p.avatar_url,
            })),
          });
        } else {
          results.push({ roleName, users: [] });
        }
      }
      
      return results;
    },
    enabled: open && !!itemDetail?.approvers,
  });

  if (!itemId) return null;

  const categoryName = itemDetail?.pssr_checklist_categories?.name || '';
  const refId = itemDetail?.pssr_checklist_categories?.ref_id || '';
  const itemCode = `${refId}-${String(itemDetail?.sequence_number || 0).padStart(2, '0')}`;

  // Derive status
  const response = responseDetail?.response;
  const respStatus = responseDetail?.status;
  let statusLabel = 'Not Started';
  let statusColor = 'bg-muted border-border text-muted-foreground';
  if (respStatus === 'approved' || response === 'YES' || response === 'NA') {
    statusLabel = 'Completed';
    statusColor = 'bg-emerald-50 border-emerald-200 text-emerald-600';
  } else if (respStatus === 'submitted' || respStatus === 'in_review') {
    statusLabel = 'In Review';
    statusColor = 'bg-blue-50 border-blue-200 text-blue-600';
  } else if (response) {
    statusLabel = 'Pending';
    statusColor = 'bg-amber-50 border-amber-200 text-amber-600';
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {itemCode}
                </Badge>
                <Badge className={cn('text-[10px] border', statusColor)}>
                  {statusLabel}
                </Badge>
                {response && (
                  <Badge variant="secondary" className="text-[10px]">
                    {response}
                  </Badge>
                )}
              </div>
              {itemDetail?.topic && (
                <p className="text-xs text-muted-foreground mt-1">{itemDetail.topic}</p>
              )}
              <SheetTitle className="text-base mt-1">{itemDetail?.description}</SheetTitle>
              <SheetDescription className="sr-only">PSSR Item Detail</SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-5">
                {/* Category */}
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Category</div>
                  <Badge variant="secondary" className="text-xs">{categoryName}</Badge>
                </div>

                <Separator />

                {/* Responsible Parties */}
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Responsible Parties</div>

                  {/* Delivering Party */}
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground mb-2">Delivering Party</div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-medium text-muted-foreground w-24 shrink-0 truncate" title={itemDetail?.responsible || 'Not assigned'}>
                          {itemDetail?.responsible || 'Not assigned'}
                        </span>
                        {deliveringUsers && deliveringUsers.length > 0 ? (
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {deliveringUsers.map((user: any) => (
                              <div key={user.user_id} className="flex flex-col items-center gap-0.5 min-w-0">
                                <Avatar className="w-7 h-7">
                                  <AvatarImage src={getAvatarUrl(user.avatar_url)} />
                                  <AvatarFallback className="text-[10px]">{getInitials(user.full_name)}</AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] text-foreground truncate max-w-[80px] text-center" title={user.full_name}>
                                  {user.full_name?.split(' ')[0]}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">Unassigned</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
                  </div>

                  {/* Approving Parties */}
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground mb-2">Approving Parties</div>
                      {approvingData && approvingData.length > 0 ? (
                        <div className="divide-y divide-border">
                          {approvingData.map((role: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                              <span className="text-[10px] font-medium text-muted-foreground w-24 shrink-0 truncate" title={role.roleName}>
                                {role.roleName}
                              </span>
                              {role.users.length > 0 ? (
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  {role.users.map((user: any) => (
                                    <div key={user.user_id} className="flex flex-col items-center gap-0.5 w-14">
                                      <Avatar className="w-7 h-7">
                                        <AvatarImage src={getAvatarUrl(user.avatar_url)} />
                                        <AvatarFallback className="text-[10px]">{getInitials(user.full_name)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-[10px] text-foreground truncate w-full text-center" title={user.full_name}>
                                        {user.full_name?.split(' ')[0]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground italic">Unassigned</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          {itemDetail?.approvers || 'Not assigned'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Supporting Evidence */}
                {itemDetail?.supporting_evidence && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Supporting Evidence Required
                      </div>
                      <p className="text-xs text-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-line">
                        {itemDetail.supporting_evidence}
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Guidance Notes */}
                {itemDetail?.guidance_notes && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5" />
                        Guidance Notes
                      </div>
                      <p className="text-xs text-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-line">
                        {itemDetail.guidance_notes}
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Response Details */}
                {responseDetail && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        Response Details
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] text-muted-foreground">Response</div>
                          <Badge variant="secondary" className="mt-1 text-xs">{responseDetail.response || 'No response'}</Badge>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Status</div>
                          <Badge variant="outline" className="mt-1 text-xs">{responseDetail.status || 'N/A'}</Badge>
                        </div>
                      </div>
                      {responseDetail.narrative && (
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">Narrative</div>
                          <p className="text-xs bg-muted/50 p-3 rounded-lg">{responseDetail.narrative}</p>
                        </div>
                      )}
                      {responseDetail.deviation_reason && (
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">Deviation Reason</div>
                          <p className="text-xs bg-muted/50 p-3 rounded-lg">{responseDetail.deviation_reason}</p>
                        </div>
                      )}
                      {responseDetail.mitigations && (
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">Mitigations</div>
                          <p className="text-xs bg-muted/50 p-3 rounded-lg">{responseDetail.mitigations}</p>
                        </div>
                      )}
                      {responseDetail.follow_up_action && (
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">Follow-up Action</div>
                          <p className="text-xs bg-muted/50 p-3 rounded-lg">{responseDetail.follow_up_action}</p>
                        </div>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Timeline
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {responseDetail?.created_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-[10px] text-muted-foreground">Submitted</div>
                          <div className="text-xs">{format(new Date(responseDetail.created_at), 'dd MMM yyyy')}</div>
                        </div>
                      </div>
                    )}
                    {approvalDetail?.reviewed_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <div>
                          <div className="text-[10px] text-muted-foreground">Reviewed</div>
                          <div className="text-xs">{format(new Date(approvalDetail.reviewed_at), 'dd MMM yyyy')}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  {approvalDetail?.comments && (
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">Approval Comments</div>
                      <p className="text-xs bg-muted/50 p-3 rounded-lg">{approvalDetail.comments}</p>
                    </div>
                  )}
                </div>

                {/* Attachments */}
                {(responseDetail as any)?.attachments && ((responseDetail as any).attachments as string[]).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <Paperclip className="w-3.5 h-3.5" />
                        Attachments
                      </div>
                      <div className="space-y-1">
                        {((responseDetail as any).attachments as string[]).map((att: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs">
                            <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="truncate">{att}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
