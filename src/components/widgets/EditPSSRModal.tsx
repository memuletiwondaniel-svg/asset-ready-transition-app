import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, X } from 'lucide-react';

interface EditPSSRModalProps {
  isOpen: boolean;
  onClose: () => void;
  pssrData: {
    id: string;
    title: string;
    asset: string;
    reason: string;
    projectId: string;
    projectName: string;
    initiator: string;
    scope: string;
  };
  onSave: (data: any) => void;
}

export const EditPSSRModal: React.FC<EditPSSRModalProps> = ({
  isOpen,
  onClose,
  pssrData,
  onSave,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: pssrData.title,
    asset: pssrData.asset,
    reason: pssrData.reason,
    pssrLead: pssrData.initiator,
    scope: pssrData.scope,
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    toast({
      title: 'PSSR Updated',
      description: 'Changes have been saved successfully.',
    });
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-semibold">Edit PSSR Details</SheetTitle>
          <SheetDescription>
            Update the PSSR information below. Changes will be saved when you click Save.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* PSSR ID - Read Only */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">PSSR ID</Label>
            <Input 
              value={pssrData.id} 
              disabled 
              className="bg-muted/50 text-muted-foreground"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter PSSR title"
            />
          </div>

          {/* Asset */}
          <div className="space-y-2">
            <Label htmlFor="asset" className="text-sm font-medium">Asset</Label>
            <Input
              id="asset"
              value={formData.asset}
              onChange={(e) => handleChange('asset', e.target.value)}
              placeholder="Enter asset name"
            />
          </div>

          {/* Project - Read Only */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Project</Label>
            <Input 
              value={`${pssrData.projectId} - ${pssrData.projectName}`} 
              disabled 
              className="bg-muted/50 text-muted-foreground"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">Reason for PSSR</Label>
            <Select value={formData.reason} onValueChange={(value) => handleChange('reason', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border">
                <SelectItem value="Start-up or Commissioning of a new Asset">Start-up or Commissioning of a new Asset</SelectItem>
                <SelectItem value="Re-start after Extended Shutdown">Re-start after Extended Shutdown</SelectItem>
                <SelectItem value="Management of Change">Management of Change</SelectItem>
                <SelectItem value="Process Modification">Process Modification</SelectItem>
                <SelectItem value="Equipment Modification">Equipment Modification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PSSR Lead */}
          <div className="space-y-2">
            <Label htmlFor="pssrLead" className="text-sm font-medium">PSSR Lead</Label>
            <Input
              id="pssrLead"
              value={formData.pssrLead}
              onChange={(e) => handleChange('pssrLead', e.target.value)}
              placeholder="Enter PSSR lead name"
            />
          </div>

          {/* Scope Description */}
          <div className="space-y-2">
            <Label htmlFor="scope" className="text-sm font-medium">Scope Description</Label>
            <Textarea
              id="scope"
              value={formData.scope}
              onChange={(e) => handleChange('scope', e.target.value)}
              placeholder="Enter scope description"
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <SheetFooter className="mt-8 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
