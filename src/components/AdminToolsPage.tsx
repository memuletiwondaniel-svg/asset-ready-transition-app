import React, { useState, useEffect, useMemo } from 'react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, FolderOpen, Settings, ArrowLeft, ClipboardList, CheckCircle, Home, Search, X, Star, Activity, Sliders } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import EnhancedUserManagement from "@/components/user-management/EnhancedUserManagement";
import ManageChecklistPage from "./ManageChecklistPage";
import ProjectManagementPage from "./project/ProjectManagementPage";
import PSSRSettingsManagement from "./PSSRSettingsManagement";
import AdminHeader from "./admin/AdminHeader";
import AdminActivityLog from "./AdminActivityLog";
import { supabase } from '@/integrations/supabase/client';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { OrshSidebar } from './OrshSidebar';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from './admin/ThemeToggle';
import LanguageSelector from './admin/LanguageSelector';
import UserProfileDropdown from './admin/UserProfileDropdown';
import { NotificationCenter } from './NotificationCenter';
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

  // Fetch current user profile
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    position: string;
    avatar_url: string;
  } | null>(null);
  useEffect(() => {
    const fetchUserProfile = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data: profile
        } = await supabase.from('profiles').select('full_name, position, avatar_url').eq('user_id', user.id).single();
        if (profile) {
          setUserProfile(profile);
        }
      }
    };
    fetchUserProfile();
  }, []);
  const handleSidebarNavigate = (section: string) => {
    // Map sidebar sections to internal views or routes
    switch (section) {
      case 'admin-tools':
        setActiveView('dashboard');
        break;
      case 'user-management':
      case 'users':
        setActiveView('users');
        break;
      case 'projects':
        setActiveView('projects');
        break;
      case 'safe-startup':
        navigate('/safe-startup');
        break;
      default:
        navigate(`/${section}`);
    }
  };
  const [activeView, setActiveView] = useState<'dashboard' | 'users' | 'checklist' | 'projects' | 'pssr-settings' | 'activity-log'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteTools, setFavoriteTools] = useState<string[]>([]);
  const [userStatsAnimating, setUserStatsAnimating] = useState(false);
  const [projectStatsAnimating, setProjectStatsAnimating] = useState(false);
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
        const newStats = {
          total: users?.length || 0,
          pending: users?.filter(u => u.status === 'pending_approval').length || 0,
          active: users?.filter(u => u.status === 'active').length || 0,
          inactive: users?.filter(u => u.status === 'inactive').length || 0
        };

        // Trigger animation if stats changed
        if (userStats.total !== 0 && newStats.total !== userStats.total) {
          setUserStatsAnimating(true);
          setTimeout(() => setUserStatsAnimating(false), 1000);
        }
        setUserStats(newStats);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };
    fetchUserStats();

    // Set up real-time subscription for user changes
    const userChannel = supabase.channel('user-stats-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'profiles'
    }, () => {
      // Refetch stats when any change occurs
      fetchUserStats();
    }).subscribe();
    return () => {
      supabase.removeChannel(userChannel);
    };
  }, [userStats.total]);

  // Fetch project statistics with real-time updates
  useEffect(() => {
    const fetchProjectStats = async () => {
      try {
        const {
          data: projects,
          error
        } = await supabase.from('projects').select('id', {
          count: 'exact'
        }).eq('is_active', true);
        if (error) {
          console.error('Error fetching project stats:', error);
          return;
        }
        const newTotal = projects?.length || 0;

        // Trigger animation if stats changed
        if (projectStats.total !== 0 && newTotal !== projectStats.total) {
          setProjectStatsAnimating(true);
          setTimeout(() => setProjectStatsAnimating(false), 1000);
        }
        setProjectStats({
          total: newTotal
        });
      } catch (error) {
        console.error('Error fetching project stats:', error);
      }
    };
    fetchProjectStats();

    // Set up real-time subscription for project changes
    const projectChannel = supabase.channel('project-stats-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'projects'
    }, () => {
      // Refetch stats when any change occurs
      fetchProjectStats();
    }).subscribe();
    return () => {
      supabase.removeChannel(projectChannel);
    };
  }, [projectStats.total]);

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
    tooltip: 'View and manage user accounts, permissions, and access levels',
    stats: {
      total: userStats.total,
      label: 'users',
      isAnimating: userStatsAnimating
    },
    height: 'md:row-span-2',
    onClick: () => setActiveView('users')
  }, {
    id: 'pssr-settings',
    title: 'PSSR Configuration',
    description: 'Manage PSSR reasons, tie-in scopes, and MOC options',
    icon: Settings,
    gradient: 'from-emerald-500 to-emerald-600',
    tooltip: 'Configure PSSR reasons, tie-in scopes, and Management of Change settings',
    stats: {},
    height: 'md:row-span-2',
    onClick: () => setActiveView('pssr-settings')
  }, {
    id: 'checklist',
    title: 'Checklist Management',
    description: 'Manage checklists, categories, topics, and translations',
    icon: ClipboardList,
    gradient: 'from-purple-500 to-purple-600',
    tooltip: 'Configure checklists, categories, topics, and translation settings',
    stats: {},
    height: 'md:row-span-2',
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
      label: 'projects',
      isAnimating: projectStatsAnimating
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
      case 'checklist':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: () => setActiveView('dashboard')
        });
        crumbs.push({
          label: 'Checklist Management',
          icon: ClipboardList,
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
      case 'projects':
        crumbs.push({
          label: 'Admin Tools',
          icon: Sliders,
          onClick: () => setActiveView('dashboard')
        });
        crumbs.push({
          label: 'Project Management',
          icon: FolderOpen,
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
  if (activeView === 'checklist') {
    return <div className="h-screen flex w-full overflow-hidden animate-fade-in">
        <OrshSidebar userName="Daniel" userTitle="ORA Engr." language="en" currentPage="admin-tools" onNavigate={handleSidebarNavigate} />
        <div className="flex-1 overflow-y-auto">
          <ManageChecklistPage onBack={() => setActiveView('dashboard')} selectedLanguage={language} translations={t} />
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
  if (activeView === 'projects') {
    return <div className="h-screen flex w-full overflow-hidden animate-fade-in">
      <OrshSidebar userName={userProfile?.full_name || 'User'} userTitle={userProfile?.position || 'Team Member'} userAvatar={userProfile?.avatar_url || ''} language={language} onLanguageChange={setLanguage} currentPage="admin-tools" onNavigate={handleSidebarNavigate} />
        <div className="flex-1 overflow-y-auto">
          <ProjectManagementPage onBack={() => setActiveView('dashboard')} selectedLanguage={language} translations={t} />
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
                <Input type="text" placeholder="Search admin tools..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-10 h-10 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />
                {searchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>}
              </div>
            </div>
          </div>
          
          {searchQuery && <p className="text-sm text-muted-foreground mb-6">
              Found {filteredAdminTools.length} {filteredAdminTools.length === 1 ? 'result' : 'results'}
            </p>}

          {/* Favorites Section */}
        <TooltipProvider>
          {favoriteToolsList.length > 0 && <div className="mb-12">
              <h2 className="text-sm font-medium text-foreground/70 mb-5 flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                Favorite Tools
              </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteToolsList.map((tool, index) => {
                  const IconComponent = tool.icon;
                  const isFavorite = favoriteTools.includes(tool.id);
                  return <Card key={tool.id} className="group relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 border-yellow-500/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden animate-fade-in" style={{
                    animationDelay: `${index * 100}ms`
                  }} onClick={tool.onClick}>
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
                              <span className={`text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent transition-all duration-300 ${tool.stats.isAnimating ? 'animate-[pulse_0.5s_ease-in-out] scale-110' : ''}`}>
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
                All Tools
              </h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nonFavoriteToolsList.map((tool, index) => {
                  const IconComponent = tool.icon;
                  const isFavorite = favoriteTools.includes(tool.id);
                  return <Card key={tool.id} className="group relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden animate-fade-in" style={{
                    animationDelay: `${index * 100}ms`
                  }} onClick={tool.onClick}>
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
                              <span className={`text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent transition-all duration-300 ${tool.stats.isAnimating ? 'animate-[pulse_0.5s_ease-in-out] scale-110' : ''}`}>
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
                    
                    {/* Hover Indicator */}
                    <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2">
                      <span>Manage</span>
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
            <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search terms
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
            </div>}
        </TooltipProvider>
        </div>
      </div>
    </div>
    </div>;
};
const AdminToolsPage: React.FC<AdminToolsPageProps> = props => {
  return <LanguageProvider>
      <AdminToolsPageContent {...props} />
    </LanguageProvider>;
};
export default AdminToolsPage;