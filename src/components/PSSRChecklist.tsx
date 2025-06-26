
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  AlertTriangle,
  Users,
  Award,
  Target,
  Shield,
  Cog,
  ThumbsUp,
  MessageSquare,
  Paperclip,
  ArrowRight,
  Save
} from 'lucide-react';
import { pssrChecklistData, checklistCategories, ChecklistItem } from '@/data/pssrChecklistData';
import ChecklistItemDetailModal from './ChecklistItemDetailModal';

interface ChecklistItemStatus {
  id: string;
  status: 'DRAFT' | 'UNDER REVIEW' | 'APPROVED' | 'NOT APPLICABLE';
  response?: 'N/A' | 'YES' | 'NO';
  data?: any;
}

interface PSSRChecklistProps {
  onSaveDraft?: () => void;
}

// Mock approver data with avatars
const getApprovers = (approvingAuthority: string) => {
  const approversList = approvingAuthority.split(',').map(auth => auth.trim());
  return approversList.map((approver, index) => ({
    name: approver,
    avatar: `https://images.unsplash.com/photo-${1581090464777 + index}-f3220bbe1b8b?w=100&h=100&fit=crop&crop=face`,
    approved: Math.random() > 0.6
  }));
};

const PSSRChecklist: React.FC<PSSRChecklistProps> = ({ onSaveDraft }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [itemStatuses, setItemStatuses] = useState<ChecklistItemStatus[]>([]);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  // Enhanced categories with N/A tab
  const enhancedCategories = [...checklistCategories, 'Not Applicable'];

  const filteredItems = pssrChecklistData.filter(item => {
    if (selectedCategory === 'Not Applicable') {
      const status = getItemStatus(item.id);
      return status?.response === 'N/A';
    }
    
    const matchesCategory = item.category === selectedCategory;
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Exclude N/A items from other tabs
    const status = getItemStatus(item.id);
    const isNotNA = status?.response !== 'N/A';
    
    return matchesCategory && matchesSearch && isNotNA;
  });

  const getItemStatus = (itemId: string): ChecklistItemStatus | undefined => {
    return itemStatuses.find(status => status.id === itemId);
  };

  const handleItemClick = (item: ChecklistItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleResponseSelect = (item: ChecklistItem, response: string) => {
    if (response && (response === 'N/A' || response === 'YES' || response === 'NO')) {
      setSelectedItem(item);
      setModalOpen(true);
    }
  };

  const handleSaveItem = (itemId: string, response: 'N/A' | 'YES' | 'NO', data: any) => {
    const status: 'DRAFT' | 'UNDER REVIEW' | 'NOT APPLICABLE' = 
      response === 'N/A' ? 'NOT APPLICABLE' :
      data.submitted ? 'UNDER REVIEW' : 'DRAFT';

    setItemStatuses(prev => {
      const existing = prev.find(s => s.id === itemId);
      if (existing) {
        return prev.map(s => s.id === itemId ? { ...s, status, response, data } : s);
      } else {
        return [...prev, { id: itemId, status, response, data }];
      }
    });
  };

  const handleMoveFromNA = (item: ChecklistItem) => {
    setItemStatuses(prev => prev.filter(s => s.id !== item.id));
  };

  const getStatusBadge = (status?: ChecklistItemStatus) => {
    if (!status) return <Badge variant="outline" className="text-xs">Pending</Badge>;
    
    switch (status.status) {
      case 'APPROVED':
        return <Badge className="bg-green-600 text-xs">Approved</Badge>;
      case 'UNDER REVIEW':
        return <Badge className="bg-blue-600 text-xs">Under Review</Badge>;
      case 'NOT APPLICABLE':
        return <Badge variant="secondary" className="text-xs">N/A</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="outline" className="text-xs">Draft</Badge>;
    }
  };

  const renderApprovers = (item: ChecklistItem) => {
    const approvers = getApprovers(item.approvingAuthority);
    const pendingApprovals = approvers.filter(a => !a.approved).length;
    const displayApprovers = approvers.slice(0, 2);
    const remainingCount = approvers.length - 2;

    return (
      <div className="flex items-center space-x-2">
        <div className="flex -space-x-1">
          {displayApprovers.map((approver, index) => (
            <Avatar key={index} className="h-6 w-6 border-2 border-white ring-1 ring-gray-200">
              <AvatarImage src={approver.avatar} alt={approver.name} />
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                {approver.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        
        {remainingCount > 0 && (
          <span className="text-xs text-gray-600">
            +{remainingCount}
          </span>
        )}
        
        {pendingApprovals > 0 && (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
            {pendingApprovals} pending
          </Badge>
        )}
      </div>
    );
  };

  const getCategoryStats = (category: string) => {
    let categoryItems;
    
    if (category === 'Not Applicable') {
      categoryItems = pssrChecklistData.filter(item => {
        const status = getItemStatus(item.id);
        return status?.response === 'N/A';
      });
    } else {
      categoryItems = pssrChecklistData.filter(item => {
        const status = getItemStatus(item.id);
        return item.category === category && status?.response !== 'N/A';
      });
    }
    
    const total = categoryItems.length;
    const completed = categoryItems.filter(item => {
      const status = getItemStatus(item.id);
      return status?.status === 'APPROVED' || status?.status === 'NOT APPLICABLE';
    }).length;
    
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General':
        return <FileText className="h-4 w-4" />;
      case 'Technical Integrity':
        return <Cog className="h-4 w-4" />;
      case 'Start-Up Readiness':
        return <Target className="h-4 w-4" />;
      case 'Health & Safety':
        return <Shield className="h-4 w-4" />;
      case 'Not Applicable':
        return <MinusCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getNextTab = () => {
    const currentIndex = enhancedCategories.indexOf(selectedCategory);
    return currentIndex < enhancedCategories.length - 1 ? enhancedCategories[currentIndex + 1] : null;
  };

  const handleSaveDraft = () => {
    setSaveConfirmOpen(true);
  };

  const confirmSaveDraft = () => {
    setSaveConfirmOpen(false);
    if (onSaveDraft) {
      onSaveDraft();
    }
  };

  const renderDataSummary = (data: any) => {
    if (!data) return null;
    
    return (
      <div className="flex items-center space-x-3 text-xs text-gray-500">
        {data.comments && (
          <div className="flex items-center space-x-1">
            <MessageSquare className="h-3 w-3" />
            <span>Comments</span>
          </div>
        )}
        {data.files && data.files.length > 0 && (
          <div className="flex items-center space-x-1">
            <Paperclip className="h-3 w-3" />
            <span>{data.files.length} file(s)</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">PSSR Checklist</h2>
          <p className="text-sm text-gray-600">Complete the checklist items to proceed with PSSR approval</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search checklist items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button onClick={handleSaveDraft} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save Draft</span>
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-10 bg-white border-b">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-5 h-12 bg-gradient-to-r from-blue-50 to-indigo-50 p-1 rounded-xl">
            {enhancedCategories.map((category) => {
              const stats = getCategoryStats(category);
              return (
                <TabsTrigger 
                  key={category} 
                  value={category} 
                  className="flex flex-col items-center p-2 space-y-1 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(category)}
                    <span className="font-semibold text-sm">{category}</span>
                    <span className="text-xs text-gray-500">({stats.total})</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                        style={{ width: `${stats.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-green-600 font-medium">{stats.percentage}%</span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {enhancedCategories.map((category) => (
            <TabsContent key={category} value={category} className="mt-4">
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const status = getItemStatus(item.id);
                  return (
                    <Card 
                      key={item.id} 
                      className={`transition-all duration-200 hover:shadow-lg border-l-4 cursor-pointer ${
                        status?.status === 'NOT APPLICABLE' ? 'opacity-60 border-l-gray-400' :
                        status?.status === 'APPROVED' ? 'border-l-green-500' :
                        status?.status === 'UNDER REVIEW' ? 'border-l-blue-500' :
                        status?.status === 'DRAFT' ? 'border-l-orange-500' :
                        'border-l-gray-300'
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <CardTitle className="text-lg font-bold text-gray-900">{item.id}</CardTitle>
                              {getStatusBadge(status)}
                            </div>
                            <p className="text-gray-700 leading-relaxed mb-3 text-sm">{item.description}</p>
                            
                            {/* Compact row for response and approvers */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                {/* Response Selection */}
                                {status?.status !== 'NOT APPLICABLE' && status?.status !== 'APPROVED' && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-gray-600">Response:</span>
                                    <Select 
                                      value={status?.response || ''} 
                                      onValueChange={(value) => handleResponseSelect(item, value)}
                                    >
                                      <SelectTrigger className="w-32 h-8 text-xs">
                                        <SelectValue placeholder="Select..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="N/A">N/A</SelectItem>
                                        <SelectItem value="YES">YES</SelectItem>
                                        <SelectItem value="NO">NO</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                
                                {/* Data Summary */}
                                {renderDataSummary(status?.data)}
                              </div>
                              
                              {/* Approvers */}
                              <div className="flex items-center space-x-3">
                                <span className="text-xs font-medium text-gray-600">Approvers:</span>
                                {renderApprovers(item)}
                              </div>
                            </div>

                            {/* Move from N/A option */}
                            {category === 'Not Applicable' && (
                              <div className="mt-3 pt-3 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveFromNA(item);
                                  }}
                                  className="text-xs"
                                >
                                  Remove from N/A
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
                
                {/* Next Tab Button */}
                {getNextTab() && selectedCategory !== 'Not Applicable' && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={() => setSelectedCategory(getNextTab()!)}
                      className="flex items-center space-x-2"
                    >
                      <span>Continue to {getNextTab()}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <ChecklistItemDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        item={selectedItem}
        currentResponse={selectedItem ? getItemStatus(selectedItem.id)?.response : undefined}
        currentData={selectedItem ? getItemStatus(selectedItem.id)?.data : undefined}
        onSave={handleSaveItem}
      />

      {/* Save Confirmation Dialog */}
      <Dialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PSSR Draft Saved</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">
              Your PSSR checklist has been saved as a draft. You can continue working on it later.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setSaveConfirmOpen(false)}>
                Continue Working
              </Button>
              <Button onClick={confirmSaveDraft}>
                Return to PSSR List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PSSRChecklist;
