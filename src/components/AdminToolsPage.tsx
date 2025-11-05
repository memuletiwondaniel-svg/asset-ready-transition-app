import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, FolderOpen, Settings, ArrowLeft, ClipboardList, Clock, CheckCircle } from 'lucide-react';
import EnhancedUserManagement from "@/components/user-management/EnhancedUserManagement";
import ManageChecklistPage from "./ManageChecklistPage";
import ProjectManagementPage from "./project/ProjectManagementPage";
import PSSRSettingsManagement from "./PSSRSettingsManagement";
import AdminHeader from "./admin/AdminHeader";
import { supabase } from '@/integrations/supabase/client';
import { getCurrentTranslations } from '@/utils/translations';
interface AdminToolsPageProps {
  onBack: () => void;
}
const AdminToolsPage: React.FC<AdminToolsPageProps> = ({
  onBack
}) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'checklist' | 'projects' | 'pssr-settings'>('dashboard');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
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
        const {
          data: users,
          error
        } = await supabase.from('profiles').select('status, account_status');
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

  // Get current translations
  const t = getCurrentTranslations(selectedLanguage);
  if (activeView === 'users') {
    return <EnhancedUserManagement onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} translations={t} />;
  }
  if (activeView === 'checklist') {
    return <ManageChecklistPage onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} translations={t} />;
  }
  if (activeView === 'projects') {
    return <ProjectManagementPage onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} translations={t} />;
  }
  const adminTools = [{
    id: 'users',
    title: t.manageUser,
    description: t.manageUserDesc,
    icon: Users,
    gradient: 'from-blue-500 to-blue-600',
    stats: {
      total: userStats.total
    },
    onClick: () => setActiveView('users')
  }, {
    id: 'checklist',
    title: 'PSSR Configuration',
    description: 'Manage checklists, categories, topics, and PSSR settings',
    icon: ClipboardList,
    gradient: 'from-emerald-500 to-emerald-600',
    stats: {},
    onClick: () => setActiveView('checklist')
  }, {
    id: 'projects',
    title: t.manageProject,
    description: t.manageProjectDesc,
    icon: FolderOpen,
    gradient: 'from-orange-500 to-orange-600',
    stats: {
      total: 12
    },
    onClick: () => setActiveView('projects')
  }];
  return <div className="min-h-screen bg-background">
      <AdminHeader selectedLanguage={selectedLanguage} onLanguageChange={setSelectedLanguage} translations={t}>
        
        <div className="ml-auto">
          <Button variant="outline" onClick={onBack} className="h-9 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to ORSH Homepage
          </Button>
        </div>
      </AdminHeader>

      <div className="container pt-16 pb-8 max-w-7xl mx-auto">
        {/* Modern Header with Gradient */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-3">
            {t.administration}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t.adminToolsSubtitle}
          </p>
        </div>

        {/* Modern Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminTools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <Card 
                key={tool.id}
                className="group relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden"
                onClick={tool.onClick}
              >
                {/* Gradient Background Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <CardHeader className="relative space-y-6 p-8">
                  {/* Icon Section */}
                  <div className="flex items-center justify-between">
                    <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    
                    {/* Stats Badge */}
                    {tool.stats.total !== undefined && (
                      <div className="flex flex-col items-end">
                        <span className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                          {tool.stats.total}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          Total
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Title & Description */}
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                      {tool.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {tool.description}
                    </CardDescription>
                  </div>
                  
                  {/* Hover Indicator */}
                  <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>Manage</span>
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>;
};
export default AdminToolsPage;