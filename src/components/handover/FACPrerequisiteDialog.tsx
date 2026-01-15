import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFACPrerequisites, FACPrerequisite } from '@/hooks/useHandoverPrerequisites';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FACPrerequisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prerequisite: FACPrerequisite | null;
}

interface Role {
  id: string;
  name: string;
  category_id: string | null;
}

const FACPrerequisiteDialog: React.FC<FACPrerequisiteDialogProps> = ({
  open,
  onOpenChange,
  prerequisite,
}) => {
  const { createPrerequisite, updatePrerequisite, isCreating, isUpdating } = useFACPrerequisites();
  
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    sample_evidence: '',
    delivering_party_role_id: '',
    receiving_party_role_id: '',
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
        summary: prerequisite.summary,
        description: prerequisite.description || '',
        sample_evidence: prerequisite.sample_evidence || '',
        delivering_party_role_id: prerequisite.delivering_party_role_id || '',
        receiving_party_role_id: prerequisite.receiving_party_role_id || '',
        display_order: prerequisite.display_order,
        is_active: prerequisite.is_active,
      });
    } else {
      setFormData({
        summary: '',
        description: '',
        sample_evidence: '',
        delivering_party_role_id: '',
        receiving_party_role_id: '',
        display_order: 0,
        is_active: true,
      });
    }
  }, [prerequisite, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      delivering_party_role_id: formData.delivering_party_role_id || null,
      receiving_party_role_id: formData.receiving_party_role_id || null,
    };

    if (prerequisite) {
      updatePrerequisite({ id: prerequisite.id, ...data });
    } else {
      createPrerequisite(data);
    }
    onOpenChange(false);
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {prerequisite ? 'Edit FAC Prerequisite' : 'Add New FAC Prerequisite'}
          </DialogTitle>
          <DialogDescription>
            {prerequisite
              ? 'Update the details of this FAC prerequisite'
              : 'Add a new prerequisite for Final Handover'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Input
              id="summary"
              value={formData.summary}
              onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="High-level summary of the prerequisite"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional detailed description of the prerequisite..."
              rows={3}
            />
          </div>

          {/* Sample Evidence */}
          <div className="space-y-2">
            <Label htmlFor="evidence">Sample Evidence Required</Label>
            <Textarea
              id="evidence"
              value={formData.sample_evidence}
              onChange={e => setFormData(prev => ({ ...prev, sample_evidence: e.target.value }))}
              placeholder="Describe the type of evidence required as guidance..."
              rows={3}
            />
          </div>

          {/* Delivering Party */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivering">Delivering Party</Label>
              <Select
                value={formData.delivering_party_role_id}
                onValueChange={value => setFormData(prev => ({ ...prev, delivering_party_role_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
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
              <Label htmlFor="receiving">Receiving Party</Label>
              <Select
                value={formData.receiving_party_role_id}
                onValueChange={value => setFormData(prev => ({ ...prev, receiving_party_role_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {roles?.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Display Order */}
          <div className="space-y-2">
            <Label htmlFor="order">Display Order</Label>
            <Input
              id="order"
              type="number"
              value={formData.display_order}
              onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              min={0}
            />
          </div>

          <DialogFooter>
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

export default FACPrerequisiteDialog;
