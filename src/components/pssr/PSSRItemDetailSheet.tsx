import React, { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  Pencil,
  Save,
  X,
  Check,
  ChevronsUpDown,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

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

// Role combobox component
const RoleCombobox: React.FC<{
  value: string;
  onChange: (val: string) => void;
  roles: { id: string; name: string }[];
  placeholder?: string;
}> = ({ value, onChange, roles, placeholder = 'Select role...' }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between text-xs h-8"
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search roles..." className="text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs p-2">No roles found.</CommandEmpty>
            <CommandGroup>
              {roles.map(role => (
                <CommandItem
                  key={role.id}
                  value={role.name}
                  onSelect={() => {
                    onChange(role.name);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check className={cn('mr-2 h-3 w-3', value === role.name ? 'opacity-100' : 'opacity-0')} />
                  {role.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const PSSRItemDetailSheet: React.FC<PSSRItemDetailSheetProps> = ({
  itemId,
  pssrId,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editApprovers, setEditApprovers] = useState<string[]>([]);
  const [approverPopoverOpen, setApproverPopoverOpen] = useState(false);

  // Determine if this is a custom item
  const isCustomItem = itemId?.startsWith('custom-') || false;
  const actualItemId = isCustomItem ? itemId?.replace('custom-', '') : itemId;

  // Fetch available roles
  const { data: allRoles } = useQuery({
    queryKey: ['all-roles-for-pssr'],
    queryFn: async () => {
      const { data } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: open,
  });

  // Fetch checklist item details
  const { data: itemDetail, isLoading } = useQuery({
    queryKey: ['pssr-item-detail', itemId],
    queryFn: async () => {
      if (!itemId) return null;
      
      if (isCustomItem) {
        // Custom item from pssr_custom_checklist_items
        const { data, error } = await supabase
          .from('pssr_custom_checklist_items')
          .select('id, description, topic, category, display_order, supporting_evidence')
          .eq('id', actualItemId!)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        
        const displayName = data.category.includes(':')
          ? data.category.split(':').slice(1).join(':').trim()
          : data.category;
        
        return {
          id: data.id,
          description: data.description,
          topic: data.topic,
          responsible: null,
          approvers: null,
          supporting_evidence: data.supporting_evidence,
          guidance_notes: null,
          sequence_number: data.display_order || 1,
          pssr_checklist_categories: { name: displayName, ref_id: 'OT' },
          _isCustom: true,
        } as any;
      }
      
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

  // Fetch per-PSSR overrides
  const { data: overrides } = useQuery({
    queryKey: ['pssr-item-overrides', pssrId, itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const checklistItemKey = isCustomItem ? `custom-${actualItemId}` : itemId;
      const { data } = await supabase
        .from('pssr_item_overrides')
        .select('*')
        .eq('pssr_id', pssrId)
        .eq('checklist_item_id', checklistItemKey)
        .maybeSingle();
      return data;
    },
    enabled: open && !!itemId && !!pssrId,
  });

  // Effective values (override > template)
  const effectiveDescription = overrides?.description_override || itemDetail?.description || '';
  const effectiveTopic = overrides?.topic_override || itemDetail?.topic || '';
  const effectiveResponsible = overrides?.responsible_override || itemDetail?.responsible || '';
  const effectiveApprovers = overrides?.approvers_override || itemDetail?.approvers || '';

  // Fetch the response for this item + this PSSR
  const { data: responseDetail } = useQuery({
    queryKey: ['pssr-item-response', pssrId, itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const checklistItemKey = isCustomItem ? `custom-${actualItemId}` : itemId;
      const { data, error } = await supabase
        .from('pssr_checklist_responses')
        .select('*')
        .eq('pssr_id', pssrId)
        .eq('checklist_item_id', checklistItemKey)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: open && !!itemId && !!pssrId,
  });

  // Fetch item approval
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

  // Resolve delivering party users
  const { data: deliveringUsers } = useQuery({
    queryKey: ['pssr-delivering-users', effectiveResponsible],
    queryFn: async () => {
      if (!effectiveResponsible) return [];
      const roleName = effectiveResponsible.trim();
      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .ilike('name', roleName);
      if (!roles || roles.length === 0) return [];
      const roleIds = roles.map(r => r.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, position')
        .in('role', roleIds)
        .eq('is_active', true)
        .limit(10);
      return (profiles || [])
        .filter(p => !(p.position || '').toLowerCase().includes('project'))
        .map(p => ({ user_id: p.user_id, full_name: p.full_name || '', avatar_url: p.avatar_url }));
    },
    enabled: open && !!effectiveResponsible,
  });

  // Resolve approving party users
  const { data: approvingData } = useQuery({
    queryKey: ['pssr-approving-users', effectiveApprovers],
    queryFn: async () => {
      if (!effectiveApprovers) return [];
      const roleNames = effectiveApprovers.split(',').map((r: string) => r.trim()).filter(Boolean);
      const results: { roleName: string; users: { user_id: string; full_name: string; avatar_url: string | null }[] }[] = [];
      for (const roleName of roleNames) {
        const { data: roles } = await supabase
          .from('roles')
          .select('id, name')
          .ilike('name', roleName);
        if (roles && roles.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, position')
            .in('role', roles.map(r => r.id))
            .eq('is_active', true)
            .limit(10);
          const filtered = (profiles || []).filter(p => !(p.position || '').toLowerCase().includes('project'));
          results.push({
            roleName: roles[0].name,
            users: filtered.map(p => ({ user_id: p.user_id, full_name: p.full_name || '', avatar_url: p.avatar_url })),
          });
        } else {
          results.push({ roleName, users: [] });
        }
      }
      return results;
    },
    enabled: open && !!effectiveApprovers,
  });

  // Enter edit mode
  const startEditing = () => {
    setEditDescription(effectiveDescription);
    setEditTopic(effectiveTopic);
    setEditResponsible(effectiveResponsible);
    setEditApprovers(effectiveApprovers ? effectiveApprovers.split(',').map(s => s.trim()).filter(Boolean) : []);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const checklistItemKey = isCustomItem ? `custom-${actualItemId}` : itemId!;
      const approversStr = editApprovers.join(', ');
      
      const { data: existing } = await supabase
        .from('pssr_item_overrides')
        .select('id')
        .eq('pssr_id', pssrId)
        .eq('checklist_item_id', checklistItemKey)
        .maybeSingle();

      const overrideData = {
        description_override: editDescription || null,
        responsible_override: editResponsible || null,
        approvers_override: approversStr || null,
        topic_override: editTopic || null,
        updated_by: (await supabase.auth.getUser()).data.user?.id || null,
      };

      if (existing) {
        const { error } = await supabase
          .from('pssr_item_overrides')
          .update(overrideData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pssr_item_overrides')
          .insert({
            pssr_id: pssrId,
            checklist_item_id: checklistItemKey,
            ...overrideData,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Item updated successfully');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['pssr-item-overrides', pssrId, itemId] });
      queryClient.invalidateQueries({ queryKey: ['pssr-delivering-users'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-approving-users'] });
    },
    onError: (err: any) => {
      toast.error('Failed to save: ' + err.message);
    },
  });

  // Reset edit state when sheet closes
  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

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
              <div className="flex items-center justify-between">
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
                {!isEditing ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEditing}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={cancelEditing}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2 mt-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Topic</label>
                    <Input
                      value={editTopic}
                      onChange={e => setEditTopic(e.target.value)}
                      className="h-7 text-xs mt-0.5"
                      placeholder="Topic"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Question / Description</label>
                    <Textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      className="text-xs mt-0.5 min-h-[60px]"
                      placeholder="Item description"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {effectiveTopic && (
                    <p className="text-xs text-muted-foreground mt-1">{effectiveTopic}</p>
                  )}
                  <SheetTitle className="text-base mt-1">{effectiveDescription}</SheetTitle>
                </>
              )}
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
                      {isEditing ? (
                        <RoleCombobox
                          value={editResponsible}
                          onChange={setEditResponsible}
                          roles={allRoles || []}
                          placeholder="Select delivering role..."
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-medium text-muted-foreground w-24 shrink-0 truncate" title={effectiveResponsible || 'Not assigned'}>
                            {effectiveResponsible || 'Not assigned'}
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
                      {isEditing ? (
                        <div className="space-y-2">
                          {editApprovers.map((approverRole, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <div className="flex-1">
                                <RoleCombobox
                                  value={approverRole}
                                  onChange={(val) => {
                                    const updated = [...editApprovers];
                                    updated[idx] = val;
                                    setEditApprovers(updated);
                                  }}
                                  roles={allRoles || []}
                                  placeholder="Select approving role..."
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive shrink-0"
                                onClick={() => setEditApprovers(editApprovers.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={() => setEditApprovers([...editApprovers, ''])}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Approver
                          </Button>
                        </div>
                      ) : (
                        <>
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
                              {effectiveApprovers || 'Not assigned'}
                            </p>
                          )}
                        </>
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
