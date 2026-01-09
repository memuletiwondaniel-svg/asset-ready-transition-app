import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, FileText, Clock, ChevronDown, ChevronRight, Download, User, Calendar, MapPin, Target, Building2, Paperclip } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrshSidebar } from '@/components/OrshSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { usePSSRItemApprovals, ItemApprovalStatus } from '@/hooks/usePSSRItemApprovals';
import { usePSSRPriorityActions } from '@/hooks/usePSSRPriorityActions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import ItemApprovalCard from '@/components/pssr/ItemApprovalCard';
import PriorityActionModal from '@/components/pssr/PriorityActionModal';
import DisciplineCompletionPanel from '@/components/pssr/DisciplineCompletionPanel';
import { createSidebarNavigator } from '@/utils/sidebarNavigation';

interface ChecklistItemWithResponse {
  id: string;
  approvalId: string;
  itemId: string;
  category: string;
  categoryName: string;
  topic: string | null;
  description: string;
  response: string | null;
  narrative: string | null;
  status: ItemApprovalStatus;
  comments: string | null;
  reviewedAt: string | null;
  sequenceNumber: number;
}

const PSSRItemReview: React.FC = () => {
  const { id: pssrId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const approverRole = searchParams.get('role') || '';

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [priorityLevel, setPriorityLevel] = useState<'A' | 'B'>('A');
  const [showCompletionPanel, setShowCompletionPanel] = useState(false);

  // Fetch PSSR details
  const { data: pssr, isLoading: pssrLoading } = useQuery({
    queryKey: ['pssr-details', pssrId],
    queryFn: async () => {
      if (!pssrId) return null;
      const { data, error } = await supabase
        .from('pssrs')
        .select('*')
        .eq('id', pssrId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  // Fetch item approvals for this role
  const { approvals, disciplineReview, isLoading: approvalsLoading, updateApproval, stats, progress } = usePSSRItemApprovals(pssrId, approverRole);

  // Fetch priority actions
  const { actions: priorityActions, createAction } = usePSSRPriorityActions(pssrId);

  // Fetch checklist responses for this PSSR
  const { data: checklistResponses } = useQuery({
    queryKey: ['pssr-checklist-responses-full', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];
      const { data, error } = await supabase
        .from('pssr_checklist_responses')
        .select('*')
        .eq('pssr_id', pssrId);
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  // Fetch all checklist items
  const { data: checklistItems } = useQuery({
    queryKey: ['pssr-checklist-items-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_checklist_items')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['pssr-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_checklist_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  // Build items grouped by category
  const groupedItems = useMemo(() => {
    if (!approvals || !checklistResponses || !checklistItems || !categories) return {};

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const itemsMap = new Map(checklistItems.map(i => [i.id, i]));
    const responsesMap = new Map(checklistResponses.map(r => [r.id, r]));
    const groups: Record<string, ChecklistItemWithResponse[]> = {};

    for (const approval of approvals) {
      const response = responsesMap.get(approval.checklist_response_id);
      if (!response) continue;

      const item = itemsMap.get(response.checklist_item_id);
      if (!item) continue;

      const categoryId = item.category;
      const categoryName = categoryMap.get(categoryId) || 'Uncategorized';

      if (!groups[categoryId]) {
        groups[categoryId] = [];
      }

      groups[categoryId].push({
        id: response.id,
        approvalId: approval.id,
        itemId: item.id,
        category: categoryId,
        categoryName,
        topic: item.topic,
        description: item.description,
        response: response.response,
        narrative: response.narrative,
        status: approval.status,
        comments: approval.comments,
        reviewedAt: approval.reviewed_at,
        sequenceNumber: item.sequence_number,
      });
    }

    // Sort items within each category
    Object.values(groups).forEach(items => {
      items.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    });

    return groups;
  }, [approvals, checklistResponses, checklistItems, categories]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleApprove = async (approvalId: string) => {
    await updateApproval.mutateAsync({
      approvalId,
      status: 'approved',
    });
  };

  const handleReject = async (approvalId: string, comments: string) => {
    await updateApproval.mutateAsync({
      approvalId,
      status: 'rejected',
      comments,
    });
  };

  const handlePriorityAction = (approvalId: string, priority: 'A' | 'B') => {
    setSelectedApproval(approvalId);
    setPriorityLevel(priority);
    setPriorityModalOpen(true);
  };

  const handleCreatePriorityAction = async (data: {
    description: string;
    actionOwnerId?: string;
    actionOwnerName?: string;
    targetDate?: string;
  }) => {
    if (!selectedApproval) return;

    await createAction.mutateAsync({
      itemApprovalId: selectedApproval,
      priority: priorityLevel,
      description: data.description,
      actionOwnerId: data.actionOwnerId,
      actionOwnerName: data.actionOwnerName,
      targetDate: data.targetDate,
    });

    // Also mark the item as approved with action
    await updateApproval.mutateAsync({
      approvalId: selectedApproval,
      status: 'approved_with_action',
    });

    setPriorityModalOpen(false);
    setSelectedApproval(null);
  };

  const allItemsReviewed = stats.approved + stats.rejected === stats.total && stats.total > 0;

  const isLoading = pssrLoading || approvalsLoading;

  if (isLoading) {
    return (
      <SidebarProvider>
        <OrshSidebar 
          currentPage="pssr" 
          onNavigate={createSidebarNavigator(navigate)}
          onLogout={() => navigate('/')}
        />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <OrshSidebar 
        currentPage="pssr" 
        onNavigate={createSidebarNavigator(navigate)}
        onLogout={() => navigate('/')}
      />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/pssr/approver-dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-foreground">PSSR Item Review</h1>
                <p className="text-muted-foreground mt-1">
                  Reviewing as: <Badge variant="secondary" className="ml-2">{approverRole}</Badge>
                </p>
              </div>
              
              {allItemsReviewed && !disciplineReview?.status?.includes('completed') && (
                <Button onClick={() => setShowCompletionPanel(true)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Review
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* PSSR Summary Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    PSSR Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Project</p>
                        <p className="font-medium">{pssr?.project_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-medium">{pssr?.cs_location || pssr?.plant || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Scope</p>
                        <p className="font-medium">{pssr?.scope || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Asset</p>
                        <p className="font-medium">{pssr?.asset || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {pssr?.reason && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Reason</p>
                        <p className="text-sm">{pssr.reason}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Progress Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="font-medium">Your Review Progress</span>
                    </div>
                    <span className="text-lg font-bold text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3 mb-4" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Items</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">{stats.readyForReview}</p>
                      <p className="text-xs text-muted-foreground">Ready for Review</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                      <p className="text-xs text-muted-foreground">Approved</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                      <p className="text-xs text-muted-foreground">Rejected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Actions Summary */}
              {priorityActions && priorityActions.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5" />
                      Priority Actions Created ({priorityActions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-red-100 dark:bg-red-950/30 rounded-lg">
                        <Badge variant="destructive" className="text-lg px-3 py-1">A</Badge>
                        <div>
                          <p className="font-medium">{priorityActions.filter(a => a.priority === 'A').length} Priority A</p>
                          <p className="text-xs text-muted-foreground">Must close before startup</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-orange-100 dark:bg-orange-950/30 rounded-lg">
                        <Badge className="bg-orange-500 text-lg px-3 py-1">B</Badge>
                        <div>
                          <p className="font-medium">{priorityActions.filter(a => a.priority === 'B').length} Priority B</p>
                          <p className="text-xs text-muted-foreground">Can close after startup</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items Grouped by Category */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Checklist Items by Category</h2>
                
                {Object.entries(groupedItems).map(([categoryId, items]) => {
                  const isExpanded = expandedCategories.has(categoryId);
                  const categoryName = items[0]?.categoryName || 'Unknown';
                  const approvedCount = items.filter(i => i.status === 'approved' || i.status === 'approved_with_action').length;
                  const totalCount = items.length;
                  const categoryProgress = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

                  return (
                    <Collapsible key={categoryId} open={isExpanded} onOpenChange={() => toggleCategory(categoryId)}>
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                                <CardTitle className="text-base">{categoryName}</CardTitle>
                                <Badge variant="outline">{totalCount} items</Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-32">
                                  <Progress value={categoryProgress} className="h-2" />
                                </div>
                                <span className="text-sm text-muted-foreground w-12 text-right">
                                  {approvedCount}/{totalCount}
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-4">
                            {items.map((item, index) => (
                              <ItemApprovalCard
                                key={item.approvalId}
                                item={item}
                                index={index + 1}
                                onApprove={() => handleApprove(item.approvalId)}
                                onReject={(comments) => handleReject(item.approvalId, comments)}
                                onPriorityA={() => handlePriorityAction(item.approvalId, 'A')}
                                onPriorityB={() => handlePriorityAction(item.approvalId, 'B')}
                                isUpdating={updateApproval.isPending}
                              />
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}

                {Object.keys(groupedItems).length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Items to Review</h3>
                      <p className="text-muted-foreground">
                        There are no checklist items assigned to you for this PSSR.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Priority Action Modal */}
        <PriorityActionModal
          open={priorityModalOpen}
          onOpenChange={setPriorityModalOpen}
          priority={priorityLevel}
          onSubmit={handleCreatePriorityAction}
          isSubmitting={createAction.isPending}
        />

        {/* Discipline Completion Panel */}
        <DisciplineCompletionPanel
          open={showCompletionPanel}
          onOpenChange={setShowCompletionPanel}
          pssrId={pssrId || ''}
          approverRole={approverRole}
          stats={stats}
          priorityActions={priorityActions || []}
        />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PSSRItemReview;
