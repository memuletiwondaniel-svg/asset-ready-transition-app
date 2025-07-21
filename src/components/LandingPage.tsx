
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Settings, BarChart3, Users, ClipboardList, AlertTriangle, CheckCircle, Clock, ArrowRight, Search, Filter, Eye, EyeOff } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onBack, onNavigate }) => {
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin'; // Change to 'user' to test role-based access
  
  // State management
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [showAllTasks, setShowAllTasks] = useState(false);
  
  // Mock pending tasks data - expanded to 8 tasks
  const pendingTasks = [
    {
      id: 1,
      title: "Authenticate 3 New Users",
      description: "BGC and Kent employees awaiting SSO setup",
      age: "2 days",
      criticality: "high",
      type: "authentication",
      icon: Users
    },
    {
      id: 2,
      title: "Approve DP300 PSSR Line Items",
      description: "Safety review items pending approval",
      age: "4 hours",
      criticality: "critical",
      type: "pssr",
      icon: ShieldCheck
    },
    {
      id: 3,
      title: "Sign PAC Certificate for DP083C UQ Jetty 2",
      description: "Project Acceptance Certificate awaiting signature",
      age: "1 day",
      criticality: "medium",
      type: "pac",
      icon: ClipboardList
    },
    {
      id: 4,
      title: "Review Emergency Shutdown Procedures",
      description: "Critical safety protocol review required",
      age: "6 hours",
      criticality: "critical",
      type: "safety",
      icon: AlertTriangle
    },
    {
      id: 5,
      title: "Complete Handover Documentation",
      description: "Project handover checklist completion",
      age: "3 days",
      criticality: "medium",
      type: "handover",
      icon: Settings
    },
    {
      id: 6,
      title: "Approve Training Certifications",
      description: "5 training certificates awaiting approval",
      age: "1 day",
      criticality: "low",
      type: "training",
      icon: CheckCircle
    },
    {
      id: 7,
      title: "Update Asset Register",
      description: "New equipment registration pending",
      age: "5 days",
      criticality: "medium",
      type: "assets",
      icon: BarChart3
    },
    {
      id: 8,
      title: "Schedule Maintenance Windows",
      description: "Q2 maintenance schedule review",
      age: "12 hours",
      criticality: "high",
      type: "maintenance",
      icon: Clock
    }
  ];

  const allSections = [
    {
      id: 'safe-startup',
      title: 'Safe Start-Up',
      description: 'Manage the safe introduction of hydrocarbons into new facilities using the Pre-Start Up Safety Review (PSSR) process and comprehensive safety checklists',
      icon: ShieldCheck,
      gradient: 'from-destructive/20 via-destructive/10 to-destructive/5',
      iconBg: 'bg-gradient-to-br from-destructive to-destructive/80',
      accentColor: 'destructive',
      allowedRoles: ['user', 'admin']
    },
    {
      id: 'p2o',
      title: 'Project-to-Operations (P2O)',
      description: 'Manage seamless transition and handover from Project team to Asset Operations Team using PAC and FAC workflows for operational readiness',
      icon: Settings,
      gradient: 'from-primary/20 via-primary/10 to-primary/5',
      iconBg: 'bg-gradient-to-br from-primary to-primary/80',
      accentColor: 'primary',
      allowedRoles: ['user', 'admin']
    },
    {
      id: 'admin-tools',
      title: 'Admin & Tools',
      description: 'Manage users, roles, permissions, projects, and access control across the ORSH application with comprehensive tracking and reporting',
      icon: BarChart3,
      gradient: 'from-muted-foreground/20 via-muted-foreground/10 to-muted-foreground/5',
      iconBg: 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80',
      accentColor: 'muted-foreground',
      allowedRoles: ['admin']
    }
  ];

  // Filter sections based on user role
  const availableSections = allSections.filter(section => 
    section.allowedRoles.includes(userRole)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Enhanced Navigation Bar */}
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
                  Operation Readiness, Start-Up & Handover
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
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Pending Tasks Summary */}
        <div className="mb-12 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-3xl font-bold text-foreground">Your Dashboard</h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                2 new tasks added on 02/04/2025
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => setShowAllTasks(!showAllTasks)}
              >
                <Eye className="h-3 w-3 mr-1" />
                {showAllTasks ? 'Show Less' : 'Show All Tasks'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => setShowWorkspace(!showWorkspace)}
              >
                {showWorkspace ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                {showWorkspace ? 'Hide Workspace' : 'Show Workspace'}
              </Button>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="h-8">
                <Search className="h-3 w-3 mr-1" />
                Search
              </Button>
            </div>
          </div>

          {/* Expandable Task Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-all duration-500">
            {(showAllTasks ? pendingTasks : pendingTasks.slice(0, 4)).map((task) => {
              const IconComponent = task.icon;
              const getCriticalityColor = (criticality: string) => {
                switch (criticality) {
                  case 'critical': return 'destructive';
                  case 'high': return 'orange';
                  case 'medium': return 'blue';
                  default: return 'secondary';
                }
              };
              
              return (
                <Card 
                  key={task.id} 
                  className="fluent-card hover:shadow-fluent-lg transition-all duration-300 cursor-pointer group border-0 bg-white/60 backdrop-blur-xl shadow-sm hover:shadow-lg hover:bg-white/80"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground mb-1 truncate">{task.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full">
                          {task.age}
                        </Badge>
                        <Badge 
                          variant={getCriticalityColor(task.criticality) as any} 
                          className="text-xs px-2 py-0.5 rounded-full"
                        >
                          {task.criticality}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 p-0 text-xs group-hover:text-primary">
                        View <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Workspace Selection */}
        {showWorkspace && (
          <div className="mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-light text-foreground mb-4 tracking-tight">
                Choose your
                <span className="fluent-hero-text font-semibold"> workspace</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Access the tools you need for operational readiness, safety compliance, and seamless project handovers
              </p>
            </div>

            {/* Enhanced Module Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {availableSections.map((section, index) => {
                const IconComponent = section.icon;
                return (
                  <div
                    key={section.id}
                    className="group cursor-pointer relative overflow-hidden border border-border/20 bg-card/90 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-reveal"
                    onClick={() => onNavigate(section.id)}
                    style={{ 
                      animationDelay: `${0.4 + index * 0.1}s`,
                    }}
                  >
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    {/* Content container */}
                    <div className="relative z-10 p-8">
                      {/* Icon with modern styling */}
                      <div className="flex justify-center mb-8">
                        <div className={`w-20 h-20 rounded-2xl ${section.iconBg} flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg group-hover:shadow-xl`}>
                          <IconComponent className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="text-center space-y-6">
                        <h3 className="text-2xl font-bold text-card-foreground group-hover:text-primary transition-colors duration-300">
                          {section.title}
                        </h3>
                        
                        <p className="text-muted-foreground leading-relaxed text-base min-h-[5rem]">
                          {section.description}
                        </p>
                        
                        {/* Modern CTA Button */}
                        <div className="pt-4">
                          <Button 
                            className="w-full bg-card-foreground hover:bg-primary text-card border-0 font-semibold py-3 rounded-xl group-hover:scale-105 shadow-md hover:shadow-lg transition-all duration-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(section.id);
                            }}
                          >
                            Launch {section.title}
                            <ArrowLeft className="h-4 w-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform duration-200" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Decorative accent */}
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${section.accentColor} to-${section.accentColor}/60`} />
                    
                    {/* Hover glow effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm -z-10" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Enhanced Footer */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-card/50 backdrop-blur-sm border border-border/50 shadow-fluent-sm">
            <div className="w-2 h-2 rounded-full bg-success mr-3 animate-pulse-subtle" />
            <p className="text-sm text-muted-foreground font-medium">
              Powered by Microsoft Fluent Design • Basrah Gas Company © 2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
