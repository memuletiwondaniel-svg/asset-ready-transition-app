import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  MessageSquare, 
  UserCheck, 
  UserX,
  Share2,
  AlertTriangle,
  Download,
  Eye,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PendingReview {
  id: string;
  pssr_id: string;
  checklist_item_id: string;
  asset: string;
  project_name?: string;
  reason: string;
  response: 'YES' | 'NO' | 'N/A';
  narrative?: string;
  deviation_reason?: string;
  potential_risk?: string;
  mitigations?: string;
  follow_up_action?: string;
  action_owner?: string;
  justification?: string;
  supporting_documents?: File[];
  submitted_at: string;
  pssr: {
    id: string;
    pssr_id: string;
    asset: string;
    reason: string;
    project_name?: string;
    scope?: string;
    plant?: string;
  };
}

interface ApprovalReviewPageProps {
  user: any;
  onBack: () => void;
}

const ApprovalReviewPage: React.FC<ApprovalReviewPageProps> = ({ user, onBack }) => {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedDelegate, setSelectedDelegate] = useState<string>('');
  const [delegationReason, setDelegationReason] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingReviews();
    fetchAvailableUsers();
  }, [user]);

  const fetchPendingReviews = async () => {
    try {
      // Get checklist responses that need review by this user
      const { data: responses, error } = await supabase
        .from('pssr_checklist_responses')
        .select(`
          id,
          pssr_id,
          checklist_item_id,
          response,
          narrative,
          deviation_reason,
          potential_risk,
          mitigations,
          follow_up_action,
          action_owner,
          justification,
          submitted_at,
          pssr:pssrs(
            id,
            pssr_id,
            asset,
            reason,
            project_name,
            scope,
            plant
          )
        `)
        .eq('status', 'UNDER_REVIEW')
        .not('response', 'is', null);

      if (error) throw error;

      // Filter based on user's approval authority (mock implementation)
      // In a real system, this would check against approver assignments
      const formattedResponses = (responses || []).map(response => ({
        ...response,
        asset: response.pssr?.asset || '',
        reason: response.pssr?.reason || '',
        response: response.response as 'YES' | 'NO' | 'N/A'
      }));
      
      setPendingReviews(formattedResponses as PendingReview[]);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending reviews",
        variant: "destructive",
      });
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role, department')
        .eq('is_active', true)
        .neq('user_id', user.id);

      if (error) throw error;
      setAvailableUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleReviewItem = (review: PendingReview) => {
    setSelectedReview(review);
    setReviewComments('');
    setReviewModalOpen(true);
  };

  const handleApproveItem = async (status: 'SUPPORTED' | 'REQUEST_INFO') => {
    if (!selectedReview) return;

    setLoading(true);
    try {
      // Create review record
      const { error: reviewError } = await supabase
        .from('checklist_item_reviews')
        .insert({
          pssr_id: selectedReview.pssr_id,
          checklist_item_id: selectedReview.checklist_item_id,
          reviewer_user_id: user.id,
          status,
          comments: reviewComments,
          reviewed_at: new Date().toISOString()
        });

      if (reviewError) throw reviewError;

      // Update checklist response status if supported
      if (status === 'SUPPORTED') {
        const { error: updateError } = await supabase
          .from('pssr_checklist_responses')
          .update({ 
            status: 'APPROVED',
            approved_at: new Date().toISOString()
          })
          .eq('id', selectedReview.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: status === 'SUPPORTED' 
          ? "Checklist item has been approved" 
          : "Additional information has been requested",
      });

      await fetchPendingReviews();
      setReviewModalOpen(false);
      setSelectedReview(null);
    } catch (error) {
      console.error('Error reviewing item:', error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelegateTask = async () => {
    if (!selectedReview || !selectedDelegate) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('task_delegations')
        .insert({
          pssr_id: selectedReview.pssr_id,
          checklist_item_id: selectedReview.checklist_item_id,
          original_approver_id: user.id,
          delegated_to_user_id: selectedDelegate,
          delegation_reason: delegationReason,
          created_by: user.id
        });

      if (error) throw error;

      // Send notification to delegated user
      const delegatedUser = availableUsers.find(u => u.user_id === selectedDelegate);
      if (delegatedUser) {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'TASK_DELEGATED',
            recipientEmail: delegatedUser.email,
            recipientUserId: selectedDelegate,
            senderUserId: user.id,
            pssrId: selectedReview.pssr_id,
            checklistItemId: selectedReview.checklist_item_id,
            title: 'PSSR Review Task Delegated',
            content: `A PSSR review task has been delegated to you for ${selectedReview.pssr.pssr_id}`
          }
        });
      }

      toast({
        title: "Success",
        description: "Task has been delegated successfully",
      });

      await fetchPendingReviews();
      setDelegateModalOpen(false);
      setSelectedDelegate('');
      setDelegationReason('');
    } catch (error) {
      console.error('Error delegating task:', error);
      toast({
        title: "Error",
        description: "Failed to delegate task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getResponseBadge = (response: string) => {
    switch (response) {
      case 'YES':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">YES</Badge>;
      case 'NO':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Request Deviation</Badge>;
      case 'N/A':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Not Applicable</Badge>;
      default:
        return null;
    }
  };

  const groupedReviews = pendingReviews.reduce((acc, review) => {
    const pssrId = review.pssr.pssr_id;
    if (!acc[pssrId]) {
      acc[pssrId] = {
        pssr: review.pssr,
        items: []
      };
    }
    acc[pssrId].items.push(review);
    return acc;
  }, {} as Record<string, { pssr: any; items: PendingReview[] }>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">PSSR Review Dashboard</h1>
              <p className="text-sm text-gray-600">Pending checklist items for your review</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {pendingReviews.length} Pending Reviews
              </Badge>
              <Button variant="outline" onClick={onBack}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {Object.keys(groupedReviews).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Reviews</h3>
              <p className="text-gray-600">All checklist items have been reviewed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedReviews).map(([pssrId, group]) => (
              <Card key={pssrId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span>{group.pssr.pssr_id}</span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {group.items.length} items pending
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReview(group.items[0]);
                        setDelegateModalOpen(true);
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Delegate Tasks
                    </Button>
                  </CardTitle>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Asset:</strong> {group.pssr.asset}</p>
                    <p><strong>Reason:</strong> {group.pssr.reason}</p>
                    {group.pssr.project_name && (
                      <p><strong>Project:</strong> {group.pssr.project_name}</p>
                    )}
                    {group.pssr.plant && (
                      <p><strong>Plant:</strong> {group.pssr.plant}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {group.items.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium text-sm">{review.checklist_item_id}</span>
                              {getResponseBadge(review.response)}
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {new Date(review.submitted_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {review.response === 'YES' && review.narrative && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-700">Narrative:</p>
                                <p className="text-sm text-gray-600">{review.narrative}</p>
                              </div>
                            )}
                            
                            {review.response === 'NO' && (
                              <div className="mt-2 space-y-2">
                                {review.deviation_reason && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Deviation Reason:</p>
                                    <p className="text-sm text-gray-600">{review.deviation_reason}</p>
                                  </div>
                                )}
                                {review.potential_risk && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Potential Risk:</p>
                                    <p className="text-sm text-gray-600">{review.potential_risk}</p>
                                  </div>
                                )}
                                {review.mitigations && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Mitigations:</p>
                                    <p className="text-sm text-gray-600">{review.mitigations}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {review.response === 'N/A' && review.justification && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-700">Justification:</p>
                                <p className="text-sm text-gray-600">{review.justification}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReviewItem(review)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Review Modal */}
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Checklist Item</DialogTitle>
            </DialogHeader>
            
            {selectedReview && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {selectedReview.pssr.pssr_id} - {selectedReview.checklist_item_id}
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Response:</strong> {getResponseBadge(selectedReview.response)}</p>
                    <p><strong>Asset:</strong> {selectedReview.pssr.asset}</p>
                    <p><strong>Project:</strong> {selectedReview.pssr.project_name || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="review-comments">Review Comments</Label>
                  <Textarea
                    id="review-comments"
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Add your review comments..."
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setReviewModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleApproveItem('REQUEST_INFO')}
                    disabled={loading}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Request Additional Info
                  </Button>
                  <Button
                    onClick={() => handleApproveItem('SUPPORTED')}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Support
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delegate Modal */}
        <Dialog open={delegateModalOpen} onOpenChange={setDelegateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delegate Review Tasks</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="delegate-user">Select User to Delegate To</Label>
                <Select onValueChange={setSelectedDelegate} value={selectedDelegate}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.full_name}</span>
                          <span className="text-sm text-gray-500">{user.email} - {user.role}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="delegation-reason">Reason for Delegation</Label>
                <Textarea
                  id="delegation-reason"
                  value={delegationReason}
                  onChange={(e) => setDelegationReason(e.target.value)}
                  placeholder="Explain why you're delegating this task..."
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setDelegateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDelegateTask}
                  disabled={loading || !selectedDelegate}
                >
                  {loading ? 'Delegating...' : 'Delegate Task'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ApprovalReviewPage;