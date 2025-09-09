import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  FileText, 
  MessageSquare,
  Calendar,
  Link2,
  Building,
  Target,
  User,
  AlertTriangle,
  Settings,
  BarChart3,
  Shield
} from 'lucide-react';

interface PSSRDashboardProps {
  pssrId: string;
  onBack: () => void;
}

const PSSRDashboard: React.FC<PSSRDashboardProps> = ({ pssrId, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock comprehensive PSSR data
  const pssrData = {
    id: pssrId,
    title: 'NRNGL Plant Start-up Commissioning',
    asset: 'NRNGL Plant',
    reason: 'Start-up or Commissioning of a new Asset',
    projectId: 'BGC-2024-001',
    projectName: 'Phase 3 Expansion Project',
    status: 'Under Review',
    progress: 75,
    created: '2024-01-15',
    dueDate: '2024-02-15',
    initiator: 'Ahmed Al-Rashid',
    scope: 'Pre-start-up safety review for the commissioning of new natural gas processing units including safety systems, process controls, and emergency shutdown procedures.',
    pendingApprovals: 3,
    
    // Progress by category
    categoryProgress: {
      hardwareIntegrity: { completed: 18, total: 25, percentage: 72 },
      processSafety: { completed: 22, total: 30, percentage: 73 },
      documentation: { completed: 15, total: 18, percentage: 83 },
      organization: { completed: 12, total: 15, percentage: 80 },
      healthSafety: { completed: 20, total: 24, percentage: 83 }
    },

    // Outstanding actions by approvers
    approvers: [
      {
        id: '1',
        name: 'Dr. Sarah Wilson',
        title: 'Process Engineering TA',
        avatar: '/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png',
        openItems: 0,
        status: 'Approved'
      },
      {
        id: '2',
        name: 'John Smith',
        title: 'Technical Safety TA',
        avatar: '/lovable-uploads/b229716e-e39e-41cb-91d3-2c30dd517fa8.png',
        openItems: 3,
        status: 'Pending'
      },
      {
        id: '3',
        name: 'Maria Garcia',
        title: 'Mechanical Static TA',
        avatar: '/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png',
        openItems: 2,
        status: 'Under Review'
      },
      {
        id: '4',
        name: 'Omar Hassan',
        title: 'Deputy Plant Director',
        avatar: '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png',
        openItems: 1,
        status: 'Under Review'
      }
    ],

    // PSSR Events status
    events: [
      {
        name: 'PSSR Kick-off',
        status: 'Completed',
        date: '2024-01-18',
        attendees: 12,
        type: 'kickoff'
      },
      {
        name: 'PSSR Walkdown',
        status: 'Scheduled',
        date: '2024-02-05',
        attendees: 8,
        type: 'walkdown'
      }
    ],

    // Linked PSSRs
    linkedPSSRs: [
      {
        id: 'PSSR-2024-002',
        title: 'Utility Systems Review',
        status: 'Completed',
        progress: 100,
        relationship: 'Prerequisite'
      },
      {
        id: 'PSSR-2024-003',
        title: 'Emergency Systems Verification',
        status: 'In Progress',
        progress: 45,
        relationship: 'Dependent'
      }
    ],

    // Recent activities
    recentActivities: [
      {
        id: '1',
        type: 'approval',
        title: 'Technical Authority approval received',
        description: 'Dr. Sarah Wilson approved Process Engineering review',
        timestamp: '2 hours ago',
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      {
        id: '2',
        type: 'submission',
        title: 'Checklist item submitted',
        description: 'Safety Systems Integration - submitted for review',
        timestamp: '5 hours ago',
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      {
        id: '3',
        type: 'assignment',
        title: 'Team member assigned',
        description: 'John Smith assigned as Technical Safety TA',
        timestamp: '1 day ago',
        icon: Users,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
      },
      {
        id: '4',
        type: 'deviation',
        title: 'Deviation request submitted',
        description: 'Temporary bypass for calibration equipment',
        timestamp: '2 days ago',
        icon: AlertTriangle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'under review':
      case 'in progress': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
      case 'scheduled': 
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed': 
        return <CheckCircle2 className="h-4 w-4" />;
      case 'under review':
      case 'in progress': 
        return <Clock className="h-4 w-4" />;
      case 'pending':
      case 'scheduled': 
        return <AlertCircle className="h-4 w-4" />;
      default: 
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      hardwareIntegrity: Settings,
      processSafety: Shield,
      documentation: FileText,
      organization: Users,
      healthSafety: AlertTriangle
    };
    return icons[category as keyof typeof icons] || BarChart3;
  };

  const formatCategoryName = (category: string) => {
    return category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PSSR List
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{pssrData.id}</h1>
                <p className="text-sm text-gray-600">{pssrData.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge 
                variant="outline" 
                className={`flex items-center gap-2 ${getStatusColor(pssrData.status)}`}
              >
                {getStatusIcon(pssrData.status)}
                {pssrData.status}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="approvers">Approvers</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* PSSR Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    PSSR Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">PSSR ID</label>
                      <p className="text-sm text-gray-900">{pssrData.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Asset</label>
                      <p className="text-sm text-gray-900">{pssrData.asset}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Project ID</label>
                      <p className="text-sm text-gray-900">{pssrData.projectId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Project Name</label>
                      <p className="text-sm text-gray-900">{pssrData.projectName}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Reason for PSSR</label>
                    <p className="text-sm text-gray-900">{pssrData.reason}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">PSSR Initiator</label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      {pssrData.initiator}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Scope & Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Scope of PSSR</label>
                    <p className="text-sm text-gray-900 mt-1">{pssrData.scope}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Overall Progress</span>
                      <span className="text-sm font-bold text-gray-900">{pssrData.progress}%</span>
                    </div>
                    <Progress value={pssrData.progress} className="w-full h-3" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-lg font-bold text-orange-600">{pssrData.pendingApprovals}</p>
                      <p className="text-xs text-gray-600">Pending Approvals</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">12</p>
                      <p className="text-xs text-gray-600">Days Remaining</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">85%</p>
                      <p className="text-xs text-gray-600">Completion Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Linked PSSRs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Link2 className="h-5 w-5 mr-2" />
                  Linked PSSRs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pssrData.linkedPSSRs.map((linkedPSSR) => (
                    <div key={linkedPSSR.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="text-xs">
                            {linkedPSSR.relationship}
                          </Badge>
                          <span className="font-medium text-sm">{linkedPSSR.id}</span>
                          <span className="text-sm text-gray-600">{linkedPSSR.title}</span>
                        </div>
                        <div className="mt-2 flex items-center space-x-3">
                          <Progress value={linkedPSSR.progress} className="w-24 h-2" />
                          <span className="text-xs text-gray-500">{linkedPSSR.progress}%</span>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${getStatusColor(linkedPSSR.status)}`}
                      >
                        {getStatusIcon(linkedPSSR.status)}
                        {linkedPSSR.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Progress by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(pssrData.categoryProgress).map(([category, progress]) => {
                    const IconComponent = getCategoryIcon(category);
                    return (
                      <Card key={category} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <IconComponent className="h-5 w-5 text-blue-600" />
                              <span className="font-medium text-sm">{formatCategoryName(category)}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {progress.completed}/{progress.total}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Progress</span>
                              <span className="text-xs font-bold">{progress.percentage}%</span>
                            </div>
                            <Progress value={progress.percentage} className="w-full h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvers Tab */}
          <TabsContent value="approvers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Outstanding Actions by Approvers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pssrData.approvers.map((approver) => (
                    <Card key={approver.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={approver.avatar} alt={approver.name} />
                            <AvatarFallback>
                              {approver.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{approver.name}</h4>
                            <p className="text-xs text-gray-600">{approver.title}</p>
                            <div className="mt-2 flex items-center space-x-3">
                              <Badge 
                                variant="outline" 
                                className={`flex items-center gap-1 text-xs ${getStatusColor(approver.status)}`}
                              >
                                {getStatusIcon(approver.status)}
                                {approver.status}
                              </Badge>
                              {approver.openItems > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {approver.openItems} Open Items
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  PSSR Events Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pssrData.events.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Calendar className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{event.name}</h4>
                          <p className="text-sm text-gray-600">
                            {event.date} • {event.attendees} attendees
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-2 ${getStatusColor(event.status)}`}
                      >
                        {getStatusIcon(event.status)}
                        {event.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pssrData.recentActivities.map((activity) => {
                    const IconComponent = activity.icon;
                    return (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-full ${activity.bgColor}`}>
                          <IconComponent className={`h-4 w-4 ${activity.color}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{activity.title}</h4>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PSSRDashboard;