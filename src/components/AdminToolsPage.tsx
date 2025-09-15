import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, BarChart3, Settings, ArrowLeft, ArrowRight, Upload, Clock, CheckCircle } from 'lucide-react';
import EnhancedUserManagement from "@/components/user-management/EnhancedUserManagement";
import ManageChecklistPage from "./ManageChecklistPage";
import ProjectManagementPage from "./project/ProjectManagementPage";
import { supabase } from '@/integrations/supabase/client';

interface AdminToolsPageProps {
  onBack: () => void;
}

const AdminToolsPage: React.FC<AdminToolsPageProps> = ({ onBack }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'checklist' | 'projects'>('dashboard');
  const [userStats, setUserStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    inactive: 0
  });

  // Fetch user statistics
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const { data: users, error } = await supabase
          .from('profiles')
          .select('status, account_status');
        
        if (error) {
          console.error('Error fetching user stats:', error);
          return;
        }

        const stats = {
          total: users?.length || 0,
          pending: users?.filter(u => u.status === 'pending_approval').length || 0,
          active: users?.filter(u => u.status === 'active').length || 0,
          inactive: users?.filter(u => u.status === 'inactive').length || 0
        };
        
        setUserStats(stats);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };

    fetchUserStats();
  }, []);

  if (activeView === 'users') {
    return <EnhancedUserManagement onBack={() => setActiveView('dashboard')} />;
  }

  if (activeView === 'checklist') {
    return <ManageChecklistPage onBack={() => setActiveView('dashboard')} />;
  }

  if (activeView === 'projects') {
    return <ProjectManagementPage />;
  }

  const adminTools = [
    {
      id: 'users',
      title: 'Manage User',
      description: 'Manage users, roles, permissions, and access control across the ORSH application with SSO integration for BGC and Kent employees',
      icon: Users,
      accentColor: '#0078D4', // Microsoft Blue
      stats: { 
        total: userStats.total, 
        pending: userStats.pending,
        active: userStats.active 
      },
      onClick: () => setActiveView('users')
    },
    {
      id: 'checklist',
      title: 'Manage Checklists',
      description: 'Create, edit, and manage PSSR checklists with comprehensive item selection and configuration',
      icon: Upload,
      accentColor: '#107C10', // Microsoft Green
      stats: { total: 65, active: 65 },
      onClick: () => setActiveView('checklist')
    },
    {
      id: 'projects',
      title: 'Manage Project',
      description: 'Manage project timelines, resources, and deliverables across all BGC operations with comprehensive tracking and reporting',
      icon: BarChart3,
      accentColor: '#FF8C00', // Microsoft Orange
      stats: { total: 12, active: 8 },
      onClick: () => setActiveView('projects')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Microsoft Fluent Navigation Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-14 items-center">
          <div className="flex items-center space-x-4">
            <div className="transition-transform hover:scale-105">
              <img 
                src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                alt="BGC Logo" 
                className="h-8 w-auto" 
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                Administration Tools
              </h1>
              <p className="text-xs text-muted-foreground">Basrah Gas Company • ORSH Platform</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="h-9"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Modern Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">
            Administration
          </h2>
          <p className="text-muted-foreground mt-2">
            Manage users, projects, and system configurations
          </p>
        </div>

        {/* Modern Cards Grid */}
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminTools.map((tool, index) => {
              const IconComponent = tool.icon;
              return (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Card
                      className="group cursor-pointer transition-all duration-200 hover:shadow-lg border-0 bg-card hover:bg-accent/5"
                      onClick={tool.onClick}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between mb-4">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110 bg-primary/10"
                          >
                            <IconComponent 
                              className="h-6 w-6 text-primary" 
                            />
                          </div>
                          
                          <div className="flex flex-col items-end space-y-1">
                            {tool.stats.total !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {tool.stats.total}
                              </Badge>
                            )}
                            {tool.stats.pending && tool.stats.pending > 0 && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                <Clock className="h-3 w-3 mr-1" />
                                {tool.stats.pending}
                              </Badge>
                            )}
                            {tool.stats.active && tool.stats.active > 0 && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {tool.stats.active}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <CardTitle className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                            {tool.title}
                          </CardTitle>
                          <Button 
                            className="w-full justify-between group-hover:shadow-sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (tool.onClick) tool.onClick();
                            }}
                          >
                            Open
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>{tool.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>


      </div>
    </div>
  );
};

export default AdminToolsPage;