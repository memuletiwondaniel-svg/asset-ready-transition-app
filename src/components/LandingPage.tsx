
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { FileText, Settings, BarChart3, ArrowLeft, Users, Building, CheckSquare, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onBack, onNavigate }) => {
  // For now, we'll simulate admin status. In a real app, this would come from authentication context
  const [isAdmin] = useState(true); // This should be replaced with actual admin check

  const canvasSections = [
    {
      id: 'pssr',
      title: 'PSSR',
      description: 'Manage the risks of introduction of hydrocarbons and ensue safe start-up using the Pre-Start Up Safety Review (PSSR) Process and Checklist',
      icon: FileText,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'assets',
      title: 'PAC', 
      description: 'Manage the provisional transfer of Custody, Care and Operational Control from Project to Asset teams using the Provisional Acceptance Certificate (PAC) workflow',
      icon: Settings,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      id: 'analytics',
      title: 'FAC',
      description: 'Seamlessly Manage all prerequisites to enable final transfer of an operational facility from Project to Asset team using the Final Acceptance Certificate (FAC) and Handover workflow',
      icon: BarChart3,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    }
  ];

  const managementSections = [
    {
      id: 'users',
      title: 'User List Management',
      description: 'Manage application users, edit user details, and add new users to the system',
      icon: Users,
      path: '/users'
    },
    {
      id: 'projects',
      title: 'Project List Management',
      description: 'View and manage all projects, create new projects, and edit existing project details',
      icon: Building,
      path: '/projects'
    },
    {
      id: 'checklists',
      title: 'PSSR Checklist Management',
      description: 'Access and manage PSSR checklist categories for safety, electrical, and mechanical systems',
      icon: CheckSquare,
      path: '/pssr-checklists'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* More Menu for Admin Users */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="flex items-center justify-center">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  <DropdownMenuLabel>Management Modules</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {managementSections.map((section) => {
                    const IconComponent = section.icon;
                    return (
                      <DropdownMenuItem key={section.id} asChild>
                        <Link to={section.path} className="flex items-center gap-3 cursor-pointer">
                          <IconComponent className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{section.title}</div>
                            <div className="text-xs text-gray-500">{section.description}</div>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Core Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {canvasSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <Card 
                key={section.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 border-2 hover:border-gray-300 h-80 flex flex-col shadow-lg hover:shadow-xl"
                onClick={() => onNavigate(section.id)}
              >
                <CardHeader className="text-center pb-4 flex-shrink-0">
                  <div className={`mx-auto w-16 h-16 rounded-full ${section.color} ${section.hoverColor} flex items-center justify-center mb-4 transition-all duration-300 group-hover:shadow-lg group-hover:scale-110`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors duration-300">
                    {section.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-sm leading-relaxed min-h-[4rem]">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center mt-auto pb-6">
                  <Button 
                    className={`w-full ${section.color} ${section.hoverColor} text-white transition-all duration-300 shadow-md hover:shadow-lg group-hover:scale-105`}
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
      </div>
    </div>
  );
};

export default LandingPage;
