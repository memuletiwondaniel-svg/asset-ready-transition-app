import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart3, Settings, ArrowLeft, ArrowRight, Upload } from 'lucide-react';
import EnhancedUserManagement from "@/components/user-management/EnhancedUserManagement";
import ChecklistManagementPage from "./ChecklistManagementPage";

interface AdminToolsPageProps {
  onBack: () => void;
}

const AdminToolsPage: React.FC<AdminToolsPageProps> = ({ onBack }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'checklist'>('dashboard');

  if (activeView === 'users') {
    return <EnhancedUserManagement onBack={() => setActiveView('dashboard')} />;
  }

  if (activeView === 'checklist') {
    return <ChecklistManagementPage onBack={() => setActiveView('dashboard')} />;
  }

  const adminTools = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, roles, permissions, and access control across the ORSH application with SSO integration for BGC and Kent employees',
      icon: Users,
      gradient: 'from-blue-500/20 via-blue-500/10 to-blue-500/5',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      stats: { total: 45, pending: 3 },
      onClick: () => setActiveView('users')
    },
    {
      id: 'checklist',
      title: 'Checklist Management',
      description: 'Browse and manage PSSR checklist items by category with intuitive organization',
      icon: Upload,
      gradient: 'from-green-500/20 via-green-500/10 to-green-500/5',
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
      stats: { total: 65, active: 65 },
      onClick: () => setActiveView('checklist')
    },
    {
      id: 'manage-checklist',
      title: 'PSSR Configuration',
      description: 'Configure and manage PSSR checklists for Pre-Startup Safety Reviews across all facility start-up operations',
      icon: Settings,
      gradient: 'from-purple-500/20 via-purple-500/10 to-purple-500/5',
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      stats: { total: 3, active: 2 }
    },
    {
      id: 'projects',
      title: 'Project Management',
      description: 'Manage project timelines, resources, and deliverables across all BGC operations with comprehensive tracking and reporting',
      icon: BarChart3,
      gradient: 'from-orange-500/20 via-orange-500/10 to-orange-500/5',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      stats: { total: 12, active: 8 }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Navigation Bar */}
      <div className="fluent-navigation sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="fluent-reveal">
                <img 
                  src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                  alt="BGC Logo" 
                  className="h-12 w-auto animate-float" 
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  Admin & Tools
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Basrah Gas Company • ORSH Platform</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onBack}
              className="fluent-button hover:bg-secondary/80 hover:border-primary/20 shadow-fluent-sm hover:shadow-fluent-md group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-12 animate-fade-in-up">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-light text-foreground mb-4 tracking-tight">
              Administration
              <span className="fluent-hero-text font-semibold"> Tools</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Manage users, projects, and system configurations with comprehensive administrative controls
            </p>
          </div>
        </div>

        {/* Admin Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {adminTools.map((tool, index) => {
            const IconComponent = tool.icon;
            return (
              <div
                key={tool.id}
                className="group cursor-pointer relative overflow-hidden border border-border/20 bg-card/90 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-reveal"
                onClick={tool.onClick}
                style={{ 
                  animationDelay: `${0.2 + index * 0.1}s`,
                }}
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {/* Content container */}
                <div className="relative z-10 p-8">
                  {/* Header with icon and stats */}
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-16 h-16 rounded-2xl ${tool.iconBg} flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg group-hover:shadow-xl`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      {tool.stats.total && (
                        <Badge variant="outline" className="text-xs">
                          {tool.stats.total} Total
                        </Badge>
                      )}
                      {tool.stats.pending && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          {tool.stats.pending} Pending
                        </Badge>
                      )}
                      {tool.stats.active && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                          {tool.stats.active} Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-card-foreground group-hover:text-primary transition-colors duration-300">
                      {tool.title}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed text-base">
                      {tool.description}
                    </p>
                    
                    {/* CTA Button */}
                    <div className="pt-4">
                      <Button 
                        className="w-full bg-card-foreground hover:bg-primary text-card border-0 font-semibold py-3 rounded-xl group-hover:scale-105 shadow-md hover:shadow-lg transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (tool.onClick) tool.onClick();
                        }}
                      >
                        Manage {tool.title.split(' ')[0]}
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Decorative accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/60" />
                
                {/* Hover glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm -z-10" />
              </div>
            );
          })}
        </div>

        {/* Quick Actions Section */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start h-12">
                <Settings className="h-4 w-4 mr-2" />
                System Settings
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-12"
                onClick={() => setActiveView('users')}
              >
                <Users className="h-4 w-4 mr-2" />
                Bulk User Import
              </Button>
              <Button variant="outline" className="justify-start h-12">
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-card/50 backdrop-blur-sm border border-border/50 shadow-fluent-sm">
            <div className="w-2 h-2 rounded-full bg-success mr-3 animate-pulse-subtle" />
            <p className="text-sm text-muted-foreground font-medium">
              Administrative Tools • Basrah Gas Company © 2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminToolsPage;