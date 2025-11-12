import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const ORMPendingReviewsWidget: React.FC = () => {
  const navigate = useNavigate();

  const { data: pendingReviews, isLoading } = useQuery({
    queryKey: ['orm-pending-reviews'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      // Get profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.user.id)
        .single();

      // Get deliverables pending review based on user role
      let query = supabase
        .from('orm_deliverables')
        .select(`
          *,
          orm_plan:orm_plans(
            project:projects(project_title)
          ),
          assigned_resource:profiles!orm_deliverables_assigned_resource_id_fkey(full_name)
        `);

      // Filter based on workflow stage and user role
      if (profile?.role === 'qaqc_reviewer') {
        query = query.eq('workflow_stage', 'QAQC_REVIEW');
      } else if (profile?.role === 'orm_lead') {
        query = query.eq('workflow_stage', 'LEAD_REVIEW');
      } else if (profile?.role === 'central_maintenance_lead') {
        query = query.eq('workflow_stage', 'CENTRAL_TEAM_REVIEW');
      } else {
        // For regular users, show items they are assigned to that need review
        query = query
          .eq('assigned_resource_id', user.user.id)
          .in('workflow_stage', ['QAQC_REVIEW', 'LEAD_REVIEW', 'CENTRAL_TEAM_REVIEW']);
      }

      const { data, error } = await query.order('updated_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    }
  });

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      QAQC_REVIEW: 'QA/QC Review',
      LEAD_REVIEW: 'Lead Review',
      CENTRAL_TEAM_REVIEW: 'Central Team Review'
    };
    return labels[stage] || stage;
  };

  const getDeliverableLabel = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/or-maintenance')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">ORM Pending Reviews</CardTitle>
        <AlertCircle className="h-4 w-4 text-orange-500" />
      </CardHeader>
      <CardContent>
        {pendingReviews && pendingReviews.length > 0 ? (
          <div className="space-y-3">
            <div className="text-2xl font-bold">{pendingReviews.length}</div>
            <div className="space-y-2">
              {pendingReviews.slice(0, 3).map((review: any) => (
                <div key={review.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {review.orm_plan?.project?.project_title || 'Unknown Project'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getDeliverableLabel(review.deliverable_type)}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {getStageLabel(review.workflow_stage)}
                  </Badge>
                </div>
              ))}
              {pendingReviews.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{pendingReviews.length - 3} more
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">No pending reviews</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
