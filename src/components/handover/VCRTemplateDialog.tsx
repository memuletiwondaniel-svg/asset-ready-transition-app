import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVCRTemplates, VCRTemplate } from '@/hooks/useVCRTemplates';
import { PACCategory } from '@/hooks/useHandoverPrerequisites';
import { Loader2 } from 'lucide-react';

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
  categories,
}) => {
  const { createTemplate, updateTemplate, isCreating, isUpdating } = useVCRTemplates();
  
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
  });

  useEffect(() => {
    if (template) {
      setFormData({
        summary: template.summary,
        description: template.description || '',
      });
    } else {
      setFormData({
        summary: '',
        description: '',
      });
    }
  }, [template, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      summary: formData.summary,
      description: formData.description || null,
      sample_evidence: template?.sample_evidence || '',
      delivering_party_role_id: template?.delivering_party_role_id || null,
      receiving_party_role_id: template?.receiving_party_role_id || null,
      category_id: template?.category_id || null,
      display_order: template?.display_order || 0,
      is_active: template?.is_active ?? true,
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
      <DialogContent className="max-w-md">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        <DialogHeader className="pt-2">
          <DialogTitle className="text-lg">
            {template ? 'Edit Template' : 'Add Template'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {template
              ? 'Update the template details below.'
              : 'Create a new VCR template for handover verification.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="summary" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="summary"
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
            <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this template..."
              rows={3}
              className="bg-muted/30 border-border/60 focus:bg-background transition-colors resize-none"
            />
          </div>

          <DialogFooter className="border-t pt-4 bg-muted/20 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
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
