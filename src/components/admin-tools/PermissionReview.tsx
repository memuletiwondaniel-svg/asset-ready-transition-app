import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, ClipboardCheck, Plus, Calendar, Users, CheckCircle2, XCircle, Clock, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PermissionReviewProps {
  onBack: () => void;
}

const PermissionReview: React.FC<PermissionReviewProps> = ({ onBack }) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['permission-review-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_review_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch review items for selected campaign
  const { data: reviewItems = [] } = useQuery({
    queryKey: ['permission-review-items', selectedCampaignId],
    queryFn: async () => {
      if (!selectedCampaignId) return [];
      const { data, error } = await supabase
        .from('permission_review_items')
        .select('*')
        .eq('campaign_id', selectedCampaignId)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCampaignId,
  });

  // Fetch high-privilege audit alerts
  const { data: recentAlerts = [] } = useQuery({
    queryKey: ['high-privilege-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('category', 'security')
        .eq('action', 'high_privilege_granted')
        .order('timestamp', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Create campaign with all active users
  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create campaign
      const { data: campaign, error: campaignErr } = await supabase
        .from('permission_review_campaigns')
        .insert({
          title: newCampaignTitle || `Quarterly Review - ${format(new Date(), 'MMM yyyy')}`,
          description: newCampaignDesc || 'Quarterly permission access review',
          scheduled_date: new Date().toISOString().split('T')[0],
          status: 'in_progress',
          created_by: user.id,
        })
        .select()
        .single();
      if (campaignErr) throw campaignErr;

      // Get all active users with roles
      const { data: activeUsers, error: usersErr } = await supabase
        .from('profiles')
        .select('user_id, role')
        .eq('is_active', true)
        .eq('status', 'active');
      if (usersErr) throw usersErr;

      // Get each user's permissions
      const items = await Promise.all(
        (activeUsers || []).map(async (u) => {
          const { data: perms } = await supabase.rpc('get_user_permissions', { _user_id: u.user_id });
          return {
            campaign_id: campaign.id,
            user_id: u.user_id,
            reviewer_id: user.id,
            current_role_id: u.role,
            current_permissions: (perms as string[]) || [],
            decision: 'pending',
          };
        })
      );

      if (items.length > 0) {
        const { error: itemsErr } = await supabase
          .from('permission_review_items')
          .insert(items);
        if (itemsErr) throw itemsErr;
      }

      return campaign;
    },
    onSuccess: (campaign) => {
      toast.success('Permission review campaign created', {
        description: `Campaign "${campaign.title}" started`,
      });
      setShowCreateDialog(false);
      setNewCampaignTitle('');
      setNewCampaignDesc('');
      setSelectedCampaignId(campaign.id);
      queryClient.invalidateQueries({ queryKey: ['permission-review-campaigns'] });
    },
    onError: (err: any) => toast.error('Failed to create campaign', { description: err.message }),
  });

  // Update review decision
  const updateDecisionMutation = useMutation({
    mutationFn: async ({ itemId, decision, notes }: { itemId: string; decision: string; notes?: string }) => {
      const { error } = await supabase
        .from('permission_review_items')
        .update({
          decision,
          notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-review-items', selectedCampaignId] });
      toast.success('Decision recorded');
    },
  });

  const getDecisionBadge = (decision: string | null) => {
    switch (decision) {
      case 'confirmed': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'revoked': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
      case 'modified': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Modified</Badge>;
      default: return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-500/10 text-emerald-600">Completed</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/10 text-blue-600">In Progress</Badge>;
      case 'scheduled': return <Badge variant="outline">Scheduled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={selectedCampaignId ? () => setSelectedCampaignId(null) : onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {selectedCampaignId ? selectedCampaign?.title : 'Permission Reviews'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedCampaignId ? 'Review individual user permissions' : 'Schedule and manage periodic access reviews'}
              </p>
            </div>
          </div>
          {!selectedCampaignId && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Review Campaign
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* High-Privilege Alerts */}
        {!selectedCampaignId && recentAlerts.length > 0 && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg">Recent High-Privilege Grants</CardTitle>
                <Badge variant="destructive">{recentAlerts.length}</Badge>
              </div>
              <CardDescription>Sensitive permissions recently granted — review required</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{alert.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(alert.timestamp), 'PPp')}</p>
                    </div>
                    <Shield className="h-4 w-4 text-red-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign List or Review Items */}
        {!selectedCampaignId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Campaigns</CardTitle>
              <CardDescription>Track periodic permission access certifications</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No review campaigns yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first quarterly review to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedCampaignId(campaign.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{campaign.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {campaign.description} · {format(new Date(campaign.scheduled_date), 'PP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(campaign.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">User Access Review</CardTitle>
                  <CardDescription>{reviewItems.length} users to review</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {reviewItems.filter(i => i.decision !== 'pending').length}/{reviewItems.length} reviewed
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reviewItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users in this campaign</p>
              ) : (
                <div className="space-y-3">
                  {reviewItems.map((item) => (
                    <div key={item.id} className="p-4 rounded-lg border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">User: {item.user_id.slice(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">
                            Permissions: {(item.current_permissions || []).join(', ') || 'None'}
                          </p>
                        </div>
                        {getDecisionBadge(item.decision)}
                      </div>
                      {item.decision === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 hover:bg-emerald-50"
                            onClick={() => updateDecisionMutation.mutate({ itemId: item.id, decision: 'confirmed' })}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => updateDecisionMutation.mutate({ itemId: item.id, decision: 'revoked' })}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Revoke
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Permission Review Campaign</DialogTitle>
            <DialogDescription>
              This will create a review campaign and populate it with all active users and their current permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Campaign Title</label>
              <Input
                placeholder={`Quarterly Review - ${format(new Date(), 'MMM yyyy')}`}
                value={newCampaignTitle}
                onChange={(e) => setNewCampaignTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Quarterly permission access certification..."
                value={newCampaignDesc}
                onChange={(e) => setNewCampaignDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createCampaignMutation.mutate()} disabled={createCampaignMutation.isPending}>
              {createCampaignMutation.isPending ? 'Creating...' : 'Start Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionReview;
