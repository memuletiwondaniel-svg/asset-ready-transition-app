import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { ChecklistItem, useUpdateChecklistItem } from '@/hooks/useChecklistItems';
import { useToast } from '@/hooks/use-toast';
import { useRoles, useCommissions, useDisciplines, useTA2Options, useTopics } from '@/hooks/useRoleData';
import { Save, X, Plus, FileText, Users, Shield } from 'lucide-react';

interface ChecklistItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  mode: 'view' | 'edit';
}

interface TA2Selection {
  commission: string;
  discipline: string;
}

const ChecklistItemDetailModal: React.FC<ChecklistItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  mode: initialMode,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    topic: '',
    supporting_evidence: '',
    responsible_party: '',
  });
  
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [ta2Selections, setTA2Selections] = useState<{[key: string]: TA2Selection}>({});
  const [showTA2Fields, setShowTA2Fields] = useState<{[key: string]: boolean}>({});

  const { toast } = useToast();
  const updateMutation = useUpdateChecklistItem();
  
  // Fetch role data
  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useRoles();
  const { data: commissions = [], isLoading: commissionsLoading, error: commissionsError } = useCommissions();
  const { data: disciplines = [], isLoading: disciplinesLoading, error: disciplinesError } = useDisciplines();
  const { data: topics = [] } = useTopics();
  const { data: ta2Options = [] } = useTA2Options();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (item) {
      setFormData({
        description: item.description || '',
        category: item.category || '',
        topic: item.topic || '',
        supporting_evidence: item.supporting_evidence || '',
        responsible_party: item.responsible_party || '',
      });

      // Parse approvers
      if (item.approving_authority) {
        const approvers = item.approving_authority.split(', ');
        const regularApprovers: string[] = [];
        const ta2Map: {[key: string]: TA2Selection} = {};
        const ta2Fields: {[key: string]: boolean} = {};

        approvers.forEach(approver => {
          if (approver.startsWith('TA2 ')) {
            const match = approver.match(/TA2 ([^(]+) \(([^)]+)\)/);
            if (match) {
              const [, discipline, commission] = match;
              const ta2Key = `TA2-${discipline.trim()}-${commission.trim()}`;
              ta2Map[ta2Key] = {
                discipline: discipline.trim(),
                commission: commission.trim()
              };
              ta2Fields[ta2Key] = true;
              regularApprovers.push('Technical Authority (TA2)');
            }
          } else {
            regularApprovers.push(approver);
          }
        });

        setSelectedApprovers([...new Set(regularApprovers)]);
        setTA2Selections(ta2Map);
        setShowTA2Fields(ta2Fields);
      }
    }
  }, [item]);

  if (!item) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const allApprovers = [...selectedApprovers.filter(a => a !== 'Technical Authority (TA2)')];
    
    // Add TA2 approvers
    Object.entries(ta2Selections).forEach(([key, { discipline, commission }]) => {
      if (discipline && commission && showTA2Fields[key]) {
        allApprovers.push(`TA2 ${discipline} (${commission})`);
      }
    });

    const updateData = {
      description: formData.description,
      category: formData.category,
      topic: formData.topic,
      supporting_evidence: formData.supporting_evidence,
      responsible_party: formData.responsible_party,
      approving_authority: allApprovers.length > 0 ? allApprovers.join(', ') : null,
    };

    updateMutation.mutate(
      { itemId: item.id, updateData },
      {
        onSuccess: () => {
          toast({
            title: "✅ Success",
            description: "Checklist item updated successfully.",
          });
          setMode('view');
        },
        onError: (error) => {
          console.error('Failed to update checklist item:', error);
          toast({
            title: "❌ Error",
            description: "Failed to update checklist item. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleCancel = () => {
    if (mode === 'edit') {
      setMode('view');
      // Reset form data
      setFormData({
        description: item.description || '',
        category: item.category || '',
        topic: item.topic || '',
        supporting_evidence: item.supporting_evidence || '',
        responsible_party: item.responsible_party || '',
      });
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] border-0 p-0 overflow-hidden bg-background/95 backdrop-blur-sm shadow-2xl">
        {/* Fluent Design Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-indigo-500/4 to-purple-500/6"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
          
          <DialogHeader className="relative px-6 py-6 border-b border-border/5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/15 flex items-center justify-center backdrop-blur-sm border border-blue-200/20">
                  {mode === 'edit' ? (
                    <>
                      <Save className="h-6 w-6 text-blue-600" />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent"></div>
                    </>
                  ) : (
                    <>
                      <div className="h-6 w-6 text-blue-600 flex items-center justify-center font-bold text-sm">ID</div>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent"></div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-grow space-y-1">
                <DialogTitle className="text-xl font-semibold text-foreground tracking-tight">
                  {mode === 'edit' ? 'Edit Checklist Item' : 'Checklist Item Details'}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-blue-100/60">
                    <span className="font-medium">ID: {item?.unique_id}</span>
                  </div>
                  {item?.category && (
                    <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-purple-100/60">
                      <span className="text-purple-700 font-medium">{item.category}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  {mode === 'edit' ? 'Modify item specifications and requirements' : 'View comprehensive item information and requirements'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mode === 'view' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMode('edit')}
                    className="h-8 px-3 rounded-lg border-blue-200/60 text-blue-700 hover:bg-blue-50"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[calc(95vh-180px)]">
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="relative">
                <div className="flex items-center gap-3 pb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-200/40">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">Item Specification</h3>
                    <p className="text-xs text-muted-foreground">Core item identification and details</p>
                  </div>
                </div>
                <div className="absolute left-4 top-12 bottom-0 w-px bg-gradient-to-b from-blue-200/60 to-transparent"></div>
              </div>

              {/* Description */}
              <div className="space-y-2 ml-12">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></span>
                  Description
                </Label>
                {mode === 'edit' ? (
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe what needs to be completed..."
                    rows={3}
                    className="resize-none rounded-lg border-border/50 focus:border-blue-500 focus:ring-blue-500/20 bg-gradient-to-br from-blue-50/30 to-transparent"
                  />
                ) : (
                  <div className="p-3 bg-gradient-to-br from-blue-50/40 to-blue-100/40 rounded-lg border border-blue-200/40 text-sm text-foreground">
                    {item.description || 'No description provided'}
                  </div>
                )}
              </div>

              {/* Category and Topic */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 ml-12">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></span>
                    Category
                  </Label>
                  <div className="p-3 bg-gradient-to-br from-purple-50/40 to-purple-100/40 rounded-lg border border-purple-200/40 text-sm text-foreground">
                    {item.category || 'No category specified'}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></span>
                    Topic
                  </Label>
                  {mode === 'edit' ? (
                    <Combobox
                      options={topics || []}
                      value={formData.topic}
                      onValueChange={(value) => handleInputChange('topic', value)}
                      placeholder="Select or enter topic..."
                      searchPlaceholder="Search topics..."
                    />
                  ) : (
                    <div className="p-3 bg-gradient-to-br from-green-50/40 to-green-100/40 rounded-lg border border-green-200/40 text-sm text-foreground">
                      {item.topic || 'No topic specified'}
                    </div>
                  )}
                </div>
              </div>

              {/* Supporting Evidence */}
              <div className="space-y-2 ml-12">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></span>
                  Supporting Evidence
                </Label>
                {mode === 'edit' ? (
                  <Textarea
                    value={formData.supporting_evidence}
                    onChange={(e) => handleInputChange('supporting_evidence', e.target.value)}
                    placeholder="Describe required evidence or documentation..."
                    rows={2}
                    className="resize-none rounded-lg border-border/50 focus:border-orange-500 focus:ring-orange-500/20 bg-gradient-to-br from-orange-50/30 to-transparent"
                  />
                ) : (
                  <div className="p-3 bg-gradient-to-br from-orange-50/40 to-orange-100/40 rounded-lg border border-orange-200/40 text-sm text-foreground">
                    {item.supporting_evidence || 'No supporting evidence specified'}
                  </div>
                )}
              </div>
            </div>

            {/* Assignments Section */}
            <div className="space-y-4">
              <div className="relative">
                <div className="flex items-center gap-3 pb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-200/40">
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">Assignments</h3>
                    <p className="text-xs text-muted-foreground">Responsibilities and approvals</p>
                  </div>
                </div>
                <div className="absolute left-4 top-12 bottom-0 w-px bg-gradient-to-b from-emerald-200/60 to-transparent"></div>
              </div>

              {/* Responsible Party */}
              <div className="space-y-2 ml-12">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></span>
                  Responsible Party
                </Label>
                <div className="p-3 bg-gradient-to-br from-emerald-50/40 to-emerald-100/40 rounded-lg border border-emerald-200/40 text-sm text-foreground">
                  {item.responsible_party || 'No responsible party assigned'}
                </div>
              </div>

              {/* Approving Authority */}
              <div className="space-y-2 ml-12">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full"></span>
                  Approving Authority
                </Label>
                {item.approving_authority ? (
                  <div className="space-y-2">
                    {item.approving_authority.split(', ').map((approver, index) => (
                      <div key={index} className="p-2 bg-gradient-to-br from-indigo-50/40 to-indigo-100/40 rounded-lg border border-indigo-200/40">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3 text-indigo-600" />
                          <span className="text-sm text-indigo-800 font-medium">{approver}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-gradient-to-br from-indigo-50/40 to-indigo-100/40 rounded-lg border border-indigo-200/40 text-sm text-foreground">
                    No approving authority specified
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative border-t border-border/10 bg-gradient-to-r from-slate-50/60 via-white/80 to-slate-50/60 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/30 to-transparent"></div>
          
          <div className="p-4 flex gap-3 justify-end">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleCancel}
              className="h-9 px-4 rounded-lg border-border/50 hover:bg-slate-100/60 transition-all duration-200 text-sm"
            >
              {mode === 'edit' ? 'Cancel' : 'Close'}
            </Button>
            {mode === 'edit' && (
              <Button 
                type="button"
                onClick={handleSave} 
                disabled={updateMutation.isPending}
                className="h-9 px-6 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/20 transition-all duration-200 text-sm font-medium"
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white mr-2"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-2" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistItemDetailModal;