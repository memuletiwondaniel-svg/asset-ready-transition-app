import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  Shield, 
  Crown,
  Star,
  Send,
  Eye,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PSSRStepEightProps {
  data: any;
  onDataUpdate: (stepData: any) => void;
  onNext: () => void;
  onBack: () => void;
  onSave: () => void;
  currentPssrId?: string | null;
}

interface Approver {
  id: string;
  name: string;
  role: string;
  tier: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  avatar?: string;
  department?: string;
}

const PSSRStepEight: React.FC<PSSRStepEightProps> = ({ 
  data, 
  onDataUpdate, 
  onNext, 
  onBack, 
  onSave,
  currentPssrId 
}) => {
  const [activeTab, setActiveTab] = useState('workflow');
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [currentTier, setCurrentTier] = useState(1);
  const [workflowStatus, setWorkflowStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>('NOT_STARTED');
  const [allChecklistItemsApproved, setAllChecklistItemsApproved] = useState(false);
  const { toast } = useToast();

  // Mock approvers data organized by tiers
  const mockApprovers: Approver[] = [
    // Tier 1 Approvers - Technical Authorities
    {
      id: 'approver-1',
      name: 'Dr. Sarah Wilson',
      role: 'Process Engineering TA',
      tier: 1,
      status: 'PENDING',
      avatar: '/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png',
      department: 'Process Engineering'
    },
    {
      id: 'approver-2',
      name: 'John Smith',
      role: 'Technical Safety TA',
      tier: 1,
      status: 'PENDING',
      avatar: '/lovable-uploads/b229716e-e39e-41cb-91d3-2c30dd517fa8.png',
      department: 'Safety Engineering'
    },
    {
      id: 'approver-3',
      name: 'Maria Garcia',
      role: 'Mechanical Static TA',
      tier: 1,
      status: 'PENDING',
      avatar: '/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png',
      department: 'Mechanical Engineering'
    },
    // Tier 2 Approvers - Department Heads
    {
      id: 'approver-4',
      name: 'Omar Hassan',
      role: 'Deputy Plant Director',
      tier: 2,
      status: 'PENDING',
      avatar: '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png',
      department: 'Plant Operations'
    },
    {
      id: 'approver-5',
      name: 'Lisa Chen',
      role: 'Engineering Manager',
      tier: 2,
      status: 'PENDING',
      avatar: '/lovable-uploads/f183d942-af72-43b6-8db2-66997da17688.png',
      department: 'Engineering'
    },
    // Tier 3 Approvers - Senior Leadership
    {
      id: 'approver-6',
      name: 'David Park',
      role: 'Plant Director',
      tier: 3,
      status: 'PENDING',
      avatar: '/lovable-uploads/81080018-90d7-4e00-a4b2-ee1682e5d8bd.png',
      department: 'Plant Leadership'
    }
  ];

  useEffect(() => {
    setApprovers(mockApprovers);
    // Simulate checking if all checklist items are approved
    setAllChecklistItemsApproved(true); // This would come from actual checklist data
  }, []);

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case 1: return <Shield className="h-4 w-4" />;
      case 2: return <Crown className="h-4 w-4" />;
      case 3: return <Star className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 2: return 'bg-purple-100 text-purple-800 border-purple-200';
      case 3: return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle2 className="h-4 w-4" />;
      case 'REJECTED': return <AlertCircle className="h-4 w-4" />;
      case 'PENDING': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getApproversByTier = (tier: number) => {
    return approvers.filter(approver => approver.tier === tier);
  };

  const isTierComplete = (tier: number) => {
    const tierApprovers = getApproversByTier(tier);
    return tierApprovers.length > 0 && tierApprovers.every(approver => approver.status === 'APPROVED');
  };

  const canStartNextTier = (tier: number) => {
    if (tier === 1) return allChecklistItemsApproved;
    return isTierComplete(tier - 1);
  };

  const getWorkflowProgress = () => {
    const totalApprovers = approvers.length;
    const approvedCount = approvers.filter(a => a.status === 'APPROVED').length;
    return totalApprovers > 0 ? (approvedCount / totalApprovers) * 100 : 0;
  };

  const handleInitiateApprovalWorkflow = async () => {
    if (!allChecklistItemsApproved) {
      toast({
        title: "Cannot initiate approval",
        description: "All checklist items must be reviewed and approved before starting the PSSR approval workflow.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Send notifications to Tier 1 approvers
      const tier1Approvers = getApproversByTier(1);
      
      for (const approver of tier1Approvers) {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'PSSR_APPROVAL_REQUEST',
            recipientEmail: `${approver.name.toLowerCase().replace(' ', '.')}@company.com`,
            pssrId: currentPssrId || 'PSSR-2024-001',
            approverName: approver.name,
            approverTier: 1
          }
        });
      }

      setWorkflowStatus('IN_PROGRESS');
      setCurrentTier(1);
      
      toast({
        title: "Approval workflow initiated",
        description: `Approval requests sent to ${tier1Approvers.length} Tier 1 approvers.`
      });

    } catch (error) {
      console.error('Error initiating approval workflow:', error);
      toast({
        title: "Error",
        description: "Failed to initiate approval workflow. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleApproverAction = async (approverId: string, action: 'APPROVE' | 'REJECT') => {
    const updatedApprovers = approvers.map(approver => {
      if (approver.id === approverId) {
        return {
          ...approver,
          status: action === 'APPROVE' ? 'APPROVED' as const : 'REJECTED' as const,
          approvedAt: new Date().toISOString()
        };
      }
      return approver;
    });

    setApprovers(updatedApprovers);

    // Check if current tier is complete and initiate next tier
    const approver = approvers.find(a => a.id === approverId);
    if (approver && action === 'APPROVE') {
      const tierApprovers = getApproversByTier(approver.tier);
      const tierComplete = tierApprovers.every(a => 
        a.id === approverId || updatedApprovers.find(ua => ua.id === a.id)?.status === 'APPROVED'
      );

      if (tierComplete && approver.tier < 3) {
        // Initiate next tier
        const nextTier = approver.tier + 1;
        const nextTierApprovers = getApproversByTier(nextTier);
        
        for (const nextApprover of nextTierApprovers) {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'PSSR_APPROVAL_REQUEST',
              recipientEmail: `${nextApprover.name.toLowerCase().replace(' ', '.')}@company.com`,
              pssrId: currentPssrId || 'PSSR-2024-001',
              approverName: nextApprover.name,
              approverTier: nextTier
            }
          });
        }

        setCurrentTier(nextTier);
        toast({
          title: `Tier ${approver.tier} complete`,
          description: `Initiating Tier ${nextTier} approvals.`
        });
      } else if (tierComplete && approver.tier === 3) {
        // All approvals complete
        setWorkflowStatus('COMPLETED');
        toast({
          title: "PSSR Approved!",
          description: "All required approvals have been received. The PSSR is now approved."
        });
      }
    }

    toast({
      title: action === 'APPROVE' ? "Approval recorded" : "Rejection recorded",
      description: `${approver?.name} has ${action === 'APPROVE' ? 'approved' : 'rejected'} the PSSR.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              PSSR Approval Workflow
            </span>
            <Badge 
              variant="outline" 
              className={`${workflowStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                         workflowStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 
                         'bg-gray-100 text-gray-800'}`}
            >
              {workflowStatus.replace('_', ' ')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Prerequisites Check */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle2 className={`h-5 w-5 mr-2 ${allChecklistItemsApproved ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="font-medium">All checklist items reviewed and approved</span>
                </div>
                <Badge variant="outline" className={allChecklistItemsApproved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                  {allChecklistItemsApproved ? 'Complete' : 'Pending'}
                </Badge>
              </div>
              {!allChecklistItemsApproved && (
                <p className="text-sm text-blue-700 mt-2">
                  Complete Step 7 (Approve Checklist Items) before initiating the PSSR approval workflow.
                </p>
              )}
            </div>

            {/* Progress Overview */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Approval Progress</span>
                <span className="text-sm text-gray-600">{Math.round(getWorkflowProgress())}% Complete</span>
              </div>
              <Progress value={getWorkflowProgress()} className="w-full h-3" />
            </div>

            {/* Initiate Workflow Button */}
            {workflowStatus === 'NOT_STARTED' && (
              <div className="pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={!allChecklistItemsApproved}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Initiate PSSR Approval Workflow
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Initiate PSSR Approval Workflow</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will start the tiered approval process. Approval requests will be sent to Tier 1 approvers first, 
                        followed by Tier 2 and Tier 3 in sequence. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleInitiateApprovalWorkflow}>
                        Initiate Workflow
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approval Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="tier1">Tier 1</TabsTrigger>
          <TabsTrigger value="tier2">Tier 2</TabsTrigger>
          <TabsTrigger value="tier3">Tier 3</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3].map(tier => {
                  const tierApprovers = getApproversByTier(tier);
                  const tierComplete = isTierComplete(tier);
                  const canStart = canStartNextTier(tier);
                  const isActive = currentTier === tier && workflowStatus === 'IN_PROGRESS';

                  return (
                    <div key={tier} className="relative">
                      <div className={`border rounded-lg p-4 ${
                        tierComplete ? 'border-green-200 bg-green-50' :
                        isActive ? 'border-blue-200 bg-blue-50' :
                        canStart ? 'border-yellow-200 bg-yellow-50' :
                        'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            {getTierIcon(tier)}
                            <h3 className="font-semibold ml-2">Tier {tier} Approvers</h3>
                            <Badge variant="outline" className={`ml-2 ${getTierColor(tier)}`}>
                              {tier === 1 ? 'Technical Authorities' : 
                               tier === 2 ? 'Department Heads' : 
                               'Senior Leadership'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className={`${
                              tierComplete ? 'bg-green-100 text-green-800' :
                              isActive ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {tierApprovers.filter(a => a.status === 'APPROVED').length}/{tierApprovers.length} Approved
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {tierApprovers.map(approver => (
                            <div key={approver.id} className="flex items-center space-x-3 p-3 bg-white rounded border">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={approver.avatar} alt={approver.name} />
                                <AvatarFallback>
                                  {approver.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{approver.name}</p>
                                <p className="text-xs text-gray-600">{approver.role}</p>
                              </div>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(approver.status)}`}>
                                {getStatusIcon(approver.status)}
                                {approver.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Connector line */}
                      {tier < 3 && (
                        <div className="flex justify-center my-2">
                          <div className="w-px h-8 bg-gray-300"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Tier Tabs */}
        {[1, 2, 3].map(tier => (
          <TabsContent key={tier} value={`tier${tier}`} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {getTierIcon(tier)}
                  <span className="ml-2">Tier {tier} Approvers</span>
                  <Badge variant="outline" className={`ml-2 ${getTierColor(tier)}`}>
                    {tier === 1 ? 'Technical Authorities' : 
                     tier === 2 ? 'Department Heads' : 
                     'Senior Leadership'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getApproversByTier(tier).map(approver => (
                    <Card key={approver.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={approver.avatar} alt={approver.name} />
                            <AvatarFallback>
                              {approver.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium">{approver.name}</h4>
                            <p className="text-sm text-gray-600">{approver.role}</p>
                            <p className="text-xs text-gray-500">{approver.department}</p>
                          </div>
                          <Badge variant="outline" className={`${getStatusColor(approver.status)}`}>
                            {getStatusIcon(approver.status)}
                            {approver.status}
                          </Badge>
                        </div>
                        
                        {approver.status === 'PENDING' && workflowStatus === 'IN_PROGRESS' && currentTier >= tier && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleApproverAction(approver.id, 'APPROVE')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleApproverAction(approver.id, 'REJECT')}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        
                        {approver.approvedAt && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {approver.status === 'APPROVED' ? 'Approved' : 'Action taken'} on {new Date(approver.approvedAt).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Status Messages */}
      {workflowStatus === 'COMPLETED' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <h3 className="font-semibold text-green-800">PSSR Approved Successfully!</h3>
                <p className="text-sm text-green-700">
                  All required approvals have been received. The PSSR is now ready for implementation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PSSRStepEight;