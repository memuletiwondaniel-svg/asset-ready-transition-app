import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  ClipboardList, 
  Users, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  Settings,
  Bell,
  Link,
  BarChart3,
  Activity,
  MapPin,
  User,
  Target,
  Zap
} from 'lucide-react';

interface PSSRDashboardProps {
  pssr: any;
  onBack: () => void;
}

const PSSRDashboard: React.FC<PSSRDashboardProps> = ({ pssr, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!pssr) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/20 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">PSSR Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested PSSR could not be found.</p>
          <Button onClick={onBack}>Back to Summary</Button>
        </Card>
      </div>
    );
  }

  // Mock data for demonstration
  const categoryProgress = [
    { name: 'Plant Integrity', completed: 8, total: 12, percentage: 67 },
    { name: 'Process Safety', completed: 5, total: 8, percentage: 63 },
    { name: 'People', completed: 3, total: 4, percentage: 75 },
    { name: 'Documentation', completed: 7, total: 10, percentage: 70 },
    { name: 'Health & Safety', completed: 6, total: 8, percentage: 75 },
    { name: 'PSSR Walkdown', completed: 2, total: 3, percentage: 67 }
  ];

  const approvers = [
    { name: 'Ahmed Al-Rashid', role: 'PSSR Lead', avatar: '/api/placeholder/40/40', pending: 0, status: 'approved' },
    { name: 'Sarah Johnson', role: 'Plant Director', avatar: '/api/placeholder/40/40', pending: 2, status: 'pending' },
    { name: 'Omar Hassan', role: 'Engineering Manager', avatar: '/api/placeholder/40/40', pending: 1, status: 'pending' },
    { name: 'Fatima Al-Zahra', role: 'HSE Director', avatar: '/api/placeholder/40/40', pending: 0, status: 'not_started' }
  ];

  const recentActivities = [
    { action: 'Checklist item B03 approved by TA-PACO', time: '2 hours ago', type: 'approval' },
    { action: 'PSSR walkdown scheduled for Feb 15', time: '4 hours ago', type: 'schedule' },
    { action: 'Document uploaded: Pressure Test Report', time: '1 day ago', type: 'document' },
    { action: 'Override Register updated', time: '1 day ago', type: 'update' },
    { action: 'PSSR created and assigned ID', time: '3 days ago', type: 'creation' }
  ];

  const linkedPSSRs = [
    { id: 'PSSR-2024-003', name: 'UQ Jetty 2 Export Terminal', status: 'Approved', dependency: 'Prerequisite' },
    { id: 'PSSR-2024-004', name: 'Majnoon New Gas Tie-in', status: 'Under Review', dependency: 'Related' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-success text-success-foreground';
      case 'Under Review': return 'bg-warning text-warning-foreground';
      case 'Draft': return 'bg-muted text-muted-foreground';
      case 'Pending': return 'bg-warning text-warning-foreground';
      case 'On Hold': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getApproverStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      case 'not_started': return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'approval': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'schedule': return <Calendar className="h-4 w-4 text-primary" />;
      case 'document': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'update': return <Settings className="h-4 w-4 text-warning" />;
      case 'creation': return <Zap className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button variant="ghost" onClick={onBack} className="hover:bg-secondary/80 group">
                <ArrowLeft className="h-4 w-4 mr-3 group-hover:-translate-x-1 transition-transform duration-200" />
                <span className="font-medium">Back to Summary</span>
              </Button>
              
              <div className="h-8 w-px bg-border"></div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{pssr.id}</h1>
                  <p className="text-sm text-muted-foreground font-medium">
                    {pssr.projectName || pssr.asset} - PSSR Dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(pssr.status)}>
                {pssr.status}
              </Badge>
              <Button variant="outline" className="border-border/50 hover:bg-secondary/50">
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checklist">Checklist Items</TabsTrigger>
            <TabsTrigger value="approvers">Approvers</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* PSSR Basic Information */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    PSSR Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">PSSR ID</p>
                      <p className="text-lg font-semibold">{pssr.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reason for PSSR</p>
                      <p className="text-sm">{pssr.reason}</p>
                    </div>
                    {pssr.projectId && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Project ID</p>
                          <p className="text-sm font-mono">{pssr.projectId}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Project Name</p>
                          <p className="text-sm">{pssr.projectName}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Plant/Asset</p>
                      <p className="text-sm">{pssr.asset}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">PSSR Lead</p>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={pssr.pssrLeadAvatar} />
                          <AvatarFallback>{pssr.pssrLead.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{pssr.pssrLead}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date Created</p>
                      <p className="text-sm">{pssr.created}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{pssr.location}</span>
                      </div>
                    </div>
                  </div>

                  {pssr.scope && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Scope of PSSR</p>
                      <p className="text-sm bg-muted/30 p-3 rounded-lg">{pssr.scope}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Overall Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Overall Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">{pssr.progress}%</div>
                    <Progress value={pssr.progress} className="h-3" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {pssr.completedItems || 0} of {pssr.totalItems || 0} items completed
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                      <div className="text-xl font-bold text-success">{pssr.approvedItems || 0}</div>
                      <div className="text-xs text-muted-foreground">Approved</div>
                    </div>
                    <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                      <div className="text-xl font-bold text-warning">{pssr.pendingApprovals}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Progress by Category
                </CardTitle>
                <CardDescription>
                  Review completion status across different PSSR categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryProgress.map((category) => (
                    <div key={category.name} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">{category.name}</h4>
                        <span className="text-sm text-muted-foreground">
                          {category.completed}/{category.total}
                        </span>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">{category.percentage}% complete</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Linked PSSRs */}
            {linkedPSSRs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Linked PSSRs
                  </CardTitle>
                  <CardDescription>
                    Related and prerequisite PSSR reviews
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {linkedPSSRs.map((linkedPssr) => (
                      <div key={linkedPssr.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <p className="font-medium">{linkedPssr.id}</p>
                          <p className="text-sm text-muted-foreground">{linkedPssr.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {linkedPssr.dependency}
                          </Badge>
                          <Badge className={getStatusColor(linkedPssr.status)}>
                            {linkedPssr.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="checklist" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>PSSR Checklist Items</CardTitle>
                <CardDescription>
                  Review and track progress of all checklist items across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ClipboardList className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Checklist Items View</h3>
                  <p className="text-muted-foreground">
                    Detailed checklist management functionality will be implemented here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approvers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Outstanding Actions by Approvers
                </CardTitle>
                <CardDescription>
                  Track approval status and pending actions for each approver
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvers.map((approver) => (
                    <div key={approver.name} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={approver.avatar} />
                          <AvatarFallback>{approver.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{approver.name}</p>
                          <p className="text-sm text-muted-foreground">{approver.role}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {approver.pending > 0 ? `${approver.pending} items pending` : 'No pending items'}
                          </p>
                          <div className="flex items-center gap-1 justify-end">
                            {getApproverStatusIcon(approver.status)}
                            <span className="text-xs text-muted-foreground capitalize">{approver.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        
                        {approver.pending > 0 && (
                          <Button size="sm" variant="outline">
                            <Bell className="h-4 w-4 mr-2" />
                            Send Reminder
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activities
                </CardTitle>
                <CardDescription>
                  Track all activities and changes related to this PSSR
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border border-border rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
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