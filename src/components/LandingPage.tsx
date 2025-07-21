
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Settings, BarChart3, Users } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onBack, onNavigate }) => {
  const canvasSections = [
    {
      id: 'safe-startup',
      title: 'Safe Start-Up',
      description: 'Manage the safe introduction of hydrocarbons into new facilities using the Pre-Start Up Safety Review (PSSR) process and comprehensive safety checklists',
      icon: FileText,
      gradient: 'from-destructive/20 via-destructive/10 to-destructive/5',
      iconBg: 'bg-gradient-to-br from-destructive to-destructive/80',
      accentColor: 'destructive'
    },
    {
      id: 'p2o',
      title: 'Project-to-Operations (P2O)',
      description: 'Manage seamless transition and handover from Project team to Asset Operations Team using PAC and FAC workflows for operational readiness',
      icon: Settings,
      gradient: 'from-primary/20 via-primary/10 to-primary/5',
      iconBg: 'bg-gradient-to-br from-primary to-primary/80',
      accentColor: 'primary'
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, roles, permissions, and access control across the ORSH application with SSO integration for BGC and Kent employees',
      icon: Users,
      gradient: 'from-muted-foreground/20 via-muted-foreground/10 to-muted-foreground/5',
      iconBg: 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80',
      accentColor: 'muted-foreground'
    }
  ];

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

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="text-center mb-20 animate-fade-in-up">
          <h2 className="text-6xl font-light text-foreground mb-6 tracking-tight">
            Choose your
            <span className="fluent-hero-text font-semibold"> workspace</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Access the tools you need for operational readiness, safety compliance, and seamless project handovers
          </p>
        </div>

        {/* Enhanced Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {canvasSections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <div
                key={section.id}
                className="group cursor-pointer relative overflow-hidden border border-border/20 bg-card/90 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-reveal"
                onClick={() => onNavigate(section.id)}
                style={{ 
                  animationDelay: `${index * 200}ms`,
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
        
        {/* Enhanced Footer */}
        <div className="mt-24 text-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
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
