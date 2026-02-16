import React, { useState } from 'react';
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
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

interface Role {
  id: string;
  name: string;
}

export const VCRItemsStep: React.FC<VCRItemsStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<VCRItem | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<VCRItem | null>(null);

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

  // Update item mutation
  const updateItem = useMutation({
    mutationFn: async (item: Partial<VCRItem> & { id: string }) => {
      const { id, category, ...updates } = item as any;
      const { error } = await supabase
        .from('vcr_items')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-items'] });
      toast.success('Item updated');
      setEditSheetOpen(false);
      setEditingItem(null);
    },
  });

  // Soft delete mutation
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

  // Filter items
  const filtered = items.filter(item =>
    !searchQuery ||
    item.vcr_item.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, VCRItem[]>>((acc, item) => {
    const cat = item.category?.name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const CATEGORY_ORDER = ['Design Integrity', 'Technical Integrity', 'Operating Integrity', 'Management Systems', 'Health & Safety'];
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
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
        <Badge variant="outline" className="shrink-0">{items.length} items</Badge>
      </div>

      {/* Items grouped by category */}
      <ScrollArea className="h-[calc(min(90vh,780px)-240px)]">
        <div className="space-y-3 pr-4">
          {sortedCategories.map(cat => {
            const catItems = grouped[cat];
            const isCollapsed = collapsedCategories.has(cat);

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

                      return (
                        <Card key={item.id} className="group hover:border-primary/40 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className="text-[10px] font-mono shrink-0 mt-0.5">
                                {itemId}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm leading-snug">{item.vcr_item}</p>
                                {item.topic && (
                                  <p className="text-[10px] text-muted-foreground mt-1">Topic: {item.topic}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                  <span>Delivering: <span className="text-foreground font-medium">{getRoleName(item.delivering_party_role_id)}</span></span>
                                  {item.approving_party_role_ids && item.approving_party_role_ids.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {item.approving_party_role_ids.length} approvers
                                    </span>
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
              onSave={(updated) => updateItem.mutate(updated)}
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
const EditItemForm: React.FC<{
  item: VCRItem;
  roles: Role[];
  onSave: (item: Partial<VCRItem> & { id: string }) => void;
  isSaving: boolean;
}> = ({ item, roles, onSave, isSaving }) => {
  const [vcrItem, setVcrItem] = useState(item.vcr_item);
  const [topic, setTopic] = useState(item.topic || '');
  const [deliveringParty, setDeliveringParty] = useState(item.delivering_party_role_id || '');
  const [approvingParties, setApprovingParties] = useState<string[]>(item.approving_party_role_ids || []);
  const [guidanceNotes, setGuidanceNotes] = useState(item.guidance_notes || '');

  const toggleApprover = (roleId: string) => {
    setApprovingParties(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="space-y-4 mt-4">
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
      </div>
      <div>
        <Label>Approving Parties ({approvingParties.length} selected)</Label>
        <ScrollArea className="h-40 mt-1 border rounded-md p-2">
          <div className="space-y-1">
            {roles.map(r => (
              <button
                key={r.id}
                onClick={() => toggleApprover(r.id)}
                className={cn(
                  'w-full text-left text-sm px-2 py-1.5 rounded transition-colors',
                  approvingParties.includes(r.id)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted/50 text-muted-foreground'
                )}
              >
                {r.name}
              </button>
            ))}
          </div>
        </ScrollArea>
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
          id: item.id,
          vcr_item: vcrItem,
          topic: topic || null,
          delivering_party_role_id: deliveringParty || null,
          approving_party_role_ids: approvingParties.length > 0 ? approvingParties : null,
          guidance_notes: guidanceNotes || null,
        })}
        disabled={!vcrItem || isSaving}
        className="w-full"
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
};
