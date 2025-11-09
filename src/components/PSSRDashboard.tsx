import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OrshSidebar } from '@/components/OrshSidebar';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { 
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
  Shield,
  TrendingUp,
  Activity
} from 'lucide-react';

interface PSSRDashboardProps {
  pssrId: string;
  onBack: () => void;
  onNavigateToCategory?: (categoryName: string) => void;
}

const PSSRDashboard: React.FC<PSSRDashboardProps> = ({ 
  pssrId, 
  onBack, 
  onNavigateToCategory 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const location = useLocation();
  const { buildBreadcrumbsFromPath, updateMetadata } = useBreadcrumb();

  // Mock comprehensive PSSR data
  const pssrData = {
    id: pssrId,
    title: 'NRNGL Plant Start-up Commissioning',
    asset: 'NRNGL Plant',
    reason: 'Start-up or Commissioning of a new Asset',
    projectId: 'DP300',
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

  // Update metadata with Project ID only for breadcrumb display
  useEffect(() => {
    updateMetadata(`/safe-startup/${pssrId}`, pssrData.projectId);
  }, [pssrId, pssrData.projectId, updateMetadata]);

  // Build breadcrumbs from current path
  const breadcrumbs = buildBreadcrumbsFromPath();

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
    <div className="min-h-screen flex w-full relative overflow-hidden">
      {/* Modern Background */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 opacity-40 dark:opacity-30">
          <div 
            className="absolute inset-0 animate-gradient-shift-morph"
            style={{
              background: 'radial-gradient(at 20% 30%, hsl(210, 25%, 88%) 0%, transparent 40%), radial-gradient(at 80% 20%, hsl(280, 22%, 87%) 0%, transparent 40%), radial-gradient(at 40% 80%, hsl(200, 28%, 89%) 0%, transparent 40%)',
              filter: 'blur(50px)',
            }}
          />
        </div>
      </div>

      {/* ORSH Sidebar */}
      <OrshSidebar 
        currentPage="safe-startup"
        onNavigate={(section) => {
          if (section === 'home') onBack();
        }}
      />
      
      <div className="flex-1 relative z-10">
        {/* Modern Header */}
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
          <div className="px-8 py-4">
            {/* Breadcrumb Navigation with History */}
            <BreadcrumbNavigation 
              currentPageLabel={breadcrumbs[breadcrumbs.length - 1]?.label || pssrData.id}
              className="mb-4"
            />

            {/* Header Content */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                    <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-foreground">{pssrData.id}</h1>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1.5 ${getStatusColor(pssrData.status)}`}
                      >
                        {getStatusIcon(pssrData.status)}
                        {pssrData.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{pssrData.title}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{pssrData.progress}% Complete</div>
                  <div className="text-xs text-muted-foreground">12 days remaining</div>
                </div>
                <Progress value={pssrData.progress} className="w-32 h-2" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-8 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="inline-flex h-11 items-center justify-center rounded-xl bg-muted/50 p-1 text-muted-foreground backdrop-blur-sm">
              <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="progress" className="rounded-lg">Progress</TabsTrigger>
              <TabsTrigger value="approvers" className="rounded-lg">Approvers</TabsTrigger>
              <TabsTrigger value="events" className="rounded-lg">Events</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-lg">Activity</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="glass-card border-l-4 border-l-amber-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                        <p className="text-3xl font-bold text-foreground mt-1">{pssrData.pendingApprovals}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-l-4 border-l-green-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                        <p className="text-3xl font-bold text-foreground mt-1">85%</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Days Remaining</p>
                        <p className="text-3xl font-bold text-foreground mt-1">12</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-l-4 border-l-purple-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                        <p className="text-3xl font-bold text-foreground mt-1">4</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PSSR Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mr-3">
                        <Building className="h-5 w-5 text-amber-600" />
                      </div>
                      PSSR Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase">PSSR ID</label>
                        <p className="text-sm font-semibold text-foreground">{pssrData.id}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Asset</label>
                        <p className="text-sm font-semibold text-foreground">{pssrData.asset}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Project ID</label>
                        <p className="text-sm font-semibold text-foreground">{pssrData.projectId}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Project Name</label>
                        <p className="text-sm font-semibold text-foreground">{pssrData.projectName}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">Reason for PSSR</label>
                      <p className="text-sm text-foreground">{pssrData.reason}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">PSSR Initiator</label>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">{pssrData.initiator}</p>
                      </div>
                    </div>
                </CardContent>
              </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mr-3">
                        <Target className="h-5 w-5 text-amber-600" />
                      </div>
                      Scope & Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">Scope of PSSR</label>
                      <p className="text-sm text-foreground leading-relaxed">{pssrData.scope}</p>
                    </div>
                    <div className="space-y-3 p-4 rounded-xl bg-muted/30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground">Overall Progress</span>
                        <span className="text-lg font-bold text-primary">{pssrData.progress}%</span>
                      </div>
                      <Progress value={pssrData.progress} className="w-full h-2.5" />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Activity className="h-3.5 w-3.5" />
                        <span>87 of 112 items completed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            </div>

              {/* Linked PSSRs */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mr-3">
                      <Link2 className="h-5 w-5 text-blue-600" />
                    </div>
                    Linked PSSRs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pssrData.linkedPSSRs.map((linkedPSSR) => (
                      <div key={linkedPSSR.id} className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="text-xs font-medium">
                              {linkedPSSR.relationship}
                            </Badge>
                            <span className="text-sm font-semibold text-foreground">{linkedPSSR.id}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{linkedPSSR.title}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right space-y-1">
                            <Progress value={linkedPSSR.progress} className="w-24 h-2" />
                            <p className="text-xs text-muted-foreground font-medium">{linkedPSSR.progress}%</p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(linkedPSSR.status)}`}
                          >
                            {linkedPSSR.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mr-3">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                    </div>
                    Progress by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(pssrData.categoryProgress).map(([category, data]) => {
                      const Icon = getCategoryIcon(category);
                      const colors = {
                        hardwareIntegrity: 'from-blue-500 to-cyan-500',
                        processSafety: 'from-amber-500 to-orange-500',
                        documentation: 'from-purple-500 to-pink-500',
                        organization: 'from-green-500 to-emerald-500',
                        healthSafety: 'from-red-500 to-rose-500'
                      };
                      const bgColors = {
                        hardwareIntegrity: 'bg-blue-500/10',
                        processSafety: 'bg-amber-500/10',
                        documentation: 'bg-purple-500/10',
                        organization: 'bg-green-500/10',
                        healthSafety: 'bg-red-500/10'
                      };
                      return (
                        <div 
                          key={category} 
                          className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group"
                          onClick={() => onNavigateToCategory?.(formatCategoryName(category))}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${bgColors[category as keyof typeof bgColors]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <Icon className="h-5 w-5 text-foreground" />
                              </div>
                              <span className="text-sm font-semibold text-foreground">{formatCategoryName(category)}</span>
                            </div>
                            <span className="text-lg font-bold text-primary">{data.percentage}%</span>
                          </div>
                          <Progress value={data.percentage} className="w-full h-2.5 mb-2" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{data.completed} of {data.total} items completed</span>
                            <span className="font-medium">{data.total - data.completed} remaining</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Approvers Tab */}
            <TabsContent value="approvers" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mr-3">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    Approver Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pssrData.approvers.map((approver) => (
                      <div key={approver.id} className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-xl transition-all">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 ring-2 ring-background">
                            <AvatarImage src={approver.avatar} alt={approver.name} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                              {approver.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{approver.name}</p>
                            <p className="text-xs text-muted-foreground">{approver.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {approver.openItems > 0 && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-medium">
                              {approver.openItems} Open
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(approver.status)} gap-1.5`}
                          >
                            {getStatusIcon(approver.status)}
                            {approver.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mr-3">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    PSSR Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pssrData.events.map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-xl transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{event.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{event.date}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {event.attendees} attendees
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(event.status)} gap-1.5`}
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
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mr-3">
                      <Activity className="h-5 w-5 text-green-600" />
                    </div>
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pssrData.recentActivities.map((activity) => {
                      const Icon = activity.icon;
                      return (
                        <div key={activity.id} className="flex items-start gap-4 p-4 bg-muted/30 hover:bg-muted/50 rounded-xl transition-all">
                          <div className={`w-10 h-10 rounded-xl ${activity.bgColor.replace('bg-', 'bg-').replace('-100', '-500/10')} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`h-5 w-5 ${activity.color.replace('-600', '-600')}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground font-medium">{activity.timestamp}</p>
                            </div>
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
    </div>
  );
};

export default PSSRDashboard;