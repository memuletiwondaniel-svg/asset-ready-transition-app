
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Settings, BarChart3, ArrowLeft } from 'lucide-react';

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onBack, onNavigate }) => {
  const canvasSections = [
    {
      id: 'pssr',
      title: 'PSSR',
      description: 'Manage safe Start-up and introduction of hydrocarbons using the Pre-Start Up Safety Review (PSSR) process',
      icon: FileText,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'assets',
      title: 'PAC', 
      description: 'Track and manage Provisional Acceptance Certificates and Handovers (PAC)',
      icon: Settings,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      id: 'analytics',
      title: 'Analytics & Reporting',
      description: 'View project metrics and generate reports',
      icon: BarChart3,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
              alt="BGC Logo" 
              className="h-12 w-auto mr-4" 
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project-to-Asset Management System</h1>
              <p className="text-gray-600 mt-1">Basrah Gas Company - P2A Platform</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Canvas Sections */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {canvasSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <Card 
                key={section.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-2 hover:border-gray-300"
                onClick={() => onNavigate(section.id)}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto w-16 h-16 rounded-full ${section.color} ${section.hoverColor} flex items-center justify-center mb-4 transition-colors group-hover:shadow-lg`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-gray-700">
                    {section.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    className={`w-full ${section.color} ${section.hoverColor} text-white transition-all duration-300`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(section.id);
                    }}
                  >
                    Access {section.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats or Additional Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-blue-600">24/7</CardTitle>
              <CardDescription>System Availability</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-white/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-green-600">Secure</CardTitle>
              <CardDescription>Data Protection</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-white/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-purple-600">Integrated</CardTitle>
              <CardDescription>Workflow Management</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
