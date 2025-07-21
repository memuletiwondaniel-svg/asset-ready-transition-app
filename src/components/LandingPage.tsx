
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
    <div className="min-h-screen bg-background">
      {/* Header with Fluent Design acrylic effect */}
      <div className="fluent-acrylic border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                alt="BGC Logo" 
                className="h-10 w-auto" 
              />
              <div>
                <h1 className="text-xl font-semibold text-foreground">Operation Readiness & Start-up Handover</h1>
                <p className="text-sm text-muted-foreground">Basrah Gas Company - ORSH Platform</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onBack}
              className="fluent-button hover:bg-secondary-hover"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content with Microsoft spacing */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-light text-foreground mb-4">
            Choose your module
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the module you need to access for your operational readiness activities
          </p>
        </div>

        {/* Module Cards with Fluent Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {canvasSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <div
                key={section.id}
                className="fluent-card fluent-hover group cursor-pointer p-6 animate-fade-in"
                onClick={() => onNavigate(section.id)}
                style={{ animationDelay: `${canvasSections.indexOf(section) * 100}ms` }}
              >
                <div className="text-center">
                  <div className={`mx-auto w-16 h-16 rounded-xl ${section.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-card-foreground mb-3 group-hover:text-primary transition-colors duration-200">
                    {section.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6 min-h-[4rem]">
                    {section.description}
                  </p>
                  
                  <Button 
                    className={`w-full ${section.color} hover:${section.hoverColor} text-white fluent-button font-medium`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(section.id);
                    }}
                  >
                    Access {section.title}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer with system info */}
        <div className="mt-16 text-center">
          <p className="text-xs text-muted-foreground">
            Built with Microsoft Fluent Design System | Basrah Gas Company © 2024
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
