import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, Settings, ClipboardList, KeyRound, Send, Mic, ImagePlus, Sparkles, ArrowRight, Clock, FileText, CheckCircle, Home } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import AdminHeader from './admin/AdminHeader';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPageContent: React.FC<LandingPageProps> = ({
  onBack,
  onNavigate
}) => {
  const { language, setLanguage, translations: t } = useLanguage();
  const [userInput, setUserInput] = useState('');

  // Mock user data - in a real app, this would come from authentication context
  const userName = 'Daniel';


  const quickActions = [
    {
      id: 'create-pssr',
      label: 'Create a PSSR',
      icon: ClipboardList
    },
    {
      id: 'approve-pssr',
      label: 'Approve a PSSR',
      icon: CheckCircle
    },
    {
      id: 'develop-p2a',
      label: 'Develop a P2A Plan',
      icon: FileText
    }
  ];

  const workspaceCards = [
    {
      id: 'safe-startup',
      title: 'Safe Start-Up',
      description: 'Manage PSSR processes and safety checklists',
      icon: ShieldCheck,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'p2o',
      title: 'Project-to-Operations',
      description: 'Manage seamless project handovers',
      icon: KeyRound,
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'admin-tools',
      title: 'Admin & Tools',
      description: 'Manage users, roles, and permissions',
      icon: Settings,
      gradient: 'from-orange-500 to-orange-600'
    }
  ];

  const pendingTasks = [
    {
      id: 1,
      title: 'Review DP300 PSSR',
      dueDate: 'Due: Today',
      priority: 'High',
      type: 'approval'
    },
    {
      id: 2,
      title: 'Complete P2A Checklist',
      dueDate: 'Due: Tomorrow',
      priority: 'Medium',
      type: 'task'
    },
    {
      id: 3,
      title: 'Update Safety Protocols',
      dueDate: 'Due: 3 days',
      priority: 'Low',
      type: 'update'
    },
    {
      id: 4,
      title: 'Approve Team Member Access',
      dueDate: 'Due: Today',
      priority: 'High',
      type: 'approval'
    }
  ];

  return (
    <AnimatedBackground>
      {/* ORSH Header */}
      <AdminHeader selectedLanguage={language} onLanguageChange={setLanguage} translations={t}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={onBack} className="cursor-pointer flex items-center gap-1.5">
                <Home className="h-4 w-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>AI Assistant</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </AdminHeader>

      {/* Main 3-Section Layout */}
      <div className="h-[calc(100vh-5rem)] flex gap-4 p-4">
        {/* Left Side - Two Horizontal Panels Stacked */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Top Panel - AI Agent Interface */}
          <Card className="flex-1 border-border/40 shadow-lg overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Welcome, {userName}</CardTitle>
                  <CardDescription className="text-xs">What can I help you with today?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex flex-col h-full">
              <div className="flex-1 mb-4 space-y-3">
                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        className="h-auto p-3 border-border/40 hover:bg-accent/20 hover:scale-105 transition-all"
                      >
                        <div className="flex flex-col items-center gap-2 text-center">
                          <Icon className="w-5 h-5 text-primary" />
                          <span className="text-xs font-medium">{action.label}</span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Input Area */}
              <div className="space-y-3">
                <div className="relative">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask a question or describe what you need..."
                    className="min-h-[100px] resize-none border-border/40 pr-12"
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-3 right-3 rounded-full bg-gradient-to-br from-primary to-accent"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ImagePlus className="w-4 h-4" />
                      <span className="text-xs">Image</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Mic className="w-4 h-4" />
                      <span className="text-xs">Voice</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Panel - Workspace Cards */}
          <Card className="flex-1 border-border/40 shadow-lg">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="text-lg">Workspaces</CardTitle>
              <CardDescription className="text-xs">Select a workspace to get started</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3 h-full">
                {workspaceCards.map((workspace) => {
                  const Icon = workspace.icon;
                  return (
                    <Card
                      key={workspace.id}
                      onClick={() => onNavigate(workspace.id)}
                      className="cursor-pointer border-border/40 hover:border-primary/30 transition-all hover:shadow-lg hover:scale-105 group"
                    >
                      <CardContent className="p-4 flex flex-col items-center justify-center h-full text-center space-y-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${workspace.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                            {workspace.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {workspace.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - User Dashboard (Pending Tasks) */}
        <Card className="w-80 border-border/40 shadow-lg">
          <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Tasks
            </CardTitle>
            <CardDescription className="text-xs">Your action items</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {pendingTasks.map((task) => (
              <Card key={task.id} className="border-border/40 hover:border-primary/30 transition-all cursor-pointer hover:shadow-md">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                    <Badge 
                      variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{task.dueDate}</span>
                  </div>
                  {task.type === 'approval' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1 h-7 text-xs">Approve</Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">Reject</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </AnimatedBackground>
  );
};

const LandingPage: React.FC<LandingPageProps> = (props) => {
  return (
    <LanguageProvider>
      <LandingPageContent {...props} />
    </LanguageProvider>
  );
};

export default LandingPage;
