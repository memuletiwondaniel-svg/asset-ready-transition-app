import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      title: 'User Management',
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
      id: 'manage-checklist',
      title: 'PSSR Configuration',
      description: 'Configure and manage PSSR checklists for Pre-Startup Safety Reviews across all facility start-up operations',
      icon: Settings,
      accentColor: '#5C2D91', // Microsoft Purple
      stats: { total: 3, active: 2 }
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f6f9fc 0%, #e9f3ff 100%)' }}>
      {/* Fluent Navigation Bar */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="transition-transform hover:scale-105">
                <img 
                  src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                  alt="BGC Logo" 
                  className="h-10 w-auto" 
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Administration Tools
                </h1>
                <p className="text-sm text-gray-600">Basrah Gas Company • ORSH Platform</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onBack}
              className="border-gray-300 hover:border-primary hover:bg-primary/5 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header - Microsoft Fluent Style */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-light text-gray-900 mb-4">
            Administration
            <span className="font-semibold"> Tools</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage users, projects, and system configurations with comprehensive administrative controls
          </p>
        </div>

        {/* Microsoft Fluent Design Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {adminTools.map((tool, index) => {
            const IconComponent = tool.icon;
            return (
              <Card
                key={tool.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-white/80 backdrop-blur-sm"
                onClick={tool.onClick}
                style={{ 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft: `4px solid ${tool.accentColor}`
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${tool.accentColor}15` }}
                    >
                      <IconComponent 
                        className="h-6 w-6 transition-all duration-300" 
                        style={{ color: tool.accentColor }} 
                      />
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      {tool.stats.total !== undefined && (
                        <Badge 
                          variant="outline" 
                          className="text-xs font-medium bg-gray-50 border-gray-200 text-gray-700"
                        >
                          {tool.stats.total} Total
                        </Badge>
                      )}
                      {tool.stats.pending && tool.stats.pending > 0 && (
                        <Badge 
                          className="text-xs font-medium animate-pulse"
                          style={{ 
                            backgroundColor: '#FFF4E6', 
                            color: '#CC8400', 
                            border: '1px solid #FFECCF' 
                          }}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {tool.stats.pending} Pending
                        </Badge>
                      )}
                      {tool.stats.active && tool.stats.active > 0 && (
                        <Badge 
                          className="text-xs font-medium"
                          style={{ 
                            backgroundColor: '#F3F9F4', 
                            color: '#107C10', 
                            border: '1px solid #E1F3E3' 
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {tool.stats.active} Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardTitle className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-primary transition-colors duration-300">
                    {tool.title}
                  </CardTitle>
                  
                  <CardDescription className="text-gray-600 leading-relaxed mb-4 text-sm">
                    {tool.description}
                  </CardDescription>
                  
                  <Button 
                    className="w-full font-medium transition-all duration-300 group-hover:scale-[1.02]"
                    style={{ 
                      backgroundColor: tool.accentColor,
                      borderColor: tool.accentColor
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (tool.onClick) tool.onClick();
                    }}
                  >
                    Manage {tool.title.split(' ')[0]}
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Microsoft Fluent Quick Actions */}
        <Card className="border-0 bg-white/60 backdrop-blur-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
            <CardDescription className="text-gray-600">Frequently used administrative functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="justify-start h-12 border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200"
              >
                <Settings className="h-4 w-4 mr-3" />
                System Settings
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-12 border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200"
                onClick={() => setActiveView('users')}
              >
                <Users className="h-4 w-4 mr-3" />
                Bulk User Import
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-12 border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200"
              >
                <BarChart3 className="h-4 w-4 mr-3" />
                Generate Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Microsoft Fluent Footer */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/60 backdrop-blur-sm border border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div className="w-2 h-2 rounded-full bg-green-500 mr-3" />
            <p className="text-sm text-gray-600 font-medium">
              Administrative Tools • Basrah Gas Company © 2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminToolsPage;