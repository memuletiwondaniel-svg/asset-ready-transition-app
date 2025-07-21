
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Settings, BarChart3, ArrowLeft, Users } from 'lucide-react';

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
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600'
    },
    {
      id: 'p2o',
      title: 'Project-to-Operations (P2O)',
      description: 'Manage seamless transition and handover from Project team to Asset Operations Team using PAC and FAC workflows for operational readiness',
      icon: Settings,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, roles, permissions, and access control across the ORSH application with SSO integration for BGC and Kent employees',
      icon: Users,
      color: 'bg-gray-500',
      hoverColor: 'hover:bg-gray-600'
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
                  Operation Readiness & Start-up Handover
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
                className="fluent-card group cursor-pointer p-8 relative overflow-hidden border-0 bg-card/80 backdrop-blur-xl animate-reveal"
                onClick={() => onNavigate(section.id)}
                style={{ 
                  animationDelay: `${index * 200}ms`,
                  background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card))/0.8 100%)'
                }}
              >
                {/* Reveal effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  {/* Icon with enhanced styling */}
                  <div className={`w-20 h-20 rounded-2xl ${section.color} flex items-center justify-center mb-8 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-fluent-lg group-hover:shadow-fluent-xl`}>
                    <IconComponent className="h-10 w-10 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="text-center space-y-4">
                    <h3 className="text-2xl font-bold text-card-foreground group-hover:text-primary transition-colors duration-300">
                      {section.title}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed min-h-[5rem] text-base">
                      {section.description}
                    </p>
                    
                    {/* Enhanced CTA Button */}
                    <div className="pt-6">
                      <Button 
                        className={`w-full ${section.color} hover:${section.hoverColor} text-white fluent-button font-semibold py-3 rounded-xl group-hover:scale-105 shadow-fluent-md hover:shadow-fluent-lg transition-all duration-300`}
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

                {/* Decorative elements */}
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
