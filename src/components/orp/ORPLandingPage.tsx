import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, BarChart3, CalendarCheck, Search, Building2, Calendar, User } from 'lucide-react';
import { CreateORPModal } from '@/components/orp/CreateORPModal';
import { useORPRealtime } from '@/hooks/useORPRealtime';
import { useORPPlans } from '@/hooks/useORPPlans';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { format } from 'date-fns';
import { createSidebarNavigator } from '@/utils/sidebarNavigation';

export const ORPLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { setBreadcrumbs } = useBreadcrumb();
  const { plans, isLoading: plansLoading } = useORPPlans();
  useORPRealtime();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'ORA Plans', path: '/operation-readiness' }
    ]);
  }, [setBreadcrumbs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'PENDING_APPROVAL': return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'APPROVED': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'COMPLETED': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'ASSESS_SELECT': return 'Assess & Select';
      case 'DEFINE': return 'Define';
      case 'EXECUTE': return 'Execute';
      default: return phase;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'ASSESS_SELECT': return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
      case 'DEFINE': return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300';
      case 'EXECUTE': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  const filteredPlans = plans?.filter(plan =>
    plan.project?.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${plan.project?.project_id_prefix}-${plan.project?.project_id_number}`.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <OrshSidebar
        currentPage="operation-readiness"
        onNavigate={createSidebarNavigator(navigate, {
          'operation-readiness': () => {} // Already here, do nothing
        })}
        onLogout={() => navigate('/')}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="mb-3">
            <BreadcrumbNavigation currentPageLabel="ORA Plans" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent">
                <CalendarCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">ORA Plans</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage and track operation readiness activities
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/operation-readiness/analytics')} variant="outline" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create New ORA
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Search Bar */}
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search ORA plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* ORA Plans Grid */}
            {plansLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-40" />
                  </Card>
                ))}
              </div>
            ) : filteredPlans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarCheck className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No ORA plans match your search' : 'No ORA plans created yet'}
                  </p>
                  <Button onClick={() => setShowCreateModal(true)} className="mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    Create ORA Plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPlans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigate(`/operation-readiness/${plan.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg flex items-center gap-2 group-hover:text-primary transition-colors">
                            <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                            <span className="truncate">
                              {plan.project?.project_id_prefix}-{plan.project?.project_id_number}
                            </span>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {plan.project?.project_title || 'Untitled Project'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {/* Phase & Status Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={getPhaseColor(plan.phase)}>
                          <CalendarCheck className="w-3 h-3 mr-1" />
                          {getPhaseLabel(plan.phase)}
                        </Badge>
                        <Badge className={getStatusColor(plan.status)}>
                          {plan.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      {/* Engineer & Date */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">
                            {plan.ora_engineer?.full_name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{format(new Date(plan.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateORPModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={(planId) => {
          setShowCreateModal(false);
          navigate(`/operation-readiness/${planId}`);
        }}
      />
    </div>
  );
};
