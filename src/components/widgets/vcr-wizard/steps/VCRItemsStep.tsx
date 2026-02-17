import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

interface VCRItemsStepProps {
  vcrId: string;
}

interface VCRItem {
  id: string;
  vcr_item: string;
  topic: string | null;
  category_id: string | null;
  delivering_party_role_id: string | null;
  approving_party_role_ids: string[] | null;
  display_order: number;
  guidance_notes: string | null;
  supporting_evidence: string | null;
  category?: { id: string; name: string; code: string };
}

interface VCRItemOverride {
  id: string;
  vcr_item_id: string;
  vcr_item_override: string | null;
  topic_override: string | null;
  delivering_party_role_id_override: string | null;
  approving_party_role_ids_override: string[] | null;
  guidance_notes_override: string | null;
}

interface MergedVCRItem extends VCRItem {
  // Effective values (override or original)
  effective_vcr_item: string;
  effective_topic: string | null;
  effective_delivering_party_role_id: string | null;
  effective_approving_party_role_ids: string[] | null;
  effective_guidance_notes: string | null;
  has_overrides: boolean;
  override_id?: string;
}

interface Role {
  id: string;
  name: string;
}

export const VCRItemsStep: React.FC<VCRItemsStepProps> = ({ vcrId }) => {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string> | null>(null);
  const [editingItem, setEditingItem] = useState<MergedVCRItem | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<MergedVCRItem | null>(null);

  // Fetch VCR items with categories
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['vcr-exec-items', vcrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vcr_items')
        .select('*, vcr_item_categories!vcr_items_category_id_fkey(id, name, code)')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        category: item.vcr_item_categories,
      })) as VCRItem[];
    },
  });

  // Fetch per-VCR overrides
  const { data: overrides = [] } = useQuery({
    queryKey: ['vcr-item-overrides', vcrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_vcr_item_overrides')
        .select('*')
        .eq('handover_point_id', vcrId);
      if (error) throw error;
      return (data || []) as VCRItemOverride[];
    },
  });

  // Merge items with overrides
  const mergedItems: MergedVCRItem[] = items.map(item => {
    const override = overrides.find(o => o.vcr_item_id === item.id);
    return {
      ...item,
      effective_vcr_item: override?.vcr_item_override ?? item.vcr_item,
      effective_topic: override?.topic_override !== undefined ? override.topic_override : item.topic,
      effective_delivering_party_role_id: override?.delivering_party_role_id_override !== undefined ? override.delivering_party_role_id_override : item.delivering_party_role_id,
      effective_approving_party_role_ids: override?.approving_party_role_ids_override !== undefined ? override.approving_party_role_ids_override : item.approving_party_role_ids,
      effective_guidance_notes: override?.guidance_notes_override !== undefined ? override.guidance_notes_override : item.guidance_notes,
      has_overrides: !!override,
      override_id: override?.id,
    };
  });

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return (data || []) as Role[];
    },
  });

  // Save override mutation (upsert to overrides table, NOT the master vcr_items)
  const updateItem = useMutation({
    mutationFn: async (payload: { vcr_item_id: string; vcr_item_override: string | null; topic_override: string | null; delivering_party_role_id_override: string | null; approving_party_role_ids_override: string[] | null; guidance_notes_override: string | null }) => {
      const { error } = await supabase
        .from('p2a_vcr_item_overrides')
        .upsert({
          handover_point_id: vcrId,
          vcr_item_id: payload.vcr_item_id,
          vcr_item_override: payload.vcr_item_override,
          topic_override: payload.topic_override,
          delivering_party_role_id_override: payload.delivering_party_role_id_override,
          approving_party_role_ids_override: payload.approving_party_role_ids_override,
          guidance_notes_override: payload.guidance_notes_override,
        }, { onConflict: 'handover_point_id,vcr_item_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-item-overrides', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-items'] });
      toast.success('Item updated (local to this VCR)');
      setEditSheetOpen(false);
      setEditingItem(null);
    },
  });

  // Soft delete mutation (still on master for now - or could be a local exclusion)
  const softDeleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vcr_items')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-items'] });
      toast.success('Item removed');
      setDeleteItem(null);
    },
  });

  // Filter items using effective (overridden) values
  const filtered = mergedItems.filter(item =>
    !searchQuery ||
    item.effective_vcr_item.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.effective_topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, MergedVCRItem[]>>((acc, item) => {
    const cat = item.category?.name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const CATEGORY_ORDER = ['Design Integrity', 'Technical Integrity', 'Operating Integrity', 'Management Systems', 'Health & Safety'];
  const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'Design Integrity': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    'Technical Integrity': { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
    'Operating Integrity': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    'Management Systems': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    'Health & Safety': { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  };
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Default all categories to collapsed on first load
  useEffect(() => {
    if (collapsedCategories === null && sortedCategories.length > 0) {
      setCollapsedCategories(new Set(sortedCategories));
    }
  }, [sortedCategories, collapsedCategories]);

  const effectiveCollapsed = collapsedCategories ?? new Set<string>();

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev ?? []);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const getRoleName = (id: string | null) => {
    if (!id) return '—';
    return roles.find(r => r.id === id)?.name || 'Unknown';
  };

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="shrink-0">{mergedItems.length} items</Badge>
      </div>

      {/* Items grouped by category */}
      <ScrollArea className="h-[calc(min(90vh,780px)-240px)]">
        <div className="space-y-3 pr-4">
          {sortedCategories.map(cat => {
            const catItems = grouped[cat];
            const isCollapsed = effectiveCollapsed.has(cat);

            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-muted/40 rounded transition-colors"
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span className="text-sm font-semibold">{cat}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{catItems.length}</Badge>
                </button>

                {!isCollapsed && (
                  <div className="space-y-1.5 ml-6">
                    {catItems.map((item, idx) => {
                      const catCode = item.category?.code || '??';
                      const itemId = `${catCode}-${String(idx + 1).padStart(2, '0')}`;
                      const catColor = CATEGORY_COLORS[item.category?.name || ''] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };

                      return (
                        <Card key={item.id} className="group hover:border-primary/40 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className={cn("text-[10px] font-mono font-semibold shrink-0 mt-0.5 border", catColor.bg, catColor.text, catColor.border)}>
                                {itemId}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm leading-snug">{item.effective_vcr_item}</p>
                                {item.effective_topic && (
                                  <p className="text-[10px] text-muted-foreground mt-1">Topic: {item.effective_topic}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                  <span>Delivering: <span className="text-foreground font-medium">{getRoleName(item.effective_delivering_party_role_id)}</span></span>
                                  {item.effective_approving_party_role_ids && item.effective_approving_party_role_ids.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {item.effective_approving_party_role_ids.length} approvers
                                    </span>
                                  )}
                                  {item.has_overrides && (
                                    <Badge variant="outline" className="text-[9px] h-4 border-accent text-accent-foreground">Customized</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => { setEditingItem(item); setEditSheetOpen(true); }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteItem(item)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Edit Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Edit VCR Item</SheetTitle>
          </SheetHeader>
          {editingItem && (
            <EditItemForm
              item={editingItem}
              roles={roles}
              projectId={projectId}
              onSave={(payload) => updateItem.mutate(payload)}
              isSaving={updateItem.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove VCR Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item? It can be restored later from management.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && softDeleteItem.mutate(deleteItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Edit Form Component
const AVATAR_BASE = 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/';
const getAvatarUrl = (path: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${AVATAR_BASE}${path}`;
};
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

interface ResolvedUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role_id: string;
}

interface OverridePayload {
  vcr_item_id: string;
  vcr_item_override: string | null;
  topic_override: string | null;
  delivering_party_role_id_override: string | null;
  approving_party_role_ids_override: string[] | null;
  guidance_notes_override: string | null;
}

const EditItemForm: React.FC<{
  item: MergedVCRItem;
  roles: Role[];
  projectId?: string;
  onSave: (payload: OverridePayload) => void;
  isSaving: boolean;
}> = ({ item, roles, projectId, onSave, isSaving }) => {
  const [vcrItem, setVcrItem] = useState(item.effective_vcr_item);
  const [topic, setTopic] = useState(item.effective_topic || '');
  const [deliveringParty, setDeliveringParty] = useState(item.effective_delivering_party_role_id || '');
  const [approvingParties, setApprovingParties] = useState<string[]>(item.effective_approving_party_role_ids || []);
  const [guidanceNotes, setGuidanceNotes] = useState(item.effective_guidance_notes || '');
  const [addApproverOpen, setAddApproverOpen] = useState(false);
  const [approverSearch, setApproverSearch] = useState('');

  // Resolve actual users for all assigned role IDs
  const allRoleIds = [...new Set([deliveringParty, ...approvingParties].filter(Boolean))];

  const { data: resolvedUsers = [] } = useQuery({
    queryKey: ['edit-form-users', allRoleIds.sort().join(','), projectId],
    queryFn: async () => {
      if (allRoleIds.length === 0) return [];
      let candidates: any[] = [];

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
          candidates = profiles || [];
        }
      }

      // Fallback for uncovered roles
      const coveredRoles = new Set(candidates.map((p: any) => p.role));
      const uncovered = allRoleIds.filter(r => !coveredRoles.has(r));
      if (uncovered.length > 0) {
        const { data: fallback } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role, position')
          .in('role', uncovered)
          .eq('is_active', true);
        if (fallback) {
          const filtered = fallback.filter((p: any) => {
            const pos = (p.position || '').toLowerCase();
            return !pos.includes('asset');
          });
          candidates.push(...filtered);
        }
      }

      return candidates.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role_id: p.role,
      })) as ResolvedUser[];
    },
    enabled: allRoleIds.length > 0,
  });

  const getUsersForRole = (roleId: string) => resolvedUsers.filter(u => u.role_id === roleId);
  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || 'Unknown';

  const removeApprover = (roleId: string) => {
    setApprovingParties(prev => prev.filter(r => r !== roleId));
  };

  const availableRolesToAdd = roles.filter(r =>
    !approvingParties.includes(r.id) &&
    r.id !== deliveringParty &&
    (approverSearch === '' || r.name.toLowerCase().includes(approverSearch.toLowerCase()))
  );

  return (
    <ScrollArea className="h-[calc(100vh-100px)]">
      <div className="space-y-5 mt-4 pr-4 pb-4">
        <div>
          <Label>VCR Item Description *</Label>
          <Textarea
            value={vcrItem}
            onChange={(e) => setVcrItem(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>
        <div>
          <Label>Topic</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1" />
        </div>

        {/* Delivering Party */}
        <div>
          <Label>Delivering Party</Label>
          <Select value={deliveringParty} onValueChange={setDeliveringParty}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deliveringParty && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {getUsersForRole(deliveringParty).length > 0 ? (
                getUsersForRole(deliveringParty).map(user => (
                  <div key={user.user_id} className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={getAvatarUrl(user.avatar_url)} />
                      <AvatarFallback className="text-[9px]">{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{user.full_name}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No users assigned to this role</p>
              )}
            </div>
          )}
        </div>

        {/* Approving Parties */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Approving Parties ({approvingParties.length})</Label>
            <Popover open={addApproverOpen} onOpenChange={setAddApproverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <Input
                  placeholder="Search roles..."
                  value={approverSearch}
                  onChange={(e) => setApproverSearch(e.target.value)}
                  className="h-8 text-xs mb-2"
                />
                <ScrollArea className="h-48">
                  <div className="space-y-0.5">
                    {availableRolesToAdd.map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setApprovingParties(prev => [...prev, r.id]);
                          setApproverSearch('');
                        }}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/60 transition-colors"
                      >
                        {r.name}
                      </button>
                    ))}
                    {availableRolesToAdd.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No more roles available</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          {approvingParties.length > 0 ? (
            <div className="space-y-2">
              {approvingParties.map(roleId => {
                const users = getUsersForRole(roleId);
                return (
                  <div key={roleId} className="border rounded-lg p-2.5 group/approver hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{getRoleName(roleId)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover/approver:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => removeApprover(roleId)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    {users.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {users.map(user => (
                          <div key={user.user_id} className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={getAvatarUrl(user.avatar_url)} />
                              <AvatarFallback className="text-[9px]">{getInitials(user.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{user.full_name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">No users assigned</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">No approving parties assigned</p>
            </div>
          )}
        </div>

        <div>
          <Label>Guidance Notes</Label>
          <Textarea
            value={guidanceNotes}
            onChange={(e) => setGuidanceNotes(e.target.value)}
            className="mt-1"
            rows={2}
          />
        </div>
        <Button
          onClick={() => onSave({
            vcr_item_id: item.id,
            vcr_item_override: vcrItem,
            topic_override: topic || null,
            delivering_party_role_id_override: deliveringParty || null,
            approving_party_role_ids_override: approvingParties.length > 0 ? approvingParties : null,
            guidance_notes_override: guidanceNotes || null,
          })}
          disabled={!vcrItem || isSaving}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </ScrollArea>
  );
};
