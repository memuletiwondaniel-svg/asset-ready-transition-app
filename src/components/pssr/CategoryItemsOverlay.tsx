import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react';
import { usePSSRCategoryItems, CategoryItem } from '@/hooks/usePSSRCategoryProgress';

interface CategoryItemsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  categoryName: string | null;
  categoryStats?: {
    completed: number;
    total: number;
    percentage: number;
  };
  onItemClick?: (item: CategoryItem) => void;
}

const getStatusBadge = (item: CategoryItem) => {
  // If approved by TA
  if (item.approval_status === 'approved') {
    return (
      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  
  if (item.approval_status === 'approved_with_action') {
    return (
      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Action Required
      </Badge>
    );
  }
  
  if (item.approval_status === 'rejected') {
    return (
      <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
        <X className="h-3 w-3" />
        Rejected
      </Badge>
    );
  }

  // Based on response
  if (item.response === 'YES') {
    return (
      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
        Yes
      </Badge>
    );
  }
  
  if (item.response === 'NO' || item.response === 'DEVIATION') {
    return (
      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
        Deviation
      </Badge>
    );
  }
  
  if (item.response === 'NA') {
    return <Badge variant="secondary">N/A</Badge>;
  }
  
  // Pending
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
};

const getStatusIcon = (item: CategoryItem) => {
  if (item.approval_status === 'approved' || item.response === 'YES' || item.response === 'NA') {
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  }
  if (item.response === 'NO' || item.response === 'DEVIATION' || item.approval_status === 'approved_with_action') {
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  }
  if (item.approval_status === 'rejected') {
    return <X className="h-5 w-5 text-destructive" />;
  }
  return <Clock className="h-5 w-5 text-muted-foreground" />;
};

export const CategoryItemsOverlay: React.FC<CategoryItemsOverlayProps> = ({
  open,
  onOpenChange,
  pssrId,
  categoryName,
  categoryStats,
  onItemClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'deviation' | 'pending'>('all');
  const { data: dbItems, isLoading } = usePSSRCategoryItems(pssrId, categoryName);

  // Mock items for each category when real data is empty
  const getMockItems = (category: string | null): CategoryItem[] => {
    if (!category) return [];
    
    const mockItemsMap: Record<string, CategoryItem[]> = {
      'Technical Integrity': [
        { id: '1', unique_id: 'TI-001', question: 'Have all pressure relief devices been tested and certified?', response_id: '1', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Technical Integrity' },
        { id: '2', unique_id: 'TI-002', question: 'Are all critical instrumentation loops verified and calibrated?', response_id: '2', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Technical Integrity' },
        { id: '3', unique_id: 'TI-003', question: 'Have all rotating equipment been aligned and tested?', response_id: '3', response: 'DEVIATION', status: 'review', approval_status: 'approved_with_action', narrative: 'Pump P-101 requires realignment before startup', category: 'Technical Integrity' },
        { id: '4', unique_id: 'TI-004', question: 'Are all vessel inspection reports current and approved?', response_id: '4', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Technical Integrity' },
        { id: '5', unique_id: 'TI-005', question: 'Have all piping systems been hydrostatically tested?', response_id: '5', response: null, status: 'pending', approval_status: null, narrative: null, category: 'Technical Integrity' },
        { id: '6', unique_id: 'TI-006', question: 'Are all electrical systems grounded and bonded properly?', response_id: '6', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Technical Integrity' },
      ],
      'Process Safety': [
        { id: '7', unique_id: 'PS-001', question: 'Has the Process Hazard Analysis (PHA) been completed and recommendations closed?', response_id: '7', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Process Safety' },
        { id: '8', unique_id: 'PS-002', question: 'Are all Safety Instrumented Systems (SIS) tested and functional?', response_id: '8', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Process Safety' },
        { id: '9', unique_id: 'PS-003', question: 'Have all Emergency Shutdown (ESD) systems been tested?', response_id: '9', response: 'DEVIATION', status: 'review', approval_status: 'approved_with_action', narrative: 'ESD valve XV-102 requires replacement', category: 'Process Safety' },
        { id: '10', unique_id: 'PS-004', question: 'Are all interlock systems verified and documented?', response_id: '10', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Process Safety' },
        { id: '11', unique_id: 'PS-005', question: 'Has the Management of Change (MOC) process been completed for all modifications?', response_id: '11', response: null, status: 'pending', approval_status: null, narrative: null, category: 'Process Safety' },
      ],
      'Organization': [
        { id: '12', unique_id: 'ORG-001', question: 'Are all personnel trained on operating procedures?', response_id: '12', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Organization' },
        { id: '13', unique_id: 'ORG-002', question: 'Has the shift handover procedure been established?', response_id: '13', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Organization' },
        { id: '14', unique_id: 'ORG-003', question: 'Are emergency response roles and responsibilities defined?', response_id: '14', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Organization' },
        { id: '15', unique_id: 'ORG-004', question: 'Has the on-call roster been established?', response_id: '15', response: null, status: 'pending', approval_status: null, narrative: null, category: 'Organization' },
      ],
      'Documentation': [
        { id: '16', unique_id: 'DOC-001', question: 'Are all P&IDs updated to as-built condition?', response_id: '16', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Documentation' },
        { id: '17', unique_id: 'DOC-002', question: 'Have all operating procedures been approved?', response_id: '17', response: 'DEVIATION', status: 'review', approval_status: 'approved_with_action', narrative: 'SOP-001 requires revision for new equipment', category: 'Documentation' },
        { id: '18', unique_id: 'DOC-003', question: 'Are all equipment manuals available and organized?', response_id: '18', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Documentation' },
        { id: '19', unique_id: 'DOC-004', question: 'Have all emergency response procedures been documented?', response_id: '19', response: null, status: 'pending', approval_status: null, narrative: null, category: 'Documentation' },
      ],
      'HSE & Environment': [
        { id: '20', unique_id: 'HSE-001', question: 'Are all environmental permits in place?', response_id: '20', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'HSE & Environment' },
        { id: '21', unique_id: 'HSE-002', question: 'Have all fire detection and suppression systems been tested?', response_id: '21', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'HSE & Environment' },
        { id: '22', unique_id: 'HSE-003', question: 'Are spill containment measures in place?', response_id: '22', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'HSE & Environment' },
      ],
      'Maintenance Readiness': [
        { id: '23', unique_id: 'MR-001', question: 'Are all critical spare parts available on site?', response_id: '23', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Maintenance Readiness' },
        { id: '24', unique_id: 'MR-002', question: 'Has the preventive maintenance schedule been established?', response_id: '24', response: 'YES', status: 'completed', approval_status: 'approved', narrative: null, category: 'Maintenance Readiness' },
        { id: '25', unique_id: 'MR-003', question: 'Are all maintenance tools and equipment available?', response_id: '25', response: null, status: 'pending', approval_status: null, narrative: null, category: 'Maintenance Readiness' },
      ],
    };
    
    return mockItemsMap[category] || [];
  };

  // Use real data if available, otherwise use mock data
  const items = (dbItems && dbItems.length > 0) ? dbItems : getMockItems(categoryName);

  // Filter items based on search and status
  const filteredItems = items.filter(item => {
    // Status filter
    if (statusFilter === 'completed') {
      const isCompleted = item.response === 'YES' || item.response === 'NA' || item.approval_status === 'approved';
      if (!isCompleted) return false;
    }
    if (statusFilter === 'deviation') {
      const isDeviation = item.response === 'NO' || item.response === 'DEVIATION';
      if (!isDeviation) return false;
    }
    if (statusFilter === 'pending') {
      const isPending = !item.response;
      if (!isPending) return false;
    }
    
    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.unique_id.toLowerCase().includes(query) ||
      item.question.toLowerCase().includes(query)
    );
  });

  // Group items by status for summary
  const statusCounts = {
    completed: items.filter(i => i.response === 'YES' || i.response === 'NA' || i.approval_status === 'approved').length,
    deviation: items.filter(i => i.response === 'NO' || i.response === 'DEVIATION').length,
    pending: items.filter(i => !i.response).length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{categoryName}</DialogTitle>
              <DialogDescription>
                {categoryStats?.completed || 0} of {categoryStats?.total || 0} items completed
              </DialogDescription>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{categoryStats?.percentage || 0}%</span>
            </div>
            <Progress value={categoryStats?.percentage || 0} className="h-2" />
          </div>

          {/* Status Summary - Clickable Filters */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="gap-1.5"
            >
              <FileText className="h-4 w-4" />
              All ({items.length})
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
              className={`gap-1.5 ${statusFilter === 'completed' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
            >
              <CheckCircle2 className={`h-4 w-4 ${statusFilter === 'completed' ? 'text-white' : 'text-green-500'}`} />
              Completed ({statusCounts.completed})
            </Button>
            <Button
              variant={statusFilter === 'deviation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('deviation')}
              className={`gap-1.5 ${statusFilter === 'deviation' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
            >
              <AlertTriangle className={`h-4 w-4 ${statusFilter === 'deviation' ? 'text-white' : 'text-amber-500'}`} />
              Deviation ({statusCounts.deviation})
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
              className="gap-1.5"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              Pending ({statusCounts.pending})
            </Button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </DialogHeader>

        {/* Items List */}
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>
                {searchQuery 
                  ? 'No items match your search.' 
                  : statusFilter !== 'all'
                    ? `No ${statusFilter} items in this category.`
                    : 'No items in this category.'}
              </p>
              {statusFilter !== 'all' && (
                <Button 
                  variant="link" 
                  onClick={() => setStatusFilter('all')}
                  className="mt-2"
                >
                  Show all items
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
                >
                  {getStatusIcon(item)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        {item.unique_id}
                      </code>
                      {getStatusBadge(item)}
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{item.question}</p>
                    {item.narrative && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {item.narrative}
                      </p>
                    )}
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryItemsOverlay;
