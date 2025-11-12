import React, { useState } from 'react';
import { OrshSidebar } from '@/components/OrshSidebar';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Key, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { CreateP2AHandoverModal } from './CreateP2AHandoverModal';
import { P2AHeatmap } from './P2AHeatmap';
import { useP2AHandovers } from '@/hooks/useP2AHandovers';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useNavigate } from 'react-router-dom';

export const P2ALandingPage: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { handovers, isLoading } = useP2AHandovers();
  const { updateMetadata } = useBreadcrumb();
  const navigate = useNavigate();

  React.useEffect(() => {
    updateMetadata('title', 'P2A Handover');
  }, [updateMetadata]);

  const stats = [
    {
      title: 'Total Handovers',
      value: handovers?.length || 0,
      icon: Key,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      title: 'In Progress',
      value: handovers?.filter(h => h.status === 'IN_PROGRESS').length || 0,
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-500/20 to-orange-500/20'
    },
    {
      title: 'Behind Schedule',
      value: 0, // This would come from deliverables analysis
      icon: AlertCircle,
      gradient: 'from-red-500 to-pink-500',
      bgGradient: 'from-red-500/20 to-pink-500/20'
    },
    {
      title: 'Completed',
      value: handovers?.filter(h => h.status === 'COMPLETED').length || 0,
      icon: CheckCircle,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/20 to-emerald-500/20'
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <OrshSidebar 
        currentPage="p2a-handover"
        onNavigate={(section) => {
          if (section === 'home') navigate('/');
          else if (section === 'safe-startup') navigate('/safe-startup');
          else if (section === 'operation-readiness') navigate('/operation-readiness');
          else if (section === 'user-management') navigate('/users');
          else if (section === 'admin-tools') navigate('/admin-tools');
          else if (section === 'projects') navigate('/projects');
        }}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl p-6">
          <BreadcrumbNavigation currentPageLabel="P2A Handover" />
          
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                P2A Handover
              </h1>
              <p className="text-muted-foreground mt-1">
                Project to Asset Transition Management
              </p>
            </div>
            
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              <Plus className="mr-2 h-4 w-4" />
              Initiate Handover
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.title}
                    className={`relative overflow-hidden border-border/40 bg-gradient-to-br ${stat.bgGradient} animate-fade-in`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <p className="text-3xl font-bold">{stat.value}</p>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16" />
                  </Card>
                );
              })}
            </div>

            {/* Heatmap */}
            <P2AHeatmap />
          </div>
        </div>
      </div>

      <CreateP2AHandoverModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
};