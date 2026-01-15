import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePACPrerequisites, PACPrerequisite, PACCategory } from '@/hooks/useHandoverPrerequisites';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { FileText, Info, Users } from 'lucide-react';

interface PACPrerequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prerequisite: PACPrerequisite | null;
  categories: PACCategory[];
}

interface Role {
  id: string;
  name: string;
  category_id: string | null;
}

const PACPrerequisiteDialog: React.FC<PACPrerequisiteDialogProps> = ({
  open,
  onOpenChange,
  prerequisite,
  categories,
}) => {
  const { createPrerequisite, updatePrerequisite, syncDeliveringParties, syncReceivingParties, isCreating, isUpdating } = usePACPrerequisites();
  
  const [formData, setFormData] = useState({
    category_id: '',
    summary: '',
    description: '',
    sample_evidence: '',
    delivering_party_ids: [] as string[],
    receiving_party_ids: [] as string[],
    display_order: 0,
    is_active: true,
  });

  // Fetch roles
  const { data: roles } = useQuery({
    queryKey: ['roles-for-prerequisites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, category_id')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Role[];
    },
  });

  useEffect(() => {
    if (prerequisite) {
      setFormData({
        category_id: prerequisite.category_id,
        summary: prerequisite.summary,
        description: prerequisite.description || '',
        sample_evidence: prerequisite.sample_evidence || '',
        delivering_party_ids: prerequisite.delivering_parties?.map(p => p.id) || [],
        receiving_party_ids: prerequisite.receiving_parties?.map(p => p.id) || [],
        display_order: prerequisite.display_order,
        is_active: prerequisite.is_active,
      });
    } else {
      setFormData({
        category_id: categories[0]?.id || '',
        summary: '',
        description: '',
        sample_evidence: '',
        delivering_party_ids: [],
        receiving_party_ids: [],
        display_order: 0,
        is_active: true,
      });
    }
  }, [prerequisite, categories, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      category_id: formData.category_id,
      summary: formData.summary,
      description: formData.description || null,
      sample_evidence: formData.sample_evidence || null,
      display_order: formData.display_order,
      is_active: formData.is_active,
      // Keep legacy single fields null since we use junction tables now
      delivering_party_role_id: null,
      receiving_party_role_id: null,
    };

    if (prerequisite) {
      // Update existing prerequisite
      updatePrerequisite({ id: prerequisite.id, ...data });
      // Sync parties after update
      await syncDeliveringParties(prerequisite.id, formData.delivering_party_ids);
      await syncReceivingParties(prerequisite.id, formData.receiving_party_ids);
    } else {
      // For create, we need to get the ID after creation - handled in the hook
      createPrerequisite({
        ...data,
        delivering_party_ids: formData.delivering_party_ids,
        receiving_party_ids: formData.receiving_party_ids,
      } as any);
    }
    onOpenChange(false);
  };

  const isSubmitting = isCreating || isUpdating;

  const roleOptions = roles?.map(role => ({ value: role.id, label: role.name })) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {prerequisite ? 'Edit Prerequisite' : 'Add New Prerequisite'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {prerequisite
              ? 'Update the details of this PAC prerequisite'
              : 'Add a new prerequisite for Provisional Handover'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="uppercase tracking-wide">Basic Information</span>
            </div>
            
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Category *
                  </Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={value => setFormData(prev => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Display Order */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Display Order
                  </Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    min={0}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Summary *
                </Label>
                <Input
                  value={formData.summary}
                  onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="High-level summary of the prerequisite"
                  required
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="h-4 w-4" />
              <span className="uppercase tracking-wide">Details</span>
            </div>
            
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Description <span className="text-muted-foreground/60">(Optional)</span>
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional detailed description of the prerequisite..."
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>

              {/* Sample Evidence */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sample Evidence
                </Label>
                <Textarea
                  value={formData.sample_evidence}
                  onChange={e => setFormData(prev => ({ ...prev, sample_evidence: e.target.value }))}
                  placeholder="Describe the type of evidence required as guidance..."
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>
            </div>
          </div>

          {/* Responsible Parties Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="uppercase tracking-wide">Responsible Parties</span>
            </div>
            
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              {/* Delivering Parties */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Delivering Parties
                </Label>
                <MultiSelectCombobox
                  options={roleOptions}
                  selectedValues={formData.delivering_party_ids}
                  onValueChange={(values) => setFormData(prev => ({ ...prev, delivering_party_ids: values }))}
                  placeholder="Select delivering parties..."
                  searchPlaceholder="Search roles..."
                  emptyText="No roles found."
                />
              </div>

              {/* Receiving Parties */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Receiving Parties
                </Label>
                <MultiSelectCombobox
                  options={roleOptions}
                  selectedValues={formData.receiving_party_ids}
                  onValueChange={(values) => setFormData(prev => ({ ...prev, receiving_party_ids: values }))}
                  placeholder="Select receiving parties..."
                  searchPlaceholder="Search roles..."
                  emptyText="No roles found."
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.summary.trim()}>
              {isSubmitting ? 'Saving...' : prerequisite ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PACPrerequisiteDialog;
