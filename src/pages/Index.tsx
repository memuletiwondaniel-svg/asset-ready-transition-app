
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardCheck, 
  Award, 
  CheckCircle, 
  Users, 
  Building2, 
  Shield,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react';
import PSSRModule from '@/components/PSSRModule';
import AuthenticationModal from '@/components/AuthenticationModal';

const Index = () => {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleModuleClick = (module: string) => {
    setActiveModule(module);
  };

  // Show authentication modal first if not authenticated
  if (!isAuthenticated) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10">
          <AuthenticationModal 
            isOpen={true} 
            onClose={() => {}} // Prevent closing since login is required
            onAuthenticated={() => setIsAuthenticated(true)}
          />
        </div>
      </div>
    );
  }

  if (activeModule === 'pssr') {
    return <PSSRModule onBack={() => setActiveModule(null)} />;
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url(/lovable-uploads/30a2a118-1d3d-4475-a504-cba628119b02.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-white/90"></div>
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">P2A</h1>
                  <p className="text-xs text-gray-500">Project-to-Asset Management</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Basrah Gas Company
                </Badge>
                <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to P2A Management System
            </h2>
            <p className="text-lg text-gray-700">
              Seamlessly transition projects from construction to operational phase with comprehensive safety reviews and acceptance certificates.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ClipboardCheck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active PSSRs</p>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">PACs Issued</p>
                    <p className="text-2xl font-bold text-gray-900">8</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">FACs Completed</p>
                    <p className="text-2xl font-bold text-gray-900">5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                    <p className="text-2xl font-bold text-gray-900">7</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Modules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* PSSR Module */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white/90 backdrop-blur-sm" onClick={() => handleModuleClick('pssr')}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <ClipboardCheck className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">PSSR</CardTitle>
                <CardDescription className="text-base font-medium">
                  Pre-Start-Up Safety Review
                </CardDescription>
                <CardDescription>
                  Manage the safe introduction of hydrocarbons into newly constructed facilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Reviews</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Approvals</span>
                    <Badge variant="destructive">3</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <Badge variant="default" className="bg-green-600">45</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PAC Module */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 bg-white/90 backdrop-blur-sm" onClick={() => handleModuleClick('pac')}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <Award className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">PAC</CardTitle>
                <CardDescription className="text-base font-medium">
                  Provisional Acceptance Certificate
                </CardDescription>
                <CardDescription>
                  Issue and manage provisional acceptance certificates for project deliverables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">In Progress</span>
                    <Badge variant="secondary">5</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Issued</span>
                    <Badge variant="default" className="bg-green-600">8</Badge>
                  </div>
                  <Badge variant="outline" className="w-full justify-center">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>

            {/* FAC Module */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 bg-white/90 backdrop-blur-sm" onClick={() => handleModuleClick('fac')}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto p-4 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">FAC</CardTitle>
                <CardDescription className="text-base font-medium">
                  Final Acceptance Certificate
                </CardDescription>
                <CardDescription>
                  Complete the project handover with final acceptance certification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">In Progress</span>
                    <Badge variant="secondary">2</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <Badge variant="default" className="bg-green-600">5</Badge>
                  </div>
                  <Badge variant="outline" className="w-full justify-center">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="mt-8 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <ClipboardCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">PSSR-2024-001 submitted for review</p>
                      <p className="text-sm text-gray-600">NRNGL Plant - Start-up commissioning</p>
                    </div>
                  </div>
                  <Badge variant="outline">2 hours ago</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Technical Authority approval received</p>
                      <p className="text-sm text-gray-600">PSSR-2024-003 - Process Engineering review</p>
                    </div>
                  </div>
                  <Badge variant="outline">1 day ago</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Index;
