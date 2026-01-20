import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useORMPlans } from '@/hooks/useORMPlans';
import { CreateORMModal } from './CreateORMModal';
import { 
  Wrench, 
  Plus, 
  User, 
  TrendingUp, 
  BarChart3, 
  UserCog,
  CheckCircle,
  Clock,
  ArrowRight,
  FileText,
  Search,
  Filter,
  X
} from 'lucide-react';
import { ORMNotificationCenter } from './ORMNotificationCenter';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useProjectsSimple } from '@/hooks/useProjectsSimple';
import { useProfileUsers } from '@/hooks/useProfileUsers';


export const ORMLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [leadFilter, setLeadFilter] = useState<string>('all');
  
  const { toast } = useToast();
  const { plans, isLoading } = useORMPlans();
  const { data: projects } = useProjectsSimple();
  const { data: users } = useProfileUsers();
  const { setBreadcrumbs } = useBreadcrumb();

  React.useEffect(() => {
    setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'OR Maintenance', path: '/or-maintenance' }
    ]);
  }, [setBreadcrumbs]);

  const getDeliverableLabel = (type: string) => {
    const labels: Record<string, string> = {
      ASSET_REGISTER: 'Asset Register',
      PREVENTIVE_MAINTENANCE: 'PM Routines',
      BOM_DEVELOPMENT: 'BOM Development',
      OPERATING_SPARES: 'Operating Spares',
      IMS_UPDATE: 'IMS Update',
      PM_ACTIVATION: 'PM Activation'
    };
    return labels[type] || type;
  };

  const getWorkflowStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      IN_PROGRESS: 'In Progress',
      QAQC_REVIEW: 'QA/QC Review',
      LEAD_REVIEW: 'Lead Review',
      CENTRAL_TEAM_REVIEW: 'Central Team Review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return labels[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      IN_PROGRESS: 'bg-blue-500',
      QAQC_REVIEW: 'bg-yellow-500',
      LEAD_REVIEW: 'bg-orange-500',
      CENTRAL_TEAM_REVIEW: 'bg-purple-500',
      APPROVED: 'bg-green-500',
      REJECTED: 'bg-red-500'
    };
    return colors[stage] || 'bg-muted';
  };

  const getStageBadgeVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
    if (stage === 'APPROVED') return 'default';
    if (stage === 'REJECTED') return 'destructive';
    if (['QAQC_REVIEW', 'LEAD_REVIEW', 'CENTRAL_TEAM_REVIEW'].includes(stage)) return 'secondary';
    return 'outline';
  };

  // Filter and search plans
  const filteredPlans = useMemo(() => {
    if (!plans) return [];

    return plans.filter(plan => {
      // Search filter
      const matchesSearch = !searchQuery || 
        plan.project?.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${plan.project?.project_id_prefix}-${plan.project?.project_id_number}`.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;

      // Project filter
      const matchesProject = projectFilter === 'all' || plan.project_id === projectFilter;

      // Lead filter
      const matchesLead = leadFilter === 'all' || plan.orm_lead_id === leadFilter;

      return matchesSearch && matchesStatus && matchesProject && matchesLead;
    });
  }, [plans, searchQuery, statusFilter, projectFilter, leadFilter]);

  // Get unique ORM leads from plans
  const ormLeads = useMemo(() => {
    if (!plans || !users) return [];
    const leadIds = new Set(plans.map(p => p.orm_lead_id).filter(Boolean));
    return Array.from(leadIds).map(leadId => {
      const user = users.find(u => u.user_id === leadId);
      return {
        id: leadId,
        name: user?.full_name || 'Unknown'
      };
    });
  }, [plans, users]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setProjectFilter('all');
    setLeadFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || projectFilter !== 'all' || leadFilter !== 'all';

  // Calculate statistics based on filtered plans
  const stats = {
    total: plans?.length || 0,
    active: plans?.filter(p => p.status === 'ACTIVE').length || 0,
    deliverables: plans?.reduce((sum, p) => sum + (p.deliverables?.length || 0), 0) || 0,
    inReview: plans?.reduce((sum, p) => 
      sum + (p.deliverables?.filter(d => 
        ['QAQC_REVIEW', 'LEAD_REVIEW', 'CENTRAL_TEAM_REVIEW'].includes(d.workflow_stage)
      ).length || 0), 0
    ) || 0,
    completed: plans?.reduce((sum, p) => 
      sum + (p.deliverables?.filter(d => d.workflow_stage === 'APPROVED').length || 0), 0
    ) || 0,
    avgProgress: plans?.length 
      ? Math.round(plans.reduce((sum, p) => sum + (p.overall_progress || 0), 0) / plans.length)
      : 0
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
          <BreadcrumbNavigation currentPageLabel="OR Maintenance" />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <div className="min-w-0 flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">OR Maintenance</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  CMMS & IMS Development Management System
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ORMNotificationCenter />
              <Button variant="outline" size="sm" onClick={() => navigate('/or-maintenance/analytics')} className="gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/or-maintenance/resources')} className="gap-2">
                <UserCog className="w-4 h-4" />
                <span className="hidden sm:inline">Resources</span>
              </Button>
              <Button size="sm" onClick={() => setShowCreateModal(true)} className="flex-1 sm:flex-none gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm">
                <Plus className="w-4 h-4" />
                Create ORM
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Search and Filters */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by project name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-background/50"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Filter className="w-4 h-4" />
                      <span>Filters:</span>
                    </div>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px] bg-background/50">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Project Filter */}
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger className="w-[200px] bg-background/50">
                        <SelectValue placeholder="Project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects?.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.project_id_prefix}-{project.project_id_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* ORM Lead Filter */}
                    <Select value={leadFilter} onValueChange={setLeadFilter}>
                      <SelectTrigger className="w-[180px] bg-background/50">
                        <SelectValue placeholder="ORM Lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Leads</SelectItem>
                        {ormLeads.map(lead => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                        Clear Filters
                      </Button>
                    )}

                    {/* Results Count */}
                    <div className="ml-auto text-sm text-muted-foreground">
                      Showing {filteredPlans?.length || 0} of {plans?.length || 0} plans
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                      <p className="text-3xl font-bold text-foreground">{stats.active}</p>
                      <p className="text-xs text-muted-foreground">of {stats.total} total</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                      <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-green-500/10 via-green-500/5 to-background hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Total Deliverables</p>
                      <p className="text-3xl font-bold text-foreground">{stats.deliverables}</p>
                      <p className="text-xs text-muted-foreground">{stats.avgProgress}% avg progress</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                      <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-background hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">In Review</p>
                      <p className="text-3xl font-bold text-foreground">{stats.inReview}</p>
                      <p className="text-xs text-muted-foreground">awaiting approval</p>
                    </div>
                    <div className="p-3 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors">
                      <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-background hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Completed</p>
                      <p className="text-3xl font-bold text-foreground">{stats.completed}</p>
                      <p className="text-xs text-muted-foreground">approved items</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                      <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Projects Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Your Projects</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage and track your OR Maintenance projects</p>
                </div>
              </div>

              {filteredPlans && filteredPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlans.map((plan: any) => (
                    <Card
                      key={plan.id}
                      className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden bg-card"
                      onClick={() => navigate(`/or-maintenance/${plan.id}`)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <CardHeader className="relative pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {plan.project?.project_title}
                            </CardTitle>
                            <CardDescription className="mt-2 flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {plan.project?.project_id_prefix}-{plan.project?.project_id_number}
                              </Badge>
                            </CardDescription>
                          </div>
                          <Badge 
                            variant={plan.status === 'ACTIVE' ? 'default' : 'secondary'}
                            className="shrink-0"
                          >
                            {plan.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="relative space-y-4 pt-2">
                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">Overall Progress</span>
                            <span className="font-bold text-foreground">{plan.overall_progress || 0}%</span>
                          </div>
                          <Progress value={plan.overall_progress || 0} className="h-2" />
                        </div>

                        {/* Deliverables */}
                        {plan.deliverables && plan.deliverables.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Deliverables
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {plan.deliverables.slice(0, 4).map((del: any) => (
                                <Badge
                                  key={del.id}
                                  variant={getStageBadgeVariant(del.workflow_stage)}
                                  className="text-xs"
                                >
                                  {getDeliverableLabel(del.deliverable_type)}
                                </Badge>
                              ))}
                              {plan.deliverables.length > 4 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{plan.deliverables.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Lead Info */}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span className="font-medium">
                              {users?.find(u => u.user_id === plan.orm_lead_id)?.full_name || 'Unassigned'}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/5">
                  <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                      <Wrench className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {hasActiveFilters ? 'No Plans Match Your Filters' : 'No ORM Plans Yet'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      {hasActiveFilters 
                        ? 'Try adjusting your search or filters to find what you\'re looking for.' 
                        : 'Get started by creating your first OR Maintenance plan to track CMMS and IMS development activities.'
                      }
                    </p>
                    {hasActiveFilters ? (
                      <Button 
                        onClick={clearFilters} 
                        size="lg"
                        variant="outline"
                        className="gap-2"
                      >
                        <X className="w-5 h-5" />
                        Clear All Filters
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setShowCreateModal(true)} 
                        size="lg"
                        className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                      >
                        <Plus className="w-5 h-5" />
                        Create Your First ORM Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

      <CreateORMModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
};
