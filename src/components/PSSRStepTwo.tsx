import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  ClipboardCheck, 
  AlertCircle,
  FileText,
  X,
  Plus,
  Info,
  CheckSquare,
  Square,
  ArrowLeft,
  ArrowRight,
  Edit,
  ChevronDown,
  ChevronUp,
  Trash2,
  Upload,
  Users,
  Save,
  Eye,
  EyeOff,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { ChecklistItem, useChecklistItems } from '@/hooks/useChecklistItems';
import CreateCustomChecklistItem from './CreateCustomChecklistItem';

interface FormData {
  asset: string;
  reason: string;
  projectId: string;
  projectName: string;
  scope: string;
  files: File[];
  teamMembers: {
    technicalAuthorities: any;
    assetTeam: any;
    projectTeam: any;
    hsse: any;
  };
}

interface ChecklistItemWithStatus extends ChecklistItem {
  id: string; // Override id for compatibility
  supportingEvidence?: string; // Override for compatibility
  approvingAuthority?: string; // Override for compatibility
  status: 'draft' | 'selected' | 'not_applicable';
  naJustification?: string;
  naDocuments?: File[];
  customApprovers?: string[];
}

interface PSSRStepTwoProps {
  formData: FormData;
  onBack: () => void;
  onContinueToChecklist: () => void;
}

const PSSRStepTwo: React.FC<PSSRStepTwoProps> = ({ formData, onBack, onContinueToChecklist }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'id' | 'description'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSelected, setShowSelected] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemWithStatus[]>([]);
  const { data: allChecklistItems = [], isLoading } = useChecklistItems();
  const [showNAModal, setShowNAModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<ChecklistItemWithStatus | null>(null);
  const [naJustification, setNaJustification] = useState('');
  const [naDocuments, setNaDocuments] = useState<File[]>([]);
  const [customApprovers, setCustomApprovers] = useState<string[]>([]);
  const [showAddFromPoolModal, setShowAddFromPoolModal] = useState(false);
  const [showCreateCustomModal, setShowCreateCustomModal] = useState(false);
  const [poolSearchTerm, setPoolSearchTerm] = useState('');
  const [poolSelectedCategory, setPoolSelectedCategory] = useState('all');

  // Auto-assign checklist based on PSSR reason
  const getAssignedChecklist = () => {
    const reason = formData.reason;
    
    // Define which categories to include based on reason
    let includedCategories: string[] = [];
    
    switch (reason) {
      case 'Start-up or Commissioning of a new Asset':
        includedCategories = ['General', 'Technical Integrity', 'Start-Up Readiness', 'Health & Safety'];
        break;
      case 'Restart following significant modification to existing Hardware, Safeguarding or Operating Philosophy':
        includedCategories = ['General', 'Technical Integrity', 'Health & Safety'];
        break;
      case 'Restart following a process safety incident':
        includedCategories = ['General', 'Technical Integrity', 'Health & Safety'];
        break;
      case 'Restart following a Turn Around (TAR) Event or Major Maintenance Activity':
        includedCategories = ['General', 'Technical Integrity', 'Start-Up Readiness', 'Health & Safety'];
        break;
      default:
        includedCategories = ['General', 'Technical Integrity', 'Health & Safety'];
    }

    return allChecklistItems
      .filter(item => includedCategories.includes(item.category))
      .map(item => ({
        ...item,
        id: item.unique_id, // Use unique_id as id for compatibility
        supportingEvidence: item.required_evidence || '',
        approvingAuthority: item.Approver || '',
        status: 'draft' as const,
        customApprovers: (item.Approver || '').split(', ').filter(Boolean)
      }));
  };

  // Initialize checklist items on component mount
  React.useEffect(() => {
    if (allChecklistItems.length > 0) {
      const assignedItems = getAssignedChecklist();
      setChecklistItems(assignedItems);
    }
  }, [formData.reason, allChecklistItems]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(checklistItems.map(item => item.category)));
    return ['all', ...cats];
  }, [checklistItems]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = checklistItems.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesVisibility = !showSelected || item.status === 'selected';
      
      return matchesSearch && matchesCategory && matchesVisibility;
    });

    // Sort items
    filtered.sort((a, b) => {
      let aValue = sortBy === 'id' ? a.id : a.description;
      let bValue = sortBy === 'id' ? b.id : b.description;
      
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [checklistItems, searchTerm, selectedCategory, sortBy, sortOrder, showSelected]);

  // Get statistics
  const getStats = () => {
    const total = checklistItems.length;
    const selected = checklistItems.filter(item => item.status === 'selected').length;
    const notApplicable = checklistItems.filter(item => item.status === 'not_applicable').length;
    const draft = checklistItems.filter(item => item.status === 'draft').length;
    
    return { total, selected, notApplicable, draft };
  };

  const stats = getStats();

  // Handle item selection
  const handleItemSelection = (itemId: string, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, itemId]);
      setChecklistItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, status: 'selected' } : item
      ));
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
      setChecklistItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, status: 'draft' } : item
      ));
    }
  };

  // Handle Select All
  const handleSelectAll = () => {
    const draftItems = filteredItems.filter(item => item.status === 'draft');
    const draftIds = draftItems.map(item => item.id);
    
    setSelectedItems(prev => [...new Set([...prev, ...draftIds])]);
    setChecklistItems(prev => prev.map(item => 
      draftIds.includes(item.id) ? { ...item, status: 'selected' } : item
    ));
    
    toast({ title: `Selected ${draftItems.length} items` });
  };

  // Handle Deselect All
  const handleDeselectAll = () => {
    const selectedInView = filteredItems.filter(item => item.status === 'selected').map(item => item.id);
    
    setSelectedItems(prev => prev.filter(id => !selectedInView.includes(id)));
    setChecklistItems(prev => prev.map(item => 
      selectedInView.includes(item.id) ? { ...item, status: 'draft' } : item
    ));
    
    toast({ title: 'All items deselected from current view' });
  };

  // Get items not already in the checklist
  const getAvailablePoolItems = () => {
    const currentItemIds = checklistItems.map(item => item.unique_id);
    return allChecklistItems
      .filter(item => !currentItemIds.includes(item.unique_id))
      .map(item => ({
        ...item,
        id: item.unique_id,
        supportingEvidence: item.required_evidence || '',
        approvingAuthority: item.Approver || '',
        status: 'draft' as const,
        customApprovers: (item.Approver || '').split(', ').filter(Boolean)
      }));
  };

  // Filter pool items
  const getFilteredPoolItems = () => {
    const poolItems = getAvailablePoolItems();
    return poolItems.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(poolSearchTerm.toLowerCase()) ||
                           item.id.toLowerCase().includes(poolSearchTerm.toLowerCase());
      const matchesCategory = poolSelectedCategory === 'all' || item.category === poolSelectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  // Add items from pool
  const handleAddFromPool = (itemIds: string[]) => {
    const poolItems = getAvailablePoolItems();
    const itemsToAdd = poolItems.filter(item => itemIds.includes(item.id));
    
    setChecklistItems(prev => [...prev, ...itemsToAdd]);
    setShowAddFromPoolModal(false);
    toast({ title: `Added ${itemsToAdd.length} item(s) from pool` });
  };

  // Add custom item
  const handleAddCustomItem = (itemData: any) => {
    const newItem: ChecklistItemWithStatus = {
      id: itemData.unique_id || `CUSTOM-${Date.now()}`,
      unique_id: itemData.unique_id || `CUSTOM-${Date.now()}`,
      description: itemData.description,
      required_evidence: itemData.evidenceGuidance || '',
      category: itemData.category,
      Approver: itemData.approver?.join(', ') || '',
      approving_authority: itemData.approver?.join(', ') || '',
      responsible_party: itemData.responsible?.join(', ') || '',
      topic: itemData.topic || '',
      is_active: true,
      created_at: itemData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      status: 'selected',
      supportingEvidence: itemData.evidenceGuidance || '',
      approvingAuthority: itemData.approver?.join(', ') || '',
      customApprovers: itemData.approver || []
    };
    
    setChecklistItems(prev => [...prev, newItem]);
    setSelectedItems(prev => [...prev, newItem.id]);
    toast({ title: 'Custom checklist item added to this PSSR' });
  };

  // Handle Not Applicable
  const handleNotApplicable = (item: ChecklistItemWithStatus) => {
    setCurrentItem(item);
    setNaJustification(item.naJustification || '');
    setNaDocuments(item.naDocuments || []);
    setShowNAModal(true);
  };

  // Save Not Applicable justification
  const saveNotApplicable = () => {
    if (!currentItem || !naJustification.trim()) {
      toast({ title: 'Please provide justification for Not Applicable', variant: 'destructive' });
      return;
    }

    setChecklistItems(prev => prev.map(item => 
      item.id === currentItem.id 
        ? { 
            ...item, 
            status: 'not_applicable',
            naJustification,
            naDocuments: [...naDocuments]
          } 
        : item
    ));

    setSelectedItems(prev => prev.filter(id => id !== currentItem.id));
    setShowNAModal(false);
    setNaJustification('');
    setNaDocuments([]);
    setCurrentItem(null);
    
    toast({ title: 'Item marked as Not Applicable' });
  };

  // Handle Edit Item
  const handleEditItem = (item: ChecklistItemWithStatus) => {
    setCurrentItem(item);
    setCustomApprovers(item.customApprovers || (item.approvingAuthority || item.approving_authority || '').split(', '));
    setShowEditModal(true);
  };

  // Save edited item
  const saveEditedItem = () => {
    if (!currentItem) return;

    setChecklistItems(prev => prev.map(item => 
      item.id === currentItem.id 
        ? { ...item, customApprovers: [...customApprovers] }
        : item
    ));

    setShowEditModal(false);
    setCustomApprovers([]);
    setCurrentItem(null);
    
    toast({ title: 'Checklist item updated' });
  };

  // Handle file upload for NA documents
  const handleNAFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setNaDocuments(prev => [...prev, ...files]);
  };

  // Remove NA document
  const removeNADocument = (index: number) => {
    setNaDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Add custom approver
  const addCustomApprover = () => {
    setCustomApprovers(prev => [...prev, '']);
  };

  // Update custom approver
  const updateCustomApprover = (index: number, value: string) => {
    setCustomApprovers(prev => prev.map((approver, i) => i === index ? value : approver));
  };

  // Remove custom approver
  const removeCustomApprover = (index: number) => {
    setCustomApprovers(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header with auto-assignment notification */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Checklist Auto-Assigned</h3>
              <p className="text-sm text-blue-700">
                Based on your selected reason "{formData.reason}", a checklist with {checklistItems.length} items has been automatically assigned.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.selected}</div>
            <div className="text-sm text-gray-600">Selected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.notApplicable}</div>
            <div className="text-sm text-gray-600">Not Applicable</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <div className="text-sm text-gray-600">Draft</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardCheck className="h-5 w-5 mr-2" />
            PSSR Checklist Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search checklist items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as 'id' | 'description');
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="id-asc">ID (A-Z)</SelectItem>
                <SelectItem value="id-desc">ID (Z-A)</SelectItem>
                <SelectItem value="description-asc">Description (A-Z)</SelectItem>
                <SelectItem value="description-desc">Description (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            {/* Show Selected Only */}
            <Button
              variant={showSelected ? "default" : "outline"}
              onClick={() => setShowSelected(!showSelected)}
              className="flex items-center space-x-2"
            >
              {showSelected ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>Selected Only</span>
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleSelectAll}
              disabled={filteredItems.filter(item => item.status === 'draft').length === 0}
              className="flex items-center space-x-2"
            >
              <CheckSquare className="h-4 w-4" />
              <span>Select All</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleDeselectAll}
              disabled={filteredItems.filter(item => item.status === 'selected').length === 0}
              className="flex items-center space-x-2"
            >
              <Square className="h-4 w-4" />
              <span>Deselect All</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddFromPoolModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add from Pool</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCreateCustomModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Custom Item</span>
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {stats.selected + stats.notApplicable}/{stats.total} completed</span>
              <span>{Math.round(((stats.selected + stats.notApplicable) / stats.total) * 100)}%</span>
            </div>
            <Progress value={((stats.selected + stats.notApplicable) / stats.total) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items by Category */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="all" className="text-xs">All ({checklistItems.length})</TabsTrigger>
              {categories.slice(1).map(category => {
                const count = checklistItems.filter(item => item.category === category).length;
                return (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    {category} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={selectedCategory} className="p-6">
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className={`border-l-4 ${
                    item.status === 'selected' 
                      ? 'border-l-green-500 bg-green-50' 
                      : item.status === 'not_applicable'
                      ? 'border-l-gray-500 bg-gray-50 opacity-75'
                      : 'border-l-blue-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {item.status !== 'not_applicable' && (
                            <Checkbox
                              checked={item.status === 'selected'}
                              onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                              className="mt-1"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline">{item.id}</Badge>
                              <Badge variant="secondary">{item.category}</Badge>
                              {item.status === 'selected' && <Badge className="bg-green-100 text-green-800">Selected</Badge>}
                              {item.status === 'not_applicable' && <Badge className="bg-gray-100 text-gray-800">Not Applicable</Badge>}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                            {(item.supportingEvidence || item.supporting_evidence) && (
                              <p className="text-xs text-gray-500">
                                <strong>Supporting Evidence:</strong> {item.supportingEvidence || item.supporting_evidence}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              <strong>Approvers:</strong> {item.customApprovers?.join(', ') || item.approvingAuthority || item.approving_authority || ''}
                            </p>
                            {item.status === 'not_applicable' && item.naJustification && (
                              <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                <strong>NA Justification:</strong> {item.naJustification}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {item.status !== 'not_applicable' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNotApplicable(item)}
                            >
                              N/A
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredItems.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No checklist items match your current filters.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to PSSR Information</span>
        </Button>
        
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>
          <Button onClick={onContinueToChecklist} className="flex items-center space-x-2">
            <span>Review PSSR Approvers</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Not Applicable Modal */}
      <Dialog open={showNAModal} onOpenChange={setShowNAModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark Item as Not Applicable</DialogTitle>
          </DialogHeader>
          
          {currentItem && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <Badge variant="outline" className="mb-2">{currentItem.id}</Badge>
                <p className="text-sm">{currentItem.description}</p>
              </div>

              <div>
                <Label>Justification *</Label>
                <Textarea
                  value={naJustification}
                  onChange={(e) => setNaJustification(e.target.value)}
                  placeholder="Provide justification for why this item is not applicable..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Supporting Documents (Optional)</Label>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('na-file-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                  <input
                    id="na-file-upload"
                    type="file"
                    onChange={handleNAFileUpload}
                    multiple
                    className="hidden"
                  />
                </div>

                {naDocuments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {naDocuments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNADocument(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowNAModal(false)}>
                  Cancel
                </Button>
                <Button onClick={saveNotApplicable}>
                  Save as Not Applicable
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Checklist Item</DialogTitle>
          </DialogHeader>
          
          {currentItem && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <Badge variant="outline" className="mb-2">{currentItem.id}</Badge>
                <p className="text-sm">{currentItem.description}</p>
              </div>

              <div>
                <Label className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Custom Approvers</span>
                </Label>
                <p className="text-xs text-gray-500 mb-3">
                  Modify the approving authorities for this specific PSSR item (does not affect master checklist)
                </p>
                
                <div className="space-y-2">
                  {customApprovers.map((approver, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={approver}
                        onChange={(e) => updateCustomApprover(index, e.target.value)}
                        placeholder="Enter approver role/name"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomApprover(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomApprover}
                  >
                    Add Approver
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add from Pool Modal */}
      <Dialog open={showAddFromPoolModal} onOpenChange={setShowAddFromPoolModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Checklist Items from Pool</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search available items..."
                  value={poolSearchTerm}
                  onChange={(e) => setPoolSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={poolSelectedCategory} onValueChange={setPoolSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.slice(1).map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getFilteredPoolItems().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items available in the pool
                </div>
              ) : (
                getFilteredPoolItems().map((item) => (
                  <Card key={item.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={`pool-${item.id}`}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleAddFromPool([item.id]);
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline">{item.id}</Badge>
                          <Badge variant="secondary">{item.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-700">{item.description}</p>
                        {item.supportingEvidence && (
                          <p className="text-xs text-gray-500 mt-1">Evidence: {item.supportingEvidence}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddFromPoolModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Custom Item - Full Page Overlay */}
      {showCreateCustomModal && (
        <CreateCustomChecklistItem
          pssrId={formData.projectId || 'DRAFT'}
          onClose={() => setShowCreateCustomModal(false)}
          onSave={handleAddCustomItem}
        />
      )}
    </div>
  );
};

export default PSSRStepTwo;