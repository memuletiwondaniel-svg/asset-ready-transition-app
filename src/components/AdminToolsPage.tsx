import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, FolderOpen, Settings, ArrowLeft, ClipboardList, Clock, CheckCircle, Home, Search, X } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [recentTools, setRecentTools] = useState<string[]>([]);
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

  // Load recent tools from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('orsh-recent-admin-tools');
    if (stored) {
      try {
        setRecentTools(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing recent tools:', e);
      }
    }
  }, []);

  // Handle tool access tracking
  const handleToolClick = (toolId: string, action: () => void) => {
    // Update recent tools (max 3, most recent first)
    setRecentTools(prev => {
      const updated = [toolId, ...prev.filter(id => id !== toolId)].slice(0, 3);
      localStorage.setItem('orsh-recent-admin-tools', JSON.stringify(updated));
      return updated;
    });
    action();
  };

  // Get current translations
  const t = getCurrentTranslations(selectedLanguage);
  
  const adminTools = [{
    id: 'users',
    title: t.manageUser,
    description: t.manageUserDesc,
    icon: Users,
    gradient: 'from-blue-500 to-blue-600',
    tooltip: 'View and manage user accounts, permissions, and access levels',
    stats: {
      total: userStats.total
    },
    height: 'md:row-span-2',
    onClick: () => handleToolClick('users', () => setActiveView('users'))
  }, {
    id: 'checklist',
    title: 'PSSR Configuration',
    description: 'Manage checklists, categories, topics, and PSSR settings',
    icon: ClipboardList,
    gradient: 'from-emerald-500 to-emerald-600',
    tooltip: 'Configure PSSR checklists, categories, topics, and translation settings',
    stats: {},
    height: 'md:row-span-3',
    onClick: () => handleToolClick('checklist', () => setActiveView('checklist'))
  }, {
    id: 'projects',
    title: t.manageProject,
    description: t.manageProjectDesc,
    icon: FolderOpen,
    gradient: 'from-orange-500 to-orange-600',
    tooltip: 'Manage projects, milestones, team members, and documents',
    stats: {
      total: 12
    },
    height: 'md:row-span-2',
    onClick: () => handleToolClick('projects', () => setActiveView('projects'))
  }];

  // Filter admin tools based on search query
  const filteredAdminTools = useMemo(() => {
    if (!searchQuery.trim()) return adminTools;
    
    const query = searchQuery.toLowerCase().trim();
    return adminTools.filter(tool => 
      tool.title.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.tooltip.toLowerCase().includes(query)
    );
  }, [searchQuery, userStats.total, t]);

  // Get recent tools data
  const recentToolsData = useMemo(() => {
    return recentTools
      .map(id => adminTools.find(tool => tool.id === id))
      .filter(Boolean);
  }, [recentTools, userStats.total, t]);

  // Handle conditional views AFTER all hooks
  if (activeView === 'users') {
    return <EnhancedUserManagement onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} translations={t} />;
  }
  if (activeView === 'checklist') {
    return <ManageChecklistPage onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} translations={t} />;
  }
  if (activeView === 'projects') {
    return <ProjectManagementPage onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} translations={t} />;
  }
  return <div className="min-h-screen bg-background">
      <AdminHeader selectedLanguage={selectedLanguage} onLanguageChange={setSelectedLanguage} translations={t} />

      {/* Subtle Divider */}
      <div className="border-t border-border/50" />

      <div className="container pt-8 pb-8 max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-10">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={onBack} className="cursor-pointer flex items-center gap-1.5">
                <Home className="h-4 w-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t.administration}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-2xl font-medium text-foreground/80 mb-2">
            {t.administration}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t.adminToolsSubtitle}
          </p>
        </div>

        {/* Search Bar - Elevated Design */}
        <div className="mb-12">
          <div className="relative max-w-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg blur-xl" />
            <div className="relative bg-background border-2 border-border/50 rounded-lg shadow-sm hover:border-primary/30 transition-colors">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search admin tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-14 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-muted"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-3 ml-1">
              Found {filteredAdminTools.length} {filteredAdminTools.length === 1 ? 'result' : 'results'}
            </p>
          )}
        </div>

        {/* Recently Accessed Tools */}
        {recentToolsData.length > 0 && !searchQuery && (
          <div className="mb-16">
            <h2 className="text-sm font-medium text-foreground/70 mb-5 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recently Accessed
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {recentToolsData.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Card
                    key={tool.id}
                    className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border bg-card/50 backdrop-blur"
                    onClick={tool.onClick}
                  >
                    <CardHeader className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {tool.title}
                          </CardTitle>
                          {tool.stats.total !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {tool.stats.total} total
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Masonry Cards Grid */}
        <TooltipProvider>
          {filteredAdminTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-rows-[auto] gap-8 md:auto-rows-[minmax(120px,auto)]">
              {filteredAdminTools.map((tool, index) => {
              const IconComponent = tool.icon;
              return (
                <Card 
                  key={tool.id}
                  className={`group relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden animate-fade-in ${tool.height}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={tool.onClick}
                >
                  {/* Gradient Background Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  
                  <CardHeader className="relative space-y-6 p-8">
                    {/* Icon Section */}
                    <div className="flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg cursor-help`}>
                            <IconComponent className="h-8 w-8 text-white" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>{tool.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    
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
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search terms
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </div>
          )}
        </TooltipProvider>
      </div>
    </div>;
};
export default AdminToolsPage;