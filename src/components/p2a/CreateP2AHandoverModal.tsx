import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { useP2AHandovers } from '@/hooks/useP2AHandovers';
import { Loader2, Calendar } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

interface CreateP2AHandoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateP2AHandoverModal: React.FC<CreateP2AHandoverModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { projects, isLoading: loadingProjects } = useProjects();
  const { createHandover, isCreating } = useP2AHandovers();
  
  const [formData, setFormData] = useState({
    project_id: '',
    phase: 'PAC' as 'PAC' | 'FAC',
    handover_scope: '',
    pssr_signed_date: undefined as Date | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id) {
      return;
    }

    createHandover({
      project_id: formData.project_id,
      phase: formData.phase,
      handover_scope: formData.handover_scope,
      pssr_signed_date: formData.pssr_signed_date ? format(formData.pssr_signed_date, 'yyyy-MM-dd') : undefined,
      status: 'DRAFT',
      created_by: '', // Will be set by the mutation
    });

    // Reset form
    setFormData({
      project_id: '',
      phase: 'PAC',
      handover_scope: '',
      pssr_signed_date: undefined,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Initiate P2A Handover
          </DialogTitle>
          <DialogDescription>
            Create a new Project to Asset handover workflow
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {loadingProjects ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_id_prefix}-{project.project_id_number} - {project.project_title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Handover Phase */}
          <div className="space-y-2">
            <Label htmlFor="phase">Handover Phase *</Label>
            <Select
              value={formData.phase}
              onValueChange={(value: 'PAC' | 'FAC') => setFormData({ ...formData, phase: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAC">Provisional Acceptance Certificate (PAC)</SelectItem>
                <SelectItem value="FAC">Final Acceptance Certificate (FAC)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PSSR Signed Date */}
          <div className="space-y-2">
            <Label>PSSR Signed Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formData.pssr_signed_date ? format(formData.pssr_signed_date, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={formData.pssr_signed_date}
                  onSelect={(date) => setFormData({ ...formData, pssr_signed_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Handover Scope */}
          <div className="space-y-2">
            <Label htmlFor="scope">Scope of Handover</Label>
            <Textarea
              id="scope"
              placeholder="Describe the scope of this handover..."
              value={formData.handover_scope}
              onChange={(e) => setFormData({ ...formData, handover_scope: e.target.value })}
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.project_id}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Handover'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};