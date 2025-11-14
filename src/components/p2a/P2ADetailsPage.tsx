import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useP2AHandovers, useP2AHandoverDeliverables, useP2ADeliverableCategories } from '@/hooks/useP2AHandovers';
import { ArrowLeft, Upload, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { P2ADeliverablesList } from './P2ADeliverablesList';
import { P2AApprovalWorkflow } from './P2AApprovalWorkflow';
import { P2AFileUpload } from './P2AFileUpload';
import { P2ARealtimePresence } from './P2ARealtimePresence';
import { P2AExportPDF } from './P2AExportPDF';
import { P2AAuditTrail } from './P2AAuditTrail';
import { useP2AApprovalWorkflow } from '@/hooks/useP2AApprovalWorkflow';

export const P2ADetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { handovers, isLoading: loadingHandover } = useP2AHandovers();
  const { deliverables, isLoading: loadingDeliverables } = useP2AHandoverDeliverables(id || '');
  const { categories } = useP2ADeliverableCategories();
  const { approvals } = useP2AApprovalWorkflow(id || '');

  const handover = handovers?.find(h => h.id === id);

  if (loadingHandover) {
    return (
      <div className="flex h-screen">
        <OrshSidebar currentPage="p2a-handover" onNavigate={(section) => {
          if (section === 'home') {
            navigate('/');
          } else {
            navigate(`/${section}`);
          }
        }} onLogout={() => navigate('/')} />
        <div className="flex-1 p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!handover) {
    return (
      <div className="flex h-screen">
        <OrshSidebar currentPage="p2a-handover" onNavigate={(section) => {
          if (section === 'home') {
            navigate('/');
          } else {
            navigate(`/${section}`);
          }
        }} onLogout={() => navigate('/')} />
        <div className="flex-1 p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Handover not found</h2>
            <Button onClick={() => navigate('/p2a-handover')} className="mt-4">
              Back to P2A Handover
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Deliverables',
      value: deliverables?.length || 0,
      icon: FileText,
      color: 'text-blue-500'
    },
    {
      label: 'Completed',
      value: deliverables?.filter(d => d.status === 'COMPLETED').length || 0,
      icon: CheckCircle,
      color: 'text-green-500'
    },
    {
      label: 'In Progress',
      value: deliverables?.filter(d => d.status === 'IN_PROGRESS').length || 0,
      icon: Clock,
      color: 'text-amber-500'
    },
    {
      label: 'Behind Schedule',
      value: deliverables?.filter(d => d.status === 'BEHIND_SCHEDULE').length || 0,
      icon: AlertCircle,
      color: 'text-red-500'
    }
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <OrshSidebar 
        currentPage="p2a-handover"
        onNavigate={(section) => {
          if (section === 'home') navigate('/');
          else if (section === 'p2a-handover') navigate('/p2a-handover');
        }}
        onLogout={() => navigate('/')}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl p-4 md:p-6">
          <BreadcrumbNavigation currentPageLabel={`${handover.phase} - ${handover.project?.project_title}`} />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mt-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/p2a-handover')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent truncate">
                {handover.project?.project_id_prefix}-{handover.project?.project_id_number}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 line-clamp-2">
                {handover.project?.project_title}
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Badge variant={handover.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs sm:text-sm">
                {handover.status}
              </Badge>
              
              <P2AExportPDF handover={handover} deliverables={deliverables} approvals={approvals} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6">
            {/* Realtime Presence */}
            <P2ARealtimePresence handoverId={id || ''} />
            
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <CardContent className="p-3 sm:p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                        <div className={`p-2 sm:p-3 rounded-xl bg-muted ${stat.color}`}>
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}</p>
                          <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="deliverables" className="w-full">
              <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
                <TabsTrigger value="deliverables" className="text-xs sm:text-sm">Deliverables</TabsTrigger>
                <TabsTrigger value="approval" className="text-xs sm:text-sm">Approval</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
                <TabsTrigger value="audit" className="text-xs sm:text-sm">Audit Trail</TabsTrigger>
              </TabsList>

              <TabsContent value="deliverables" className="mt-6">
                <P2ADeliverablesList 
                  handoverId={id || ''}
                  deliverables={deliverables || []}
                  categories={categories || []}
                  isLoading={loadingDeliverables}
                />
              </TabsContent>

              <TabsContent value="approval" className="mt-6">
                <P2AApprovalWorkflow handover={handover} />
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <P2AFileUpload deliverableId={deliverables?.[0]?.id || ''} handoverId={id || ''} />
              </TabsContent>

              <TabsContent value="audit" className="mt-6">
                <P2AAuditTrail handoverId={id || ''} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};