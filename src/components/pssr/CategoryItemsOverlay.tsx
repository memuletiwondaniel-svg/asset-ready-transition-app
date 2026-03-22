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
import { PSSRItemDetailModal } from './PSSRItemDetailModal';

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
  const [selectedItem, setSelectedItem] = useState<CategoryItem | null>(null);
  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const { data: dbItems, isLoading } = usePSSRCategoryItems(pssrId, categoryName);

  // Helper to create mock item with all required fields
  const createMockItem = (
    id: string,
    unique_id: string,
    question: string,
    response: string | null,
    status: string,
    approval_status: string | null,
    narrative: string | null,
    category: string
  ): CategoryItem => ({
    id,
    unique_id,
    question,
    response_id: id,
    response,
    status,
    approval_status,
    narrative,
    category,
    deviation_reason: response === 'DEVIATION' || response === 'NO' ? 'Equipment issue identified during inspection' : null,
    potential_risk: response === 'DEVIATION' || response === 'NO' ? 'Potential safety hazard if not addressed' : null,
    mitigations: response === 'DEVIATION' || response === 'NO' ? 'Temporary controls in place, permanent fix scheduled' : null,
    follow_up_action: approval_status === 'approved_with_action' ? 'Complete corrective action before startup' : null,
    action_owner: approval_status === 'approved_with_action' ? 'Operations Lead' : null,
    justification: null,
    submitted_at: response ? '2024-01-15T10:00:00Z' : null,
    approved_at: approval_status === 'approved' || approval_status === 'approved_with_action' ? '2024-01-16T14:30:00Z' : null,
    approver_name: approval_status ? 'Process Engineering TA' : null,
    approval_comments: approval_status === 'approved_with_action' ? 'Approved contingent on completion of corrective action' : null,
    attachments: response ? ['https://example.com/evidence-1.pdf'] : null,
  });

  // Mock items for each category when real data is empty
  const getMockItems = (category: string | null): CategoryItem[] => {
    if (!category) return [];
    
    const mockItemsMap: Record<string, CategoryItem[]> = {
      'Technical Integrity': [
        createMockItem('1', 'TI-001', 'Have all pressure relief devices been tested and certified?', 'YES', 'completed', 'approved', null, 'Technical Integrity'),
        createMockItem('2', 'TI-002', 'Are all critical instrumentation loops verified and calibrated?', 'YES', 'completed', 'approved', null, 'Technical Integrity'),
        createMockItem('3', 'TI-003', 'Have all rotating equipment been aligned and tested?', 'DEVIATION', 'review', 'approved_with_action', 'Pump P-101 requires realignment before startup', 'Technical Integrity'),
        createMockItem('4', 'TI-004', 'Are all vessel inspection reports current and approved?', 'YES', 'completed', 'approved', null, 'Technical Integrity'),
        createMockItem('5', 'TI-005', 'Have all piping systems been hydrostatically tested?', null, 'pending', null, null, 'Technical Integrity'),
        createMockItem('6', 'TI-006', 'Are all electrical systems grounded and bonded properly?', 'YES', 'completed', 'approved', null, 'Technical Integrity'),
      ],
      'Process Safety': [
        createMockItem('7', 'PS-001', 'Has the Process Hazard Analysis (PHA) been completed and recommendations closed?', 'YES', 'completed', 'approved', null, 'Process Safety'),
        createMockItem('8', 'PS-002', 'Are all Safety Instrumented Systems (SIS) tested and functional?', 'YES', 'completed', 'approved', null, 'Process Safety'),
        createMockItem('9', 'PS-003', 'Have all Emergency Shutdown (ESD) systems been tested?', 'DEVIATION', 'review', 'approved_with_action', 'ESD valve XV-102 requires replacement', 'Process Safety'),
        createMockItem('10', 'PS-004', 'Are all interlock systems verified and documented?', 'YES', 'completed', 'approved', null, 'Process Safety'),
        createMockItem('11', 'PS-005', 'Has the Management of Change (MOC) process been completed for all modifications?', null, 'pending', null, null, 'Process Safety'),
      ],
      'Organization': [
        createMockItem('12', 'ORG-001', 'Are all personnel trained on operating procedures?', 'YES', 'completed', 'approved', null, 'Organization'),
        createMockItem('13', 'ORG-002', 'Has the shift handover procedure been established?', 'YES', 'completed', 'approved', null, 'Organization'),
        createMockItem('14', 'ORG-003', 'Are emergency response roles and responsibilities defined?', 'YES', 'completed', 'approved', null, 'Organization'),
        createMockItem('15', 'ORG-004', 'Has the on-call roster been established?', null, 'pending', null, null, 'Organization'),
      ],
      'Documentation': [
        createMockItem('16', 'DOC-001', 'Are all P&IDs updated to as-built condition?', 'YES', 'completed', 'approved', null, 'Documentation'),
        createMockItem('17', 'DOC-002', 'Have all operating procedures been approved?', 'DEVIATION', 'review', 'approved_with_action', 'SOP-001 requires revision for new equipment', 'Documentation'),
        createMockItem('18', 'DOC-003', 'Are all equipment manuals available and organized?', 'YES', 'completed', 'approved', null, 'Documentation'),
        createMockItem('19', 'DOC-004', 'Have all emergency response procedures been documented?', null, 'pending', null, null, 'Documentation'),
      ],
      'HSE & Environment': [
        createMockItem('20', 'HSE-001', 'Are all environmental permits in place?', 'YES', 'completed', 'approved', null, 'HSE & Environment'),
        createMockItem('21', 'HSE-002', 'Have all fire detection and suppression systems been tested?', 'YES', 'completed', 'approved', null, 'HSE & Environment'),
        createMockItem('22', 'HSE-003', 'Are spill containment measures in place?', 'YES', 'completed', 'approved', null, 'HSE & Environment'),
      ],
      'Maintenance Readiness': [
        createMockItem('23', 'MR-001', 'Are all critical spare parts available on site?', 'YES', 'completed', 'approved', null, 'Maintenance Readiness'),
        createMockItem('24', 'MR-002', 'Has the preventive maintenance schedule been established?', 'YES', 'completed', 'approved', null, 'Maintenance Readiness'),
        createMockItem('25', 'MR-003', 'Are all maintenance tools and equipment available?', null, 'pending', null, null, 'Maintenance Readiness'),
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
        <ScrollArea className="h-[400px] mt-4 -mx-6 px-6">
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
                  onClick={() => {
                    setSelectedItem(item);
                    setItemDetailOpen(true);
                    onItemClick?.(item);
                  }}
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

      {/* Item Detail Modal */}
      <PSSRItemDetailModal
        open={itemDetailOpen}
        onOpenChange={setItemDetailOpen}
        item={selectedItem}
        pssrId={pssrId}
      />
    </Dialog>
  );
};

export default CategoryItemsOverlay;
