import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserTasks } from '@/hooks/useUserTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  ClipboardCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search,
  MapPin,
  ArrowRight,
  FileText,
  Filter,
  ListChecks,
  Zap,
  ThumbsUp
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { OrshSidebar } from '@/components/OrshSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MyTasksPanel } from '@/components/MyTasksPanel';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { NotificationCenter } from '@/components/NotificationCenter';

const PSSRApproverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pendingPSSRs, isLoading: isLoadingPSSRs } = usePSSRsAwaitingReview(user?.id);
  const { tasks, loading: isLoadingTasks } = useUserTasks();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'overdue'>('all');
  const [activeTab, setActiveTab] = useState<'tasks' | 'pssr-reviews'>('tasks');

  // Calculate task counts by category
  const taskCounts = useMemo(() => {
    const now = new Date();
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    
    return {
      total: pendingTasks.length,
      approval: pendingTasks.filter(t => t.type === 'approval').length,
      review: pendingTasks.filter(t => t.type === 'review').length,
      action: pendingTasks.filter(t => t.type === 'action').length,
      overdue: pendingTasks.filter(t => t.due_date && new Date(t.due_date) < now).length
    };
  }, [tasks]);

  // Filter PSSRs
  const filteredPSSRs = pendingPSSRs?.filter(item => {
    const matchesSearch = !searchQuery || 
      item.pssr.pssr_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pssr.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pssr.asset?.toLowerCase().includes(searchQuery.toLowerCase());

    const daysPending = differenceInDays(new Date(), new Date(item.pendingSince));
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'new' && daysPending < 3) ||
      (statusFilter === 'overdue' && daysPending >= 7);

    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate PSSR stats
  const pssrStats = {
    total: pendingPSSRs?.length || 0,
    new: pendingPSSRs?.filter(p => differenceInDays(new Date(), new Date(p.pendingSince)) < 3).length || 0,
    overdue: pendingPSSRs?.filter(p => differenceInDays(new Date(), new Date(p.pendingSince)) >= 7).length || 0,
  };

  // Combined stats
  const totalTasks = taskCounts.total + pssrStats.total;
  const totalOverdue = taskCounts.overdue + pssrStats.overdue;

  const getPendingBadgeColor = (pendingSince: string) => {
    const days = differenceInDays(new Date(), new Date(pendingSince));
    if (days < 3) return 'bg-green-100 text-green-800 border-green-200';
    if (days < 7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const handleStartReview = (pssrId: string, approverRole: string) => {
    navigate(`/pssr/${pssrId}/review?role=${encodeURIComponent(approverRole)}`);
  };

  const handleSidebarNavigate = (section: string) => {
    const routes: Record<string, string> = {
      'home': '/',
      'pssr': '/pssr',
      'users': '/users',
      'manage-checklist': '/manage-checklist',
      'admin-tools': '/admin-tools',
      'projects': '/projects',
      'project-management': '/project-management',
      'operation-readiness': '/operation-readiness',
      'p2a-handover': '/p2a-handover',
      'or-maintenance': '/or-maintenance',
      'my-tasks': '/my-tasks',
      'pssr-reviews': '/my-tasks',
    };
    const route = routes[section] || `/${section}`;
    navigate(route);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <OrshSidebar 
          onNavigate={handleSidebarNavigate}
          currentPage="my-tasks"
        />
        <SidebarInset className="flex-1">
          {/* Standard Header */}
          <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl p-4 md:p-6">
            <BreadcrumbNavigation currentPageLabel="My Tasks" />
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                  <ListChecks className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    View and manage all tasks assigned to you
                  </p>
                </div>
              </div>
              
              <NotificationCenter />
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-6">
            {/* Task Category Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {/* Total Tasks */}
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Tasks</p>
                      <p className="text-2xl font-bold">{totalTasks}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ListChecks className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PSSR Reviews */}
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">PSSR Reviews</p>
                      <p className="text-2xl font-bold text-amber-600">{pssrStats.total}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <ClipboardCheck className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Approvals */}
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Approvals</p>
                      <p className="text-2xl font-bold text-blue-600">{taskCounts.approval}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <ThumbsUp className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews */}
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Reviews</p>
                      <p className="text-2xl font-bold text-purple-600">{taskCounts.review}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Items */}
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Action Items</p>
                      <p className="text-2xl font-bold text-green-600">{taskCounts.action}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overdue */}
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  My Tasks
                  {taskCounts.total > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {taskCounts.total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pssr-reviews" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  PSSR Reviews
                  {pssrStats.total > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {pssrStats.total}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* My Tasks Tab */}
              <TabsContent value="tasks" className="mt-6">
                <MyTasksPanel />
              </TabsContent>

              {/* PSSR Reviews Tab */}
              <TabsContent value="pssr-reviews" className="mt-6 space-y-6">
                {/* Filters */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by PSSR ID, project, or asset..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="w-fit">
                        <TabsList>
                          <TabsTrigger value="all" className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            All
                          </TabsTrigger>
                          <TabsTrigger value="new" className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            New
                          </TabsTrigger>
                          <TabsTrigger value="overdue" className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Overdue
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardContent>
                </Card>

                {/* PSSR List */}
                <div className="space-y-4">
                  {isLoadingPSSRs ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <div className="animate-pulse">Loading your pending reviews...</div>
                      </CardContent>
                    </Card>
                  ) : filteredPSSRs.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                        <p className="text-muted-foreground">
                          {searchQuery || statusFilter !== 'all' 
                            ? 'No PSSRs match your current filters.' 
                            : 'You have no pending PSSR reviews at this time.'}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredPSSRs.map((item) => {
                      const daysPending = differenceInDays(new Date(), new Date(item.pendingSince));
                      
                      return (
                        <Card 
                          key={`${item.pssr.id}-${item.approverRole}`} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleStartReview(item.pssr.id, item.approverRole)}
                        >
                          <CardContent className="pt-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                              {/* PSSR Info */}
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-lg font-semibold">{item.pssr.pssr_id}</h3>
                                  <Badge variant="outline" className="text-xs">
                                    {item.approverRole}
                                  </Badge>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    {item.pssr.project_name || 'No Project'}
                                  </span>
                                  {item.pssr.asset && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      {item.pssr.asset}
                                    </span>
                                  )}
                                  {(item.pssr.cs_location || item.pssr.station) && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      {item.pssr.cs_location || item.pssr.station}
                                    </span>
                                  )}
                                </div>

                                {item.pssr.scope && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    <span className="font-medium">Scope:</span> {item.pssr.scope}
                                  </p>
                                )}
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-6">
                                {/* Items count */}
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-primary">{item.itemCount}</p>
                                  <p className="text-xs text-muted-foreground">Items</p>
                                </div>

                                {/* Pending time */}
                                <div className="text-center">
                                  <Badge className={`${getPendingBadgeColor(item.pendingSince)} border`}>
                                    <Clock className="h-3 w-3 mr-1" />
                                    {daysPending === 0 
                                      ? 'Today' 
                                      : daysPending === 1 
                                        ? '1 day' 
                                        : `${daysPending} days`}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1">Pending</p>
                                </div>

                                {/* Action button */}
                                <Button 
                                  className="bg-primary hover:bg-primary/90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartReview(item.pssr.id, item.approverRole);
                                  }}
                                >
                                  Start Review
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PSSRApproverDashboard;
