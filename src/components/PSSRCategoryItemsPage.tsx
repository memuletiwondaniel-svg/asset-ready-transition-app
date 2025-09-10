import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  Clock,
  AlertTriangle,
  Users,
  Shield,
  Cog,
  Filter
} from 'lucide-react';
import { ChecklistItem } from '@/data/pssrChecklistData';
import { useChecklistItems } from '@/hooks/useChecklistItems';
import ChecklistItemModal from './ChecklistItemModal';

interface ChecklistItemStatus {
  id: string;
  status: 'DRAFT' | 'UNDER REVIEW' | 'APPROVED' | 'NOT APPLICABLE';
  response?: 'N/A' | 'YES' | 'NO';
  data?: any;
}

interface PSSRCategoryItemsPageProps {
  categoryName: string;
  pssrId: string;
  onBack: () => void;
}

const PSSRCategoryItemsPage: React.FC<PSSRCategoryItemsPageProps> = ({ 
  categoryName, 
  pssrId, 
  onBack 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [itemStatuses, setItemStatuses] = useState<ChecklistItemStatus[]>([]);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<'N/A' | 'YES' | 'NO' | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: checklistItems = [], isLoading } = useChecklistItems();

  // Filter items by category and search term
  const filteredItems = checklistItems.filter(item => {
    const matchesCategory = item.category === categoryName;
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filterStatus !== 'all') {
      const status = getItemStatus(item.id);
      if (filterStatus === 'pending') {
        matchesFilter = !status || status.status === 'DRAFT';
      } else if (filterStatus === 'review') {
        matchesFilter = status?.status === 'UNDER REVIEW';
      } else if (filterStatus === 'approved') {
        matchesFilter = status?.status === 'APPROVED';
      } else if (filterStatus === 'na') {
        matchesFilter = status?.status === 'NOT APPLICABLE';
      }
    }
    
    return matchesCategory && matchesSearch && matchesFilter;
  });

  const getItemStatus = (itemId: string): ChecklistItemStatus | undefined => {
    return itemStatuses.find(status => status.id === itemId);
  };

  const handleResponseSelect = (item: ChecklistItem, response: string) => {
    if (response && (response === 'N/A' || response === 'YES' || response === 'NO')) {
      setSelectedItem(item);
      setSelectedResponse(response as 'N/A' | 'YES' | 'NO');
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

  const getStatusIcon = (status?: ChecklistItemStatus) => {
    if (!status) return <Clock className="h-5 w-5 text-gray-400" />;
    
    switch (status.status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'UNDER REVIEW':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'NOT APPLICABLE':
        return <MinusCircle className="h-5 w-5 text-gray-600" />;
      case 'DRAFT':
      default:
        return <FileText className="h-5 w-5 text-orange-600" />;
    }
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General':
        return <FileText className="h-5 w-5" />;
      case 'Technical Integrity':
        return <Cog className="h-5 w-5" />;
      case 'Start-Up Readiness':
        return <Shield className="h-5 w-5" />;
      case 'Health & Safety':
        return <Shield className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryStats = () => {
    const categoryItems = checklistItems.filter(item => item.category === categoryName);
    const total = categoryItems.length;
    const completed = categoryItems.filter(item => {
      const status = getItemStatus(item.id);
      return status?.status === 'APPROVED' || status?.status === 'NOT APPLICABLE';
    }).length;
    
    return { total, completed, percentage: Math.round((completed / total) * 100) };
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading checklist items...</div>;
  }

  const stats = getCategoryStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PSSR Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                {getCategoryIcon(categoryName)}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{categoryName}</h1>
                  <p className="text-sm text-gray-600">PSSR ID: {pssrId}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                <span className="text-sm text-gray-600">Progress:</span>
                <span className="font-medium text-gray-900">{stats.completed}/{stats.total}</span>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                    style={{ width: `${stats.percentage}%` }}
                  ></div>
                </div>
                <span className="text-green-600 font-medium text-sm">{stats.percentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filter Controls */}
        <div className="mb-6 bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search checklist items by ID or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="na">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p>No checklist items match your current search and filter criteria.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredItems.map((item) => {
              const status = getItemStatus(item.id);
              return (
                <Card key={item.id} className={`transition-all duration-200 hover:shadow-lg border-l-4 ${
                  status?.status === 'NOT APPLICABLE' ? 'opacity-60 border-l-gray-400' :
                  status?.status === 'APPROVED' ? 'border-l-green-500' :
                  status?.status === 'UNDER REVIEW' ? 'border-l-blue-500' :
                  status?.status === 'DRAFT' ? 'border-l-orange-500' :
                  'border-l-gray-300'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="mt-1">
                          {getStatusIcon(status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <CardTitle className="text-lg font-bold text-gray-900">{item.id}</CardTitle>
                            {getStatusBadge(status)}
                          </div>
                          <p className="text-gray-700 leading-relaxed mb-4">{item.description}</p>
                          
                          {item.topic && (
                            <div className="text-sm text-muted-foreground mb-2">
                              <strong>Topic:</strong> {item.topic}
                            </div>
                          )}
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            <strong>Supporting Evidence:</strong> {item.supporting_evidence || "Not specified"}
                          </div>
                          
                          {item.responsible_party && (
                            <div className="text-sm text-muted-foreground mb-2">
                              <strong>Responsible Party:</strong> {item.responsible_party}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-blue-600" />
                              <span className="text-gray-600 font-medium">Approvers:</span>
                              <span className="text-gray-700">{item.approving_authority || "Not specified"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {status?.status !== 'NOT APPLICABLE' && status?.status !== 'APPROVED' && (
                    <CardContent>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Response
                        </label>
                        <Select onValueChange={(value) => handleResponseSelect(item, value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose your response..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="N/A">
                              <div className="flex items-center space-x-2">
                                <MinusCircle className="h-4 w-4 text-gray-600" />
                                <span>N/A - Not Applicable</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="YES">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>YES - Compliant</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="NO">
                              <div className="flex items-center space-x-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span>NO - Request Deviation</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Summary Card */}
        <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              {categoryName} Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-orange-600">{stats.total - stats.completed}</div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{stats.percentage}%</div>
                <div className="text-sm text-gray-600">Progress</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm font-bold text-gray-900">{stats.percentage}%</span>
              </div>
              <Progress value={stats.percentage} className="w-full h-3" />
            </div>
          </CardContent>
        </Card>
      </main>

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

export default PSSRCategoryItemsPage;