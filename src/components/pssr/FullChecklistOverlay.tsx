import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  ChevronDown, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  User,
  Filter,
  Globe,
  Loader2,
  X,
  Clock,
  Edit
} from 'lucide-react';
import { useChecklistTranslation } from '@/hooks/useChecklistTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

interface FullChecklistOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  initialFilter?: {
    type: 'status' | 'category';
    value: string;
  };
}

interface ChecklistItem {
  id: string;
  unique_id: string;
  question: string;
  category: string;
  response: {
    id: string;
    response_value: string;
    narrative: string | null;
    attachments?: string[];
  } | null;
  approval: {
    status: string;
    approver_role: string;
    approver_name: string | null;
    reviewed_at: string | null;
    comments: string | null;
  } | null;
}

export const FullChecklistOverlay: React.FC<FullChecklistOverlayProps> = ({ 
  open, 
  onOpenChange, 
  pssrId, 
  initialFilter 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [responseFilter, setResponseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { language } = useLanguage();

  // Apply initial filter when dialog opens
  useEffect(() => {
    if (open && initialFilter) {
      if (initialFilter.type === 'status') {
        setStatusFilter(initialFilter.value);
        setCategoryFilter('all');
      } else if (initialFilter.type === 'category') {
        setCategoryFilter(initialFilter.value);
        setStatusFilter('all');
      }
    }
  }, [open, initialFilter]);

  // Reset filters when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setCategoryFilter('all');
      setResponseFilter('all');
      setStatusFilter('all');
      setExpandedItems(new Set());
    }
  }, [open]);

  // Fetch checklist items with responses and approvals
  const { data: items, isLoading } = useQuery({
    queryKey: ['pssr-checklist-full', pssrId],
    queryFn: async () => {
      // Fetch responses
      const { data: responses, error: responsesError } = await supabase
        .from('pssr_checklist_responses')
        .select(`
          id,
          checklist_item_id,
          response,
          comments,
          attachments,
          checklist_items!inner(
            id,
            unique_id,
            question,
            category
          )
        `)
        .eq('pssr_id', pssrId);

      if (responsesError) throw responsesError;

      // Fetch approvals
      const { data: approvals, error: approvalsError } = await supabase
        .from('pssr_item_approvals')
        .select(`
          id,
          checklist_response_id,
          status,
          approver_role,
          approver_user_id,
          reviewed_at,
          comments
        `)
        .eq('pssr_id', pssrId);

      if (approvalsError) throw approvalsError;

      // Fetch approver names
      const approverIds = approvals?.filter(a => a.approver_user_id).map(a => a.approver_user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', approverIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Combine data
      const combinedItems: ChecklistItem[] = ((responses || []) as any[]).map(response => {
        const item = response.checklist_items;
        const approval = approvals?.find(a => a.checklist_response_id === response.id);
        
        return {
          id: item.id,
          unique_id: item.unique_id,
          question: item.question,
          category: item.category,
          response: {
            id: response.id,
            response_value: response.response,
            narrative: response.comments,
            attachments: response.attachments as string[] | undefined,
          },
          approval: approval ? {
            status: approval.status,
            approver_role: approval.approver_role,
            approver_name: approval.approver_user_id ? profileMap.get(approval.approver_user_id) || null : null,
            reviewed_at: approval.reviewed_at,
            comments: approval.comments,
          } : null,
        };
      });

      return combinedItems;
    },
    enabled: open && !!pssrId,
  });

  // Translate checklist items
  const { 
    items: translatedItems, 
    isTranslating, 
    translationProgress,
    isEnglish 
  } = useChecklistTranslation(items, ['question', 'category']);

  // Get unique categories from translated items
  const categories = useMemo(() => {
    if (!translatedItems) return [];
    return [...new Set(translatedItems.map(i => i.category))].sort();
  }, [translatedItems]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!translatedItems) return { total: 0, completed: 0, deviations: 0, pending: 0 };
    
    return {
      total: translatedItems.length,
      completed: translatedItems.filter(i => i.approval?.status === 'approved').length,
      deviations: translatedItems.filter(i => i.response?.response_value === 'DEVIATION' || i.response?.response_value === 'NO').length,
      pending: translatedItems.filter(i => !i.approval || i.approval.status === 'pending').length,
    };
  }, [translatedItems]);

  // Determine item status for filtering
  const getItemStatus = (item: ChecklistItem): string => {
    if (item.approval?.status === 'approved') return 'approved';
    if (item.approval?.status === 'approved_with_action') return 'approved';
    if (item.approval?.status === 'rejected') return 'rejected';
    if (item.approval) return 'under_review';
    if (item.response) return 'draft';
    return 'not_started';
  };

  // Filter items
  const filteredItems = useMemo(() => {
    if (!translatedItems) return [];
    
    return translatedItems.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          item.unique_id.toLowerCase().includes(query) ||
          item.question.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      
      // Response filter
      if (responseFilter !== 'all') {
        if (!item.response) return false;
        if (responseFilter !== item.response.response_value) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const itemStatus = getItemStatus(item);
        if (statusFilter === 'draft' && itemStatus !== 'draft') return false;
        if (statusFilter === 'under_review' && itemStatus !== 'under_review') return false;
        if (statusFilter === 'approved' && itemStatus !== 'approved') return false;
      }
      
      return true;
    });
  }, [translatedItems, searchQuery, categoryFilter, responseFilter, statusFilter]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const getResponseBadge = (response: string | undefined) => {
    switch (response) {
      case 'YES':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Yes</Badge>;
      case 'NO':
      case 'DEVIATION':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Deviation</Badge>;
      case 'NA':
        return <Badge variant="secondary">N/A</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getApprovalBadge = (status: string | undefined) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Approved</Badge>;
      case 'approved_with_action':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Approved w/ Action</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getStatusBadge = (item: ChecklistItem) => {
    const status = getItemStatus(item);
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30"><Clock className="h-3 w-3 mr-1" />Under Review</Badge>;
      case 'draft':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30"><Edit className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><AlertTriangle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              All Checklist Items
              {!isEnglish && (
                <Badge variant="outline" className="text-xs gap-1 ml-2">
                  <Globe className="h-3 w-3" />
                  {language}
                </Badge>
              )}
            </DialogTitle>
          </div>
          
          {/* Stats Bar */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
              <span className="text-sm font-medium">{stats.total}</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">{stats.completed}</span>
              <span className="text-xs text-green-600/70">Completed</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">{stats.deviations}</span>
              <span className="text-xs text-amber-600/70">Deviations</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-md">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">{stats.pending}</span>
              <span className="text-xs text-blue-600/70">Pending</span>
            </div>
          </div>
          
          {/* Translation Progress */}
          {isTranslating && !isEnglish && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md mt-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Translating to {language}...</span>
              <Progress value={translationProgress} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground">{translationProgress}%</span>
            </div>
          )}
          
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, question, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={responseFilter} onValueChange={setResponseFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Response" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Responses</SelectItem>
                <SelectItem value="YES">Yes</SelectItem>
                <SelectItem value="DEVIATION">Deviation</SelectItem>
                <SelectItem value="NA">N/A</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-muted-foreground mt-4">Loading checklist items...</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-4">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <div key={category} className="border rounded-lg">
                    <div className="bg-muted/50 px-4 py-2 flex items-center justify-between sticky top-0 z-10">
                      <h3 className="font-medium">{category}</h3>
                      <Badge variant="secondary">{categoryItems.length} items</Badge>
                    </div>
                    
                    <div className="divide-y">
                      {categoryItems.map(item => (
                        <Collapsible 
                          key={item.id}
                          open={expandedItems.has(item.id)}
                          onOpenChange={() => toggleItem(item.id)}
                        >
                          <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${
                              expandedItems.has(item.id) ? 'rotate-180' : ''
                            }`} />
                            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded flex-shrink-0">
                              {item.unique_id}
                            </code>
                            <span className="flex-1 text-sm truncate">{item.question}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getResponseBadge(item.response?.response_value)}
                              {getStatusBadge(item)}
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="px-4 py-4 bg-muted/30 border-t space-y-4">
                              {/* Full Question */}
                              <div>
                                <p className="text-sm font-medium mb-1">Question</p>
                                <p className="text-sm text-muted-foreground">{item.question}</p>
                              </div>
                              
                              {/* Response */}
                              {item.response && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium mb-1">Response</p>
                                    <p className="text-sm">{item.response.response_value}</p>
                                  </div>
                                  {item.response.narrative && (
                                    <div>
                                      <p className="text-sm font-medium mb-1">Narrative/Comments</p>
                                      <p className="text-sm text-muted-foreground">{item.response.narrative}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Evidence/Attachments */}
                              {item.response?.attachments && item.response.attachments.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Evidence Documents</p>
                                  <div className="flex flex-wrap gap-2">
                                    {item.response.attachments.map((url, idx) => (
                                      <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() => window.open(url, '_blank')}
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Attachment {idx + 1}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Approval Info */}
                              {item.approval && (
                                <div className="pt-3 border-t">
                                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Technical Authority Review
                                  </p>
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Reviewer</p>
                                      <p className="font-medium">{item.approval.approver_name || item.approval.approver_role}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Role</p>
                                      <p>{item.approval.approver_role}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Reviewed</p>
                                      <p>{item.approval.reviewed_at 
                                        ? new Date(item.approval.reviewed_at).toLocaleDateString() 
                                        : 'Pending'
                                      }</p>
                                    </div>
                                  </div>
                                  {item.approval.comments && (
                                    <div className="mt-2 p-2 bg-muted rounded-md">
                                      <p className="text-xs text-muted-foreground">Comments:</p>
                                      <p className="text-sm">{item.approval.comments}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </div>
                ))}
                
                {filteredItems.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No checklist items found matching your filters.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
