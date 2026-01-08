import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  FileText, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ClipboardList,
  Clock,
  MapPin,
  Target,
  Building
} from 'lucide-react';
import { PSSRChecklistBrowser } from '@/components/pssr/PSSRChecklistBrowser';
import { ApproverDecisionPanel } from '@/components/pssr/ApproverDecisionPanel';
import { PriorityActionsWidget } from '@/components/pssr/PriorityActionsWidget';
import { ApproverCommentsHistory } from '@/components/pssr/ApproverCommentsHistory';
import { DisciplineSummariesPanel } from '@/components/pssr/DisciplineSummariesPanel';
import { usePSSRApprovers } from '@/hooks/usePSSRApprovers';
import { usePSSRPriorityActions } from '@/hooks/usePSSRPriorityActions';

const PSSRApprovalPage: React.FC = () => {
  const { id: pssrId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const approverId = searchParams.get('approverId');
  const [activeTab, setActiveTab] = useState('summary');

  // Fetch PSSR details
  const { data: pssr, isLoading: pssrLoading } = useQuery({
    queryKey: ['pssr-approval-details', pssrId],
    queryFn: async () => {
      if (!pssrId) return null;
      
      const { data, error } = await supabase
        .from('pssrs')
        .select(`
          *,
          projects(name, description)
        `)
        .eq('id', pssrId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  // Fetch approvers
  const { approvers, stats: approverStats, isLoading: approversLoading } = usePSSRApprovers(pssrId);
  
  // Fetch priority actions
  const { stats: priorityStats, canSignOff } = usePSSRPriorityActions(pssrId);

  // Fetch checklist stats
  const { data: checklistStats } = useQuery({
    queryKey: ['pssr-checklist-stats', pssrId],
    queryFn: async () => {
      if (!pssrId) return null;
      
      const { data: responses } = await supabase
        .from('pssr_checklist_responses')
        .select('id')
        .eq('pssr_id', pssrId);
      
      const { data: approvedItems } = await supabase
        .from('pssr_item_approvals')
        .select('id')
        .eq('pssr_id', pssrId)
        .in('status', ['approved', 'approved_with_action']);
      
      return {
        total: responses?.length || 0,
        approved: approvedItems?.length || 0,
      };
    },
    enabled: !!pssrId,
  });

  // Find current approver
  const currentApprover = approvers?.find(a => a.id === approverId);
  const isCurrentUserApprover = !!currentApprover && currentApprover.status === 'PENDING';

  if (pssrLoading || approversLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const pssrTitle = (pssr as any)?.title || (pssr as any)?.scope_intent || 'PSSR';
  const projectName = (pssr as any)?.projects?.name || 'N/A';
  const location = (pssr as any)?.cs_location || (pssr as any)?.plant || 'N/A';
  const scopeIntent = (pssr as any)?.scope_intent || 'N/A';
  const targetDate = (pssr as any)?.startup_date;

  if (!pssr) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">PSSR Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested PSSR could not be found.</p>
          <Button onClick={() => navigate('/pssr')}>Return to PSSR List</Button>
        </Card>
      </div>
    );
  }

  const completionPercentage = checklistStats 
    ? Math.round((checklistStats.approved / checklistStats.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{pssrTitle}</h1>
              <p className="text-muted-foreground text-sm">PSSR Approval Review</p>
            </div>
            {isCurrentUserApprover && (
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 px-4 py-1">
                Your Approval Required
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* PSSR Summary Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    PSSR Summary
                  </CardTitle>
                  <Badge variant="secondary" className="capitalize">
                    {pssr.status?.toLowerCase().replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Project</p>
                        <p className="text-sm font-medium">{projectName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm font-medium">{location}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Scope/Intent</p>
                        <p className="text-sm font-medium">{scopeIntent}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Target Date</p>
                        <p className="text-sm font-medium">
                          {targetDate ? new Date(targetDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Completion Stats */}
                <div className="grid grid-cols-4 gap-3 mt-6 pt-4 border-t">
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{completionPercentage}%</div>
                    <div className="text-xs text-muted-foreground">Items Approved</div>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {approverStats.approved}/{approverStats.total}
                    </div>
                    <div className="text-xs text-muted-foreground">Approvals</div>
                  </div>
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{priorityStats.priorityA.closed}</div>
                    <div className="text-xs text-muted-foreground">Priority A Closed</div>
                  </div>
                  <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{priorityStats.priorityB.open}</div>
                    <div className="text-xs text-muted-foreground">Priority B Open</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for detailed views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="disciplines" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Disciplines
                </TabsTrigger>
                <TabsTrigger value="actions" className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Actions
                </TabsTrigger>
                <TabsTrigger value="checklist" className="flex items-center gap-1">
                  <ClipboardList className="h-4 w-4" />
                  Checklist
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Approval Progress</CardTitle>
                    <CardDescription>Sequential approval workflow status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {approvers?.map((approver, index) => (
                        <div 
                          key={approver.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border ${
                            approver.id === approverId 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border'
                          }`}
                        >
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            approver.status === 'APPROVED' 
                              ? 'bg-green-500/20 text-green-600'
                              : approver.status === 'REJECTED'
                              ? 'bg-destructive/20 text-destructive'
                              : approver.id === approverId
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {approver.status === 'APPROVED' ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <span className="font-semibold">{index + 1}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{approver.approver_name}</p>
                            <p className="text-sm text-muted-foreground">{approver.approver_role}</p>
                          </div>
                          <Badge variant={
                            approver.status === 'APPROVED' ? 'default' :
                            approver.status === 'REJECTED' ? 'destructive' :
                            'secondary'
                          }>
                            {approver.status}
                          </Badge>
                          {approver.approved_at && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(approver.approved_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Approver Comments History */}
                <div className="mt-4">
                  <ApproverCommentsHistory pssrId={pssrId!} />
                </div>
              </TabsContent>

              <TabsContent value="disciplines" className="mt-4">
                <DisciplineSummariesPanel pssrId={pssrId!} />
              </TabsContent>

              <TabsContent value="actions" className="mt-4">
                <PriorityActionsWidget pssrId={pssrId!} showSignOffBlock />
              </TabsContent>

              <TabsContent value="checklist" className="mt-4">
                <PSSRChecklistBrowser pssrId={pssrId!} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Decision Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <ApproverDecisionPanel 
                pssrId={pssrId!}
                pssrTitle={pssrTitle}
                approverId={approverId}
                currentApprover={currentApprover}
                canSignOff={canSignOff}
                onApprovalComplete={() => navigate('/pssr/approver-dashboard')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PSSRApprovalPage;
