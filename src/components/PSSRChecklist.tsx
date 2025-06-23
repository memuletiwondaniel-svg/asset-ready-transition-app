
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { pssrChecklistData, checklistCategories, ChecklistItem } from '@/data/pssrChecklistData';
import ChecklistItemModal from './ChecklistItemModal';

interface ChecklistItemStatus {
  id: string;
  status: 'DRAFT' | 'UNDER REVIEW' | 'APPROVED' | 'NOT APPLICABLE';
  response?: 'N/A' | 'YES' | 'NO';
  data?: any;
}

const PSSRChecklist: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [itemStatuses, setItemStatuses] = useState<ChecklistItemStatus[]>([]);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<'N/A' | 'YES' | 'NO' | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredItems = pssrChecklistData.filter(item => {
    const matchesCategory = item.category === selectedCategory;
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getItemStatus = (itemId: string): ChecklistItemStatus | undefined => {
    return itemStatuses.find(status => status.id === itemId);
  };

  const handleItemResponse = (item: ChecklistItem, response: 'N/A' | 'YES' | 'NO') => {
    setSelectedItem(item);
    setSelectedResponse(response);
    setModalOpen(true);
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

  const getStatusIcon = (status?: ChecklistItemStatus) => {
    if (!status) return <Clock className="h-4 w-4 text-gray-400" />;
    
    switch (status.status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'UNDER REVIEW':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'NOT APPLICABLE':
        return <MinusCircle className="h-4 w-4 text-gray-600" />;
      case 'DRAFT':
      default:
        return <FileText className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusBadge = (status?: ChecklistItemStatus) => {
    if (!status) return <Badge variant="outline">Pending</Badge>;
    
    switch (status.status) {
      case 'APPROVED':
        return <Badge className="bg-green-600">Approved</Badge>;
      case 'UNDER REVIEW':
        return <Badge className="bg-blue-600">Under Review</Badge>;
      case 'NOT APPLICABLE':
        return <Badge variant="secondary">N/A</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const getCategoryStats = (category: string) => {
    const categoryItems = pssrChecklistData.filter(item => item.category === category);
    const total = categoryItems.length;
    const completed = categoryItems.filter(item => {
      const status = getItemStatus(item.id);
      return status?.status === 'APPROVED' || status?.status === 'NOT APPLICABLE';
    }).length;
    
    return { total, completed };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">PSSR Checklist</h2>
          <p className="text-gray-600">Complete the checklist items to proceed with PSSR approval</p>
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
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4">
          {checklistCategories.map((category) => {
            const stats = getCategoryStats(category);
            return (
              <TabsTrigger key={category} value={category} className="flex flex-col items-center p-3">
                <span className="text-sm font-medium">{category}</span>
                <span className="text-xs text-gray-500">{stats.completed}/{stats.total}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {checklistCategories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const status = getItemStatus(item.id);
                return (
                  <Card key={item.id} className={`${status?.status === 'NOT APPLICABLE' ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {getStatusIcon(status)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <CardTitle className="text-lg">{item.id}</CardTitle>
                              {getStatusBadge(status)}
                            </div>
                            <p className="text-gray-700">{item.description}</p>
                            {item.supportingEvidence && (
                              <div className="mt-2">
                                <span className="text-sm font-medium text-gray-600">Supporting Evidence: </span>
                                <span className="text-sm text-gray-600">{item.supportingEvidence}</span>
                              </div>
                            )}
                            <div className="mt-2">
                              <span className="text-sm font-medium text-gray-600">Approvers: </span>
                              <span className="text-sm text-gray-600">{item.approvingAuthority}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {status?.status !== 'NOT APPLICABLE' && status?.status !== 'APPROVED' && (
                      <CardContent>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleItemResponse(item, 'N/A')}
                            className="flex items-center"
                          >
                            <MinusCircle className="h-4 w-4 mr-1" />
                            N/A
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleItemResponse(item, 'YES')}
                            className="flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            YES
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleItemResponse(item, 'NO')}
                            className="flex items-center"
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            NO - Request Deviation
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <ChecklistItemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        item={selectedItem}
        response={selectedResponse}
        onSave={handleSaveItem}
      />
    </div>
  );
};

export default PSSRChecklist;
