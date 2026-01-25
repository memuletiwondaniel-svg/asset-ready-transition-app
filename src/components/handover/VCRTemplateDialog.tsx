import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVCRTemplates, VCRTemplate } from '@/hooks/useVCRTemplates';
import { PACCategory } from '@/hooks/useHandoverPrerequisites';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Info, Users, FolderTree } from 'lucide-react';

interface VCRTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: VCRTemplate | null;
  categories: PACCategory[];
}

interface Role {
  id: string;
  name: string;
  category_id: string | null;
}

const VCRTemplateDialog: React.FC<VCRTemplateDialogProps> = ({
  open,
  onOpenChange,
  template,
  categories,
}) => {
  const { createTemplate, updateTemplate, isCreating, isUpdating } = useVCRTemplates();
  
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    sample_evidence: '',
    delivering_party_role_id: '',
    receiving_party_role_id: '',
    category_id: '',
    display_order: 0,
    is_active: true,
  });

  // Fetch roles
  const { data: roles } = useQuery({
    queryKey: ['roles-for-vcr-templates'],
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
    if (template) {
      setFormData({
        summary: template.summary,
        description: template.description || '',
        sample_evidence: template.sample_evidence || '',
        delivering_party_role_id: template.delivering_party_role_id || '',
        receiving_party_role_id: template.receiving_party_role_id || '',
        category_id: template.category_id || '',
        display_order: template.display_order,
        is_active: template.is_active,
      });
    } else {
      setFormData({
        summary: '',
        description: '',
        sample_evidence: '',
        delivering_party_role_id: '',
        receiving_party_role_id: '',
        category_id: '',
        display_order: 0,
        is_active: true,
      });
    }
  }, [template, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      delivering_party_role_id: formData.delivering_party_role_id || null,
      receiving_party_role_id: formData.receiving_party_role_id || null,
      category_id: formData.category_id || null,
    };

    if (template) {
      updateTemplate({ id: template.id, ...data });
    } else {
      createTemplate(data);
    }
    onOpenChange(false);
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle>
            {template ? 'Edit VCR Template' : 'Add New VCR Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Update the details of this VCR template'
              : 'Add a new VCR template for project handover verification'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Category Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
              <FolderTree className="h-4 w-4" />
              Category
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Category
                  </Label>
                  <Select
                    value={formData.category_id || 'none'}
                    onValueChange={value => setFormData(prev => ({ ...prev, category_id: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="none">None</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Display Order
                  </Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.display_order}
                    onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
              <FileText className="h-4 w-4" />
              Basic Information
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              {/* Summary */}
              <div className="space-y-2">
                <Label htmlFor="summary" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Summary *
                </Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="High-level summary of the VCR requirement"
                  rows={3}
                  required
                />
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
              <Info className="h-4 w-4" />
              Details
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Detailed Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional detailed description of the VCR requirement..."
                  rows={3}
                />
              </div>

              {/* Sample Evidence */}
              <div className="space-y-2">
                <Label htmlFor="evidence" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Sample Evidence Required
                </Label>
                <Textarea
                  id="evidence"
                  value={formData.sample_evidence}
                  onChange={e => setFormData(prev => ({ ...prev, sample_evidence: e.target.value }))}
                  placeholder="Describe the type of evidence required as guidance..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Responsible Parties Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
              <Users className="h-4 w-4" />
              Responsible Parties
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Delivering Party */}
                <div className="space-y-2">
                  <Label htmlFor="delivering" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Delivering Party
                  </Label>
                  <Select
                    value={formData.delivering_party_role_id || 'none'}
                    onValueChange={value => setFormData(prev => ({ ...prev, delivering_party_role_id: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="none">None</SelectItem>
                      {roles?.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Receiving Party */}
                <div className="space-y-2">
                  <Label htmlFor="receiving" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Receiving Party
                  </Label>
                  <Select
                    value={formData.receiving_party_role_id || 'none'}
                    onValueChange={value => setFormData(prev => ({ ...prev, receiving_party_role_id: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="none">None</SelectItem>
                      {roles?.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.summary.trim()}>
              {isSubmitting ? 'Saving...' : template ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VCRTemplateDialog;
