import React, { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVCRTemplates, VCRTemplate } from '@/hooks/useVCRTemplates';
import { useVCRItems } from '@/hooks/useVCRItems';
import { PACCategory } from '@/hooks/useHandoverPrerequisites';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, CheckSquare, Users } from 'lucide-react';

interface VCRTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: VCRTemplate | null;
  categories: PACCategory[];
}

const VCRTemplateDialog: React.FC<VCRTemplateDialogProps> = ({
  open,
  onOpenChange,
  template,
}) => {
  const { createTemplate, updateTemplate, isCreating, isUpdating } = useVCRTemplates();
  const { data: vcrItems } = useVCRItems();

  const { data: roles } = useQuery({
    queryKey: ['roles-for-vcr-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const [formData, setFormData] = useState({
    summary: '',
    description: '',
  });
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedApproverIds, setSelectedApproverIds] = useState<string[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [approverSearch, setApproverSearch] = useState('');

  useEffect(() => {
    if (template) {
      setFormData({
        summary: template.summary,
        description: template.description || '',
      });
      setSelectedItemIds(template.template_items?.map(i => i.vcr_item_id) || []);
      setSelectedApproverIds(template.template_approvers?.map(a => a.role_id) || []);
    } else {
      setFormData({ summary: '', description: '' });
      setSelectedItemIds([]);
      setSelectedApproverIds([]);
    }
    setItemSearch('');
    setApproverSearch('');
  }, [template, open]);

  const filteredItems = useMemo(() => {
    if (!vcrItems) return [];
    if (!itemSearch) return vcrItems;
    const q = itemSearch.toLowerCase();
    return vcrItems.filter(i =>
      i.vcr_item.toLowerCase().includes(q) ||
      i.category_name?.toLowerCase().includes(q)
    );
  }, [vcrItems, itemSearch]);

  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    if (!approverSearch) return roles;
    const q = approverSearch.toLowerCase();
    return roles.filter(r => r.name.toLowerCase().includes(q));
  }, [roles, approverSearch]);

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleApprover = (id: string) => {
    setSelectedApproverIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      summary: formData.summary,
      description: formData.description || null,
      item_ids: selectedItemIds,
      approver_role_ids: selectedApproverIds,
      display_order: template?.display_order || 0,
      is_active: true,
    };

    if (template) {
      updateTemplate({ id: template.id, ...payload });
    } else {
      createTemplate(payload);
    }
    onOpenChange(false);
  };

  const isSubmitting = isCreating || isUpdating;

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    filteredItems.forEach(item => {
      const cat = item.category_name || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        <DialogHeader className="pt-2 flex-shrink-0">
          <DialogTitle className="text-lg">
            {template ? 'Edit Template' : 'Add Template'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {template
              ? 'Update template details, items, and approvers.'
              : 'Create a new VCR template with selected items and approvers.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden gap-5">
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.summary}
                onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Enter template name"
                className="bg-muted/30 border-border/60 focus:bg-background transition-colors"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">(optional)</span>
              </Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this template..."
                rows={2}
                className="bg-muted/30 border-border/60 focus:bg-background transition-colors resize-none"
              />
            </div>

            {/* VCR Items Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" />
                  VCR Items
                </Label>
                {selectedItemIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedItemIds.length} selected
                  </Badge>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                <div className="p-2 border-b border-border/40">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      placeholder="Search items..."
                      className="h-8 pl-8 text-sm bg-background/60"
                    />
                  </div>
                </div>
                <ScrollArea className="h-44">
                  <div className="p-2 space-y-3">
                    {Object.entries(itemsByCategory).map(([category, items]) => (
                      <div key={category}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1 mb-1">
                          {category}
                        </p>
                        <div className="space-y-0.5">
                          {items.map(item => (
                            <label
                              key={item.id}
                              className={`flex items-start gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
                                selectedItemIds.includes(item.id) ? 'bg-accent/40' : ''
                              }`}
                            >
                              <Checkbox
                                checked={selectedItemIds.includes(item.id)}
                                onCheckedChange={() => toggleItem(item.id)}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <span className="text-xs leading-relaxed line-clamp-2">
                                {item.vcr_item}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {filteredItems.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No items found</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Approvers Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Approvers
                </Label>
                {selectedApproverIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedApproverIds.length} selected
                  </Badge>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                <div className="p-2 border-b border-border/40">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={approverSearch}
                      onChange={e => setApproverSearch(e.target.value)}
                      placeholder="Search roles..."
                      className="h-8 pl-8 text-sm bg-background/60"
                    />
                  </div>
                </div>
                <ScrollArea className="h-36">
                  <div className="p-2 space-y-0.5">
                    {filteredRoles.map(role => (
                      <label
                        key={role.id}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
                          selectedApproverIds.includes(role.id) ? 'bg-accent/40' : ''
                        }`}
                      >
                        <Checkbox
                          checked={selectedApproverIds.includes(role.id)}
                          onCheckedChange={() => toggleApprover(role.id)}
                          className="flex-shrink-0"
                        />
                        <span className="text-xs">{role.name}</span>
                      </label>
                    ))}
                    {filteredRoles.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No roles found</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 bg-muted/20 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.summary.trim()} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : template ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VCRTemplateDialog;
