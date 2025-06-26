import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  Clock,
  AlertTriangle,
  Users,
  Award,
  Target,
  Shield,
  Cog,
  ChevronUp
} from 'lucide-react';
import { pssrChecklistData, checklistCategories, ChecklistItem } from '@/data/pssrChecklistData';
import ChecklistItemModal from './ChecklistItemModal';

interface ChecklistItemStatus {
  id: string;
  status: 'DRAFT' | 'UNDER REVIEW' | 'APPROVED' | 'NOT APPLICABLE';
  response?: 'N/A' | 'YES' | 'NO';
  data?: any;
}

// Mock approver data with avatars
const getApprovers = (approvingAuthority: string) => {
  const approversList = approvingAuthority.split(',').map(auth => auth.trim());
  return approversList.map((approver, index) => ({
    name: approver,
    avatar: `https://images.unsplash.com/photo-${1581090464777 + index}-f3220bbe1b8b?w=100&h=100&fit=crop&crop=face`,
    approved: Math.random() > 0.6 // Random approval status for demo
  }));
};

const PSSRChecklist: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [itemStatuses, setItemStatuses] = useState<ChecklistItemStatus[]>([]);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<'N/A' | 'YES' | 'NO' | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredItems = pssrChecklistData.filter(item => {
    const matchesCategory = item.category === selectedCategory;
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
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

  // Check if there are more items above the current view
  useEffect(() => {
    const checkScrollPosition = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isScrolledDown = scrollTop > 100; // Show indicator if scrolled down more than 100px
        setShowScrollIndicator(isScrolledDown);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition(); // Initial check
      
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, []);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
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

  const renderApprovers = (item: ChecklistItem) => {
    const approvers = getApprovers(item.approvingAuthority);
    const pendingApprovals = approvers.filter(a => !a.approved).length;
    const displayApprovers = approvers.slice(0, 3);
    const remainingCount = approvers.length - 3;

    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-gray-600 font-medium text-sm">Approvers:</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            {displayApprovers.map((approver, index) => (
              <Avatar key={index} className="h-8 w-8 border-2 border-white ring-1 ring-gray-200">
                <AvatarImage src={approver.avatar} alt={approver.name} />
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                  {approver.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          
          {remainingCount > 0 && (
            <span className="text-sm text-gray-600 ml-2">
              and {remainingCount} others
            </span>
          )}
          
          {pendingApprovals > 0 && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs ml-2">
              {pendingApprovals} pending
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const getCategoryStats = (category: string) => {
    const categoryItems = pssrChecklistData.filter(item => item.category === category);
    const total = categoryItems.length;
    const completed = categoryItems.filter(item => {
      const status = getItemStatus(item.id);
      return status?.status === 'APPROVED' || status?.status === 'NOT APPLICABLE';
    }).length;
    
    return { total, completed, percentage: Math.round((completed / total) * 100) };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General':
        return <FileText className="h-4 w-4" />;
      case 'Technical':
        return <Cog className="h-4 w-4" />;
      case 'Safety':
        return <Shield className="h-4 w-4" />;
      case 'Operations':
        return <Target className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">PSSR Checklist</h2>
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
        <TabsList className="grid w-full grid-cols-4 h-auto bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-xl">
          {checklistCategories.map((category) => {
            const stats = getCategoryStats(category);
            return (
              <TabsTrigger 
                key={category} 
                value={category} 
                className="flex flex-col items-center p-4 space-y-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(category)}
                  <span className="font-semibold">{category}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-gray-600">{stats.completed}/{stats.total}</span>
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
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

        {checklistCategories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div 
              ref={scrollContainerRef}
              className="space-y-4 max-h-[70vh] overflow-y-auto relative"
            >
              {/* Fade overlay for last few items */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
              
              {filteredItems.map((item, index) => {
                const status = getItemStatus(item.id);
                const isLastFew = index >= filteredItems.length - 3;
                return (
                  <Card 
                    key={item.id} 
                    className={`transition-all duration-200 hover:shadow-lg border-l-4 ${
                      status?.status === 'NOT APPLICABLE' ? 'opacity-60 border-l-gray-400' :
                      status?.status === 'APPROVED' ? 'border-l-green-500' :
                      status?.status === 'UNDER REVIEW' ? 'border-l-blue-500' :
                      status?.status === 'DRAFT' ? 'border-l-orange-500' :
                      'border-l-gray-300'
                    } ${isLastFew ? 'opacity-75' : ''}`}
                  >
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
                            
                            <div className="mb-4">
                              {renderApprovers(item)}
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
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Scroll Up Indicator */}
      {showScrollIndicator && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <Button
            onClick={scrollToTop}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 animate-bounce"
            size="icon"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
          <div className="text-center mt-2">
            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-md shadow-sm">
              More items above
            </span>
          </div>
        </div>
      )}

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
