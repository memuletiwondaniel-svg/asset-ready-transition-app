import React, { useState, useEffect, useMemo } from 'react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, FolderOpen, Settings, ArrowLeft, ClipboardList, CheckCircle, Home, Search, X, Star, Activity, Sliders, Building2, LayoutTemplate, FileCheck2 } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import EnhancedUserManagement from "@/components/user-management/EnhancedUserManagement";
import PSSRSettingsManagement from "./PSSRSettingsManagement";
import { ORAConfigurationManagement } from "./ora/ORAConfigurationManagement";
import { ManageHandover } from "./handover/ManageHandover";
import AdminHeader from "./admin/AdminHeader";
import AdminActivityLog from "./AdminActivityLog";
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { OrshSidebar } from './OrshSidebar';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from './admin/ThemeToggle';
import LanguageSelector from './admin/LanguageSelector';
import UserProfileDropdown from './admin/UserProfileDropdown';
import { NotificationCenter } from './NotificationCenter';
import { createSidebarNavigator } from '@/utils/sidebarNavigation';

interface AdminToolsPageProps {
  onBack: () => void;
}
const AdminToolsPageContent: React.FC<AdminToolsPageProps> = ({
  onBack
}) => {
  const {
    language,
    setLanguage,
    translations: t
  } = useLanguage();
  const {
    buildBreadcrumbsFromPath
  } = useBreadcrumb();
  const breadcrumbs = buildBreadcrumbsFromPath();
  const navigate = useNavigate();

  // State management - consolidated for cleaner code
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'pssr-settings' | 'activity-log' | 'ora-configuration' | 'handover-management'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteTools, setFavoriteTools] = useState<string[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    position: string;
    avatar_url: string;
  } | null>(null);
  const [userStats, setUserStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    inactive: 0
  });
  const [projectStats, setProjectStats] = useState({
    total: 0
  });

  const handleSidebarNavigate = createSidebarNavigator(navigate, {
    'admin-tools': () => setActiveView('dashboard'),
    'user-management': () => setActiveView('users'),
    'users': () => setActiveView('users'),
  });

  // Fetch all initial data in parallel
  useEffect(() => {
    const fetchAllInitialData = async () => {
      try {
        const [authResult, usersResult, projectsResult] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('profiles').select('status, account_status'),
          supabase.from('projects').select('id', { count: 'exact' }).eq('is_active', true)
        ]);

        // Set user profile
        if (authResult.data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, position, avatar_url')
            .eq('user_id', authResult.data.user.id)
            .single();
          if (profile) setUserProfile(profile);
        }

        // Set user stats
        const users = usersResult.data;
        setUserStats({
          total: users?.length || 0,
          pending: users?.filter(u => u.status === 'pending_approval').length || 0,
          active: users?.filter(u => u.status === 'active').length || 0,
          inactive: users?.filter(u => u.status === 'inactive').length || 0
        });

        // Set project stats
        setProjectStats({ total: projectsResult.data?.length || 0 });
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchAllInitialData();
  }, []);

  // Real-time subscription for user changes
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const { data: users, error } = await supabase.from('profiles').select('status, account_status');
        if (error) {
          console.error('Error fetching user stats:', error);
          return;
        }
        setUserStats({
          total: users?.length || 0,
          pending: users?.filter(u => u.status === 'pending_approval').length || 0,
          active: users?.filter(u => u.status === 'active').length || 0,
          inactive: users?.filter(u => u.status === 'inactive').length || 0
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };

    // Set up real-time subscription for user changes
    const userChannel = supabase.channel('user-stats-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'profiles'
    }, () => {
      fetchUserStats();
    }).subscribe();
    
    return () => {
      supabase.removeChannel(userChannel);
    };
  }, []);

  // Real-time subscription for project changes
  useEffect(() => {
    const fetchProjectStats = async () => {
      try {
        const { data: projects, error } = await supabase.from('projects').select('id', { count: 'exact' }).eq('is_active', true);
        if (error) {
          console.error('Error fetching project stats:', error);
          return;
        }
        setProjectStats({ total: projects?.length || 0 });
      } catch (error) {
        console.error('Error fetching project stats:', error);
      }
    };

    // Set up real-time subscription for project changes
    const projectChannel = supabase.channel('project-stats-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'projects'
    }, () => {
      fetchProjectStats();
    }).subscribe();
    
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
      const updated = prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId];
      localStorage.setItem('orsh-favorite-admin-tools', JSON.stringify(updated));
      return updated;
    });
  };
  const adminTools = [{
    id: 'users',
    title: t.manageUser,
    description: t.manageUserDesc,
    icon: Users,
    gradient: 'from-blue-500 to-blue-600',
    tooltip: t.manageUserDesc,
    stats: {
      total: userStats.total,
      label: t.users
    },
    height: 'md:row-span-2',
    onClick: () => setActiveView('users')
  }, {
    id: 'projects',
    title: t.manageProjects,
    description: t.manageProjectsDesc,
    icon: Building2,
    gradient: 'from-purple-500 to-purple-600',
    tooltip: t.manageProjectsDesc,
    stats: {
      total: projectStats.total,
      label: t.projects
    },
    height: 'md:row-span-2',
    onClick: () => navigate('/project-management')
  }, {
    id: 'pssr-settings',
    title: t.pssrConfiguration,
    description: t.pssrConfigDesc,
    icon: Settings,
    gradient: 'from-emerald-500 to-emerald-600',
    tooltip: t.pssrConfigDesc,
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('pssr-settings')
  }, {
    id: 'activity-log',
    title: t.activityLogTitle,
    description: t.activityLogDesc,
    icon: Activity,
    gradient: 'from-cyan-500 to-cyan-600',
    tooltip: t.activityLogDesc,
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('activity-log')
  }, {
    id: 'ora-configuration',
    title: t.oraPlans || 'ORA Plans',
    description: t.manageORAPlansDesc,
    icon: LayoutTemplate,
    gradient: 'from-amber-500 to-amber-600',
    tooltip: t.manageORAPlansDesc,
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('ora-configuration')
  }, {
    id: 'handover-management',
    title: t.p2aHandover || 'P2A Handover',
    description: t.p2aHandoverDesc || 'Configure PAC, FAC, SoF certificates and OWL tracking',
    icon: FileCheck2,
    gradient: 'from-teal-500 to-teal-600',
    tooltip: t.manageHandoverDesc || 'Configure PAC, FAC, SoF certificates and OWL tracking',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('handover-management')
  }];

  // Filter admin tools based on search query
  const filteredAdminTools = useMemo(() => {
    if (!searchQuery.trim()) return adminTools;
    const query = searchQuery.toLowerCase().trim();
    return adminTools.filter(tool => tool.title.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query) || tool.tooltip.toLowerCase().includes(query));
  }, [searchQuery, userStats.total, projectStats.total, t]);

  // Get favorite and non-favorite tools
  const favoriteToolsList = useMemo(() => {
    return filteredAdminTools.filter(tool => favoriteTools.includes(tool.id));
  }, [filteredAdminTools, favoriteTools]);
  const nonFavoriteToolsList = useMemo(() => {
    return filteredAdminTools.filter(tool => !favoriteTools.includes(tool.id));
  }, [filteredAdminTools, favoriteTools]);

  // Generate breadcrumbs based on current view
  const getBreadcrumbs = () => {
    const crumbs = [{
      label: 'Home',
      icon: Home,
      onClick: onBack
    }];
    switch (activeView) {
      case 'dashboard':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: undefined
        });
        break;
      case 'users':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: () => setActiveView('dashboard')
        });
        crumbs.push({
          label: 'User Management',
          icon: Users,
          onClick: undefined
        });
        break;
      case 'pssr-settings':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: () => setActiveView('dashboard')
        });
        crumbs.push({
          label: 'PSSR Configuration',
          icon: Settings,
          onClick: undefined
        });
        break;
      case 'activity-log':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: () => setActiveView('dashboard')
        });
        crumbs.push({
          label: 'Activity Log',
          icon: Activity,
          onClick: undefined
        });
        break;
      case 'handover-management':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: () => setActiveView('dashboard')
        });
        crumbs.push({
          label: 'P2A Handover',
          icon: FileCheck2,
          onClick: undefined
        });
        break;
    }
    return crumbs;
  };

  // Handle conditional views AFTER all hooks
  if (activeView === 'users') {
    return <div className="h-screen flex w-full overflow-hidden animate-fade-in">
        <OrshSidebar userName="Daniel" userTitle="ORA Engr." language="en" currentPage="admin-tools" onNavigate={handleSidebarNavigate} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <EnhancedUserManagement onBack={() => setActiveView('dashboard')} selectedLanguage={language} translations={t} />
        </div>
      </div>;
  }
  if (activeView === 'pssr-settings') {
    return <div className="h-screen flex w-full overflow-hidden animate-fade-in">
        <OrshSidebar userName="Daniel" userTitle="ORA Engr." language="en" currentPage="admin-tools" onNavigate={handleSidebarNavigate} />
        <div className="flex-1 overflow-y-auto">
          <PSSRSettingsManagement onBack={() => setActiveView('dashboard')} selectedLanguage={language} translations={t} />
        </div>
      </div>;
  }
  if (activeView === 'activity-log') {
    return <div className="h-screen flex w-full overflow-hidden animate-fade-in">
        <OrshSidebar userName="Daniel" userTitle="ORA Engr." language="en" currentPage="admin-tools" onNavigate={handleSidebarNavigate} />
        <div className="flex-1 overflow-y-auto">
          <AdminActivityLog onBack={() => setActiveView('dashboard')} selectedLanguage={language} />
        </div>
      </div>;
  }
  if (activeView === 'ora-configuration') {
    return <div className="h-screen flex w-full overflow-hidden animate-fade-in">
        <OrshSidebar userName="Daniel" userTitle="ORA Engr." language="en" currentPage="admin-tools" onNavigate={handleSidebarNavigate} />
        <ORAConfigurationManagement onBack={() => setActiveView('dashboard')} />
      </div>;
  }
  if (activeView === 'handover-management') {
    return <div className="h-screen flex w-full overflow-hidden animate-fade-in">
        <OrshSidebar userName="Daniel" userTitle="ORA Engr." language="en" currentPage="admin-tools" onNavigate={handleSidebarNavigate} />
        <ManageHandover onBack={() => setActiveView('dashboard')} />
      </div>;
  }
  
  // Show skeleton while initial data is loading
  if (isInitialLoading) {
    return <div className="h-screen flex w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <OrshSidebar userName="Daniel" userTitle="ORA Engr." language="en" currentPage="admin-tools" onNavigate={handleSidebarNavigate} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header Skeleton */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
          <div className="h-4 w-48 bg-muted animate-pulse rounded mb-3" />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-40 bg-muted animate-pulse rounded" />
                <div className="h-4 w-56 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 overflow-auto">
          <div className="container pt-8 pb-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-end mb-10">
              <div className="w-96 h-10 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader className="relative space-y-4 p-6">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                      <div className="flex flex-col items-end space-y-1">
                        <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>;
  }
  
  return <div className="h-screen flex w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <OrshSidebar userName="Daniel" userTitle="ORA Engr." language="en" currentPage="admin-tools" onNavigate={handleSidebarNavigate} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
          <BreadcrumbNavigation currentPageLabel="Administration" />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-gray-700 flex items-center justify-center shadow-lg">
                <Sliders className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {t.administration}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t.adminToolsSubtitle}
                </p>
              </div>
            </div>
            
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container pt-8 pb-8 max-w-7xl mx-auto">
            {/* Search Bar Section */}
            <div className="flex items-center justify-end mb-10">
            {/* Search Bar - Compact Design */}
            <div className="relative w-96">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg blur-xl" />
              <div className="relative bg-background border-2 border-border/50 rounded-lg shadow-sm hover:border-primary/30 transition-colors">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="text" placeholder={t.searchAdminTools} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-10 h-10 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />
                {searchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>}
              </div>
            </div>
          </div>
          
          {searchQuery && <p className="text-sm text-muted-foreground mb-6">
              {t.foundResults} {filteredAdminTools.length} {filteredAdminTools.length === 1 ? t.result : t.results}
            </p>}

          {/* Favorites Section */}
        <TooltipProvider>
          {favoriteToolsList.length > 0 && <div className="mb-12">
              <h2 className="text-sm font-medium text-foreground/70 mb-5 flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                {t.favoriteTools}
              </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteToolsList.map((tool) => {
                  const IconComponent = tool.icon;
                  const isFavorite = favoriteTools.includes(tool.id);
                  return <Card key={tool.id} className="group relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 border-yellow-500/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden" onClick={tool.onClick}>
                      {/* Gradient Background Effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      
                    <CardHeader className="relative space-y-4 p-6">
                      {/* Icon and Stats Row */}
                      <div className="flex items-start justify-between">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg cursor-help`}>
                              <IconComponent className="h-6 w-6 text-white" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>{tool.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      
                        <div className="flex items-center gap-2">
                          {/* Stats Badge */}
                          {tool.stats.total !== undefined && <div className="flex flex-col items-end">
                              <span className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent transition-all duration-300">
                                {tool.stats.total}
                              </span>
                              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                {tool.stats.label || 'Total'}
                              </span>
                            </div>}
                          
                          {/* Favorite Star Button */}
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80" onClick={e => toggleFavorite(tool.id, e)}>
                            <Star className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Title & Description */}
                      <div className="space-y-1.5">
                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                          {tool.title}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {tool.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>;
                })}
            </div>
          </div>}

        {/* All Tools Section */}
        {nonFavoriteToolsList.length > 0 && <>
            {favoriteToolsList.length > 0 && <h2 className="text-sm font-medium text-foreground/70 mb-5">
                {t.allTools}
              </h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nonFavoriteToolsList.map((tool) => {
                  const IconComponent = tool.icon;
                  const isFavorite = favoriteTools.includes(tool.id);
                  return <Card key={tool.id} className="group relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden" onClick={tool.onClick}>
                    {/* Gradient Background Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <CardHeader className="relative space-y-4 p-6">
                      {/* Icon and Stats Row */}
                      <div className="flex items-start justify-between">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg cursor-help`}>
                              <IconComponent className="h-6 w-6 text-white" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>{tool.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      
                        <div className="flex items-center gap-2">
                          {/* Stats Badge */}
                          {tool.stats.total !== undefined && <div className="flex flex-col items-end">
                              <span className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent transition-all duration-300">
                                {tool.stats.total}
                              </span>
                              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                {tool.stats.label || t.total}
                              </span>
                            </div>}
                          
                          {/* Favorite Star Button */}
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80" onClick={e => toggleFavorite(tool.id, e)}>
                            <Star className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
                          </Button>
                        </div>
                      </div>
                    
                    {/* Title & Description */}
                    <div className="space-y-1.5">
                      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                        {tool.title}
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {tool.description}
                      </CardDescription>
                    </div>
                    
                    {/* Hover Indicator */}
                    <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2">
                      <span>{t.manage}</span>
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </div>
                  </CardHeader>
                </Card>;
                })}
            </div>
          </>}

        {/* No Results */}
        {filteredAdminTools.length === 0 && <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t.noResultsFound}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t.tryAdjustingSearch}
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              {t.clearSearch}
            </Button>
            </div>}
        </TooltipProvider>
        </div>
      </div>
    </div>
    </div>;
};
const AdminToolsPage: React.FC<AdminToolsPageProps> = props => {
  return <AdminToolsPageContent {...props} />;
};
export default AdminToolsPage;