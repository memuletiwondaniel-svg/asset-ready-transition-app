import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserTasks } from '@/hooks/useUserTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ListChecks
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
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

  // Calculate task counts by category
  const taskCounts = useMemo(() => {
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    
    return {
      total: pendingTasks.length,
      review: pendingTasks.filter(t => t.type === 'review').length,
      others: pendingTasks.filter(t => t.type === 'approval' || t.type === 'action').length
    };
  }, [tasks]);

  // Filter PSSRs
  const filteredPSSRs = pendingPSSRs?.filter(item => {
    const matchesSearch = !searchQuery || 
      item.pssr.pssr_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pssr.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pssr.asset?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  }) || [];

  // Calculate PSSR stats
  const pssrStats = {
    total: pendingPSSRs?.length || 0,
  };

  // Combined stats
  const totalTasks = taskCounts.total + pssrStats.total;

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
            {/* Task Category Statistics - Simplified */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{totalTasks}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">PSSR Reviews</p>
                  <p className="text-2xl font-bold">{pssrStats.total}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">Handover Reviews</p>
                  <p className="text-2xl font-bold">{taskCounts.review}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">Others</p>
                  <p className="text-2xl font-bold">{taskCounts.others}</p>
                </CardContent>
              </Card>
            </div>

            {/* All Tasks List */}
            <div className="space-y-6">
              {/* Custom Tasks */}
              <MyTasksPanel />

              {/* PSSR Reviews Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">PSSR Reviews</h2>
                  {pssrStats.total > 0 && (
                    <Badge variant="secondary">{pssrStats.total} pending</Badge>
                  )}
                </div>

                {/* Search */}
                {pssrStats.total > 0 && (
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by PSSR ID, project, or asset..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}

                {/* PSSR List */}
                <div className="space-y-3">
                  {isLoadingPSSRs ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <div className="animate-pulse text-muted-foreground">Loading your pending reviews...</div>
                      </CardContent>
                    </Card>
                  ) : filteredPSSRs.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">
                          {searchQuery 
                            ? 'No PSSRs match your search.' 
                            : 'No pending PSSR reviews.'}
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
                          <CardContent className="py-4">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                              {/* PSSR Info */}
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold">{item.pssr.pssr_id}</h3>
                                  <Badge variant="outline" className="text-xs">
                                    {item.approverRole}
                                  </Badge>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5" />
                                    {item.pssr.project_name || 'No Project'}
                                  </span>
                                  {item.pssr.asset && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" />
                                      {item.pssr.asset}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <p className="text-lg font-semibold">{item.itemCount}</p>
                                  <p className="text-xs text-muted-foreground">Items</p>
                                </div>

                                <Badge variant="outline" className={getPendingBadgeColor(item.pendingSince)}>
                                  <Clock className="h-3 w-3 mr-1" />
                                  {daysPending === 0 
                                    ? 'Today' 
                                    : daysPending === 1 
                                      ? '1 day' 
                                      : `${daysPending} days`}
                                </Badge>

                                <Button size="sm" onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartReview(item.pssr.id, item.approverRole);
                                }}>
                                  Review
                                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PSSRApproverDashboard;
