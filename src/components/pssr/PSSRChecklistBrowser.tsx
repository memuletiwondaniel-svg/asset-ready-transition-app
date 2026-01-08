import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  ChevronDown, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  User,
  Filter
} from 'lucide-react';

interface PSSRChecklistBrowserProps {
  pssrId: string;
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

export const PSSRChecklistBrowser: React.FC<PSSRChecklistBrowserProps> = ({ pssrId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [responseFilter, setResponseFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fetch checklist items with responses and approvals
  const { data: items, isLoading } = useQuery({
    queryKey: ['pssr-checklist-browser', pssrId],
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
    enabled: !!pssrId,
  });

  // Get unique categories
  const categories = useMemo(() => {
    if (!items) return [];
    return [...new Set(items.map(i => i.category))].sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
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
      
      return true;
    });
  }, [items, searchQuery, categoryFilter, responseFilter]);

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Loading checklist items...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Checklist Items Browser
        </CardTitle>
        
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
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="border rounded-lg">
                <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
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
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
                          expandedItems.has(item.id) ? 'rotate-180' : ''
                        }`} />
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                          {item.unique_id}
                        </code>
                        <span className="flex-1 text-sm truncate">{item.question}</span>
                        {getResponseBadge(item.response?.response_value)}
                        {item.approval && getApprovalBadge(item.approval.status)}
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
      </CardContent>
    </Card>
  );
};
