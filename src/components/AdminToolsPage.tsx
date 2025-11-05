import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, FolderOpen, Settings, ArrowLeft, ClipboardList, CheckCircle, Home, Search, X, Star, Activity } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import EnhancedUserManagement from "@/components/user-management/EnhancedUserManagement";
import ManageChecklistPage from "./ManageChecklistPage";
import ProjectManagementPage from "./project/ProjectManagementPage";
import PSSRSettingsManagement from "./PSSRSettingsManagement";
import AdminHeader from "./admin/AdminHeader";
import AdminActivityLog from "./AdminActivityLog";
import { supabase } from '@/integrations/supabase/client';
import { getCurrentTranslations } from '@/utils/translations';
interface AdminToolsPageProps {
  onBack: () => void;
}
const AdminToolsPage: React.FC<AdminToolsPageProps> = ({
  onBack
}) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'checklist' | 'projects' | 'pssr-settings' | 'activity-log'>('dashboard');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteTools, setFavoriteTools] = useState<string[]>([]);
  const [userStats, setUserStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    inactive: 0
  });
  const [projectStats, setProjectStats] = useState({
    total: 0
  });

  // Fetch user statistics with real-time updates
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

    // Set up real-time subscription for user changes
    const userChannel = supabase
      .channel('user-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Refetch stats when any change occurs
          fetchUserStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, []);

  // Fetch project statistics with real-time updates
  useEffect(() => {
    const fetchProjectStats = async () => {
      try {
        const {
          data: projects,
          error
        } = await supabase.from('projects').select('id', { count: 'exact' }).eq('is_active', true);
        if (error) {
          console.error('Error fetching project stats:', error);
          return;
        }
        setProjectStats({
          total: projects?.length || 0
        });
      } catch (error) {
        console.error('Error fetching project stats:', error);
      }
    };
    
    fetchProjectStats();

    // Set up real-time subscription for project changes
    const projectChannel = supabase
      .channel('project-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          // Refetch stats when any change occurs
          fetchProjectStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectChannel);
    };
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('orsh-favorite-admin-tools');
    if (stored) {
      try {
        setFavoriteTools(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing favorite tools:', e);
      }
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setFavoriteTools(prev => {
      const updated = prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId];
      localStorage.setItem('orsh-favorite-admin-tools', JSON.stringify(updated));
      return updated;
    });
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
      total: userStats.total,
      label: 'users'
    },
    height: 'md:row-span-2',
    onClick: () => setActiveView('users')
  }, {
    id: 'checklist',
    title: 'PSSR Configuration',
    description: 'Manage checklists, categories, topics, and PSSR settings',
    icon: ClipboardList,
    gradient: 'from-emerald-500 to-emerald-600',
    tooltip: 'Configure PSSR checklists, categories, topics, and translation settings',
    stats: {},
    height: 'md:row-span-3',
    onClick: () => setActiveView('checklist')
  }, {
    id: 'projects',
    title: t.manageProject,
    description: t.manageProjectDesc,
    icon: FolderOpen,
    gradient: 'from-orange-500 to-orange-600',
    tooltip: 'Manage projects, milestones, team members, and documents',
    stats: {
      total: projectStats.total,
      label: 'projects'
    },
    height: 'md:row-span-2',
    onClick: () => setActiveView('projects')
  }, {
    id: 'activity-log',
    title: 'Activity Log',
    description: 'Monitor and audit all administrative actions across the platform',
    icon: Activity,
    gradient: 'from-cyan-500 to-cyan-600',
    tooltip: 'View detailed audit logs of all administrative activities and user actions',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('activity-log')
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
  }, [searchQuery, userStats.total, projectStats.total, t]);

  // Get favorite and non-favorite tools
  const favoriteToolsList = useMemo(() => {
    return filteredAdminTools.filter(tool => favoriteTools.includes(tool.id));
  }, [filteredAdminTools, favoriteTools]);

  const nonFavoriteToolsList = useMemo(() => {
    return filteredAdminTools.filter(tool => !favoriteTools.includes(tool.id));
  }, [filteredAdminTools, favoriteTools]);

  // Handle conditional views AFTER all hooks
  if (activeView === 'users') {
    return (
      <div className="animate-fade-in">
        <EnhancedUserManagement onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} translations={t} />
      </div>
    );
  }
  if (activeView === 'checklist') {
    return (
      <div className="animate-fade-in">
        <ManageChecklistPage onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} translations={t} />
      </div>
    );
  }
  if (activeView === 'projects') {
    return (
      <div className="animate-fade-in">
        <ProjectManagementPage onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} translations={t} />
      </div>
    );
  }
  if (activeView === 'activity-log') {
    return (
      <div className="animate-fade-in">
        <AdminActivityLog onBack={() => setActiveView('dashboard')} selectedLanguage={selectedLanguage} />
      </div>
    );
  }
  return <div className="min-h-screen bg-background animate-fade-in">
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

        {/* Favorites Section */}
        <TooltipProvider>
          {favoriteToolsList.length > 0 && (
            <div className="mb-12">
              <h2 className="text-sm font-medium text-foreground/70 mb-5 flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                Favorite Tools
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-rows-[auto] gap-8 md:auto-rows-[minmax(120px,auto)]">
                {favoriteToolsList.map((tool, index) => {
                  const IconComponent = tool.icon;
                  const isFavorite = favoriteTools.includes(tool.id);
                  return (
                    <Card 
                      key={tool.id}
                      className={`group relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 border-yellow-500/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden animate-fade-in ${tool.height}`}
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={tool.onClick}
                    >
                      {/* Gradient Background Effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      
                      {/* Favorite Star Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 h-8 w-8 z-10 hover:bg-background/80"
                        onClick={(e) => toggleFavorite(tool.id, e)}
                      >
                        <Star className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
                      </Button>
                      
                    <CardHeader className="relative space-y-6 p-8 pr-14">
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
                            {tool.stats.label || 'Total'}
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
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Tools Section */}
        {nonFavoriteToolsList.length > 0 && (
          <>
            {favoriteToolsList.length > 0 && (
              <h2 className="text-sm font-medium text-foreground/70 mb-5">
                All Tools
              </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-rows-[auto] gap-8 md:auto-rows-[minmax(120px,auto)]">
              {nonFavoriteToolsList.map((tool, index) => {
                const IconComponent = tool.icon;
                const isFavorite = favoriteTools.includes(tool.id);
                return (
                  <Card 
                    key={tool.id}
                    className={`group relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden animate-fade-in ${tool.height}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={tool.onClick}
                  >
                    {/* Gradient Background Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    {/* Favorite Star Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 h-8 w-8 z-10 hover:bg-background/80"
                      onClick={(e) => toggleFavorite(tool.id, e)}
                    >
                      <Star className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
                    </Button>
                    
                    <CardHeader className="relative space-y-6 p-8 pr-14">
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
                            {tool.stats.label || 'Total'}
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
          </>
        )}

        {/* No Results */}
        {filteredAdminTools.length === 0 && (
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