import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Combobox, MultiSelectCombobox, ComboboxOption } from '@/components/ui/combobox';
import { Users, Shield, Save, User, Edit3, FileText, X, Hash, MessageSquare, AlertCircle } from 'lucide-react';
import { ChecklistItem, useUpdateChecklistItem, UpdateChecklistItemData } from '@/hooks/useChecklistItems';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  mode: 'view' | 'edit';
  onSaveComplete?: () => void;
}

const ChecklistItemModal: React.FC<ChecklistItemModalProps> = ({
  isOpen,
  onClose,
  item,
  mode: initialMode,
  onSaveComplete,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [formData, setFormData] = useState<UpdateChecklistItemData>({});
  const [selectedResponsibleParty, setSelectedResponsibleParty] = useState<string>('');
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { users } = useUsers();
  const { mutate: updateChecklistItem, isPending } = useUpdateChecklistItem();

  const categories = [
    'General', 'Process Safety', 'Organization', 'Health & Safety', 'Emergency Response',
    'PACO', 'Static', 'Rotating', 'Civil', 'Electrical', 'Documentation'
  ];

  const responsiblePartyOptions: ComboboxOption[] = [
    { value: 'Area Engineer', label: 'Area Engineer (Default Role)' },
    { value: 'Process Engineer', label: 'Process Engineer (Default Role)' },
    ...users.filter(user => user.status === 'active').map(user => ({
      value: `${user.firstName} ${user.lastName}`,
      label: `${user.firstName} ${user.lastName} - ${user.role}`
    }))
  ];

  const approverOptions: ComboboxOption[] = [
    { value: 'Area Authority', label: 'Area Authority (Default Role)' },
    { value: 'Process Authority', label: 'Process Authority (Default Role)' },
    ...users.filter(user => user.status === 'active').map(user => ({
      value: `${user.firstName} ${user.lastName}`,
      label: `${user.firstName} ${user.lastName} - ${user.role}`
    }))
  ];

  useEffect(() => {
    if (item) {
      setFormData({
        description: item.description,
        category: item.category,
        topic: item.topic || '',
        required_evidence: item.required_evidence || '',
      });
      setSelectedResponsibleParty(item.responsible || '');
      setSelectedApprovers(item.Approver ? item.Approver.split(', ') : []);
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;
    
    const updateData: UpdateChecklistItemData = {
      ...formData,
      responsible: selectedResponsibleParty || null,
      Approver: selectedApprovers.join(', ') || null,
    };

    updateChecklistItem(
      { itemId: item.unique_id || item.id, updateData },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Checklist item updated successfully." });
          setMode('view');
          onSaveComplete?.();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update item.", variant: "destructive" });
        }
      }
    );
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] border-0 p-0 overflow-hidden bg-transparent">
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-card/85 backdrop-blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          <DialogHeader className="p-6 pb-4 border-b border-border/20">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="font-mono text-base px-4 py-2">
                    {item.unique_id || item.id}
                  </Badge>
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {item.category}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-bold">
                  {mode === 'edit' ? 'Edit Checklist Item' : 'Checklist Item Details'}
                </DialogTitle>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
                  className="gap-2"
                >
                  {mode === 'edit' ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                  {mode === 'edit' ? 'Cancel' : 'Edit'}
                </Button>
                {mode === 'edit' && (
                  <Button size="sm" onClick={handleSave} disabled={isPending} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-6">
                {/* Unique ID */}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Unique ID
                  </Label>
                  <div className="p-4 bg-card rounded-xl border">
                    <p className="font-mono text-lg">{item.unique_id || item.id}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Description
                  </Label>
                  {mode === 'edit' ? (
                    <Textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description..."
                      rows={3}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <div className="p-5 bg-card rounded-xl border">
                      <p className="leading-relaxed">{item.description}</p>
                    </div>
                  )}
                </div>

                {/* Category & Topic */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Category
                    </Label>
                    {mode === 'edit' ? (
                      <Select 
                        value={formData.category || ''} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-4 bg-card rounded-xl border">
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Topic
                    </Label>
                    {mode === 'edit' ? (
                      <Input
                        value={formData.topic || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                        placeholder="Enter topic..."
                      />
                    ) : (
                      <div className="p-4 bg-card rounded-xl border">
                        <p>{item.topic || 'No topic specified'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Required Evidence */}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Required Evidence
                  </Label>
                  {mode === 'edit' ? (
                    <Textarea
                      value={formData.required_evidence || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, required_evidence: e.target.value }))}
                      placeholder="Enter required evidence..."
                      rows={3}
                    />
                  ) : (
                    <div className="p-5 bg-card rounded-xl border">
                      <p>{item.required_evidence || 'No evidence requirements specified'}</p>
                    </div>
                  )}
                </div>

                {/* Responsible & Approver */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Responsible
                    </Label>
                    {mode === 'edit' ? (
                      <Combobox
                        options={responsiblePartyOptions}
                        value={selectedResponsibleParty}
                        onValueChange={setSelectedResponsibleParty}
                        placeholder="Select responsible party..."
                      />
                    ) : (
                      <div className="p-4 bg-card rounded-xl border">
                        <p>{item.responsible || 'No responsible party assigned'}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Approver
                    </Label>
                    {mode === 'edit' ? (
                      <MultiSelectCombobox
                        value={selectedApprovers}
                        onValueChange={setSelectedApprovers}
                        options={approverOptions}
                        placeholder="Select approvers..."
                      />
                    ) : (
                      <div className="p-4 bg-card rounded-xl border">
                        <p>{item.Approver || 'No approver assigned'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistItemModal;