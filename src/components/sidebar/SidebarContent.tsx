import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import OrshLogo from '@/components/ui/OrshLogo';
import { Home, Settings, ChevronDown, ChevronLeft, ChevronRight, Languages, Check, Bell, LogOut, Clock, History, LayoutGrid, Moon, Sun, AlertTriangle, FolderKanban, MessageSquare, CalendarCheck, Key, Wrench, ListChecks, Gauge, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileCompletionIndicator } from '@/components/sidebar/ProfileCompletionIndicator';
import { OnlineUsersIndicator } from '@/components/sidebar/OnlineUsersIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useNewTaskCount } from '@/hooks/useNewTaskCount';
import { GlossaryTerm } from '@/components/ui/GlossaryTerm';

interface NavigationItem {
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  section?: string;
}

interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  online_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  position: string | null;
  email: string | null;
  company: string | null;
  phone_number: string | null;
}

interface SidebarContentProps {
  isMobile?: boolean;
  isCollapsed: boolean;
  isProfileLoading?: boolean;
  currentUserId?: string;
  displayName: string;
  displayTitle: string;
  displayAvatar: string;
  currentPage: string;
  theme: string | undefined;
  language: string;
  unreadChatCount: number;
  searchHistory: string[];
  showSearchHistory: boolean;
  onlineUsers: PresenceUser[];
  realtimeProfile: UserProfile | null;
  onProfileClick: () => void;
  onNavigate: (section: string, closeMobile: boolean) => void;
  onThemeToggle: () => void;
  onLanguageChange?: (language: string) => void;
  onShowWidgets?: () => void;
  onShowOnboarding?: () => void;
  onToggleSearchHistory?: () => void;
  onSearchHistoryClick?: (item: string) => void;
  onLogout: () => void;
  onToggleCollapse?: () => void;
}

// Map sidebar sections to glossary terms for tooltip definitions
const sectionGlossaryTerm: Record<string, string> = {
  'projects': 'Projects',
  'pssr': 'PSSR',
  'my-tasks': 'My Tasks',
  'executive-dashboard': 'Executive Dashboard',
  'or-maintenance': 'OR Maintenance',
  'ask-orsh': 'Ask Bob',
};

const navigationItems: (NavigationItem & { requiresLeadership?: boolean })[] = [
  { labelKey: 'navHome', icon: Home, path: '/', section: 'home' },
  { labelKey: 'navProjects', icon: Key, path: '/vcrs', section: 'projects' },
  { labelKey: 'navPSSR', icon: AlertTriangle, path: '/pssr', section: 'pssr' },
  { labelKey: 'navMyTasks', icon: CalendarCheck, path: '/my-tasks', section: 'my-tasks' },
  { labelKey: 'navMyBacklog', icon: ClipboardList, path: '/my-backlog', section: 'my-backlog' },
  { labelKey: 'navExecutiveDashboard', icon: Gauge, path: '/executive-dashboard', section: 'executive-dashboard', requiresLeadership: true },
  { labelKey: 'navORMaintenance', icon: Wrench, path: '/or-maintenance', section: 'or-maintenance', requiresLeadership: true },
  
];

export const SidebarContent = memo<SidebarContentProps>(({
  isMobile = false,
  isCollapsed,
  isProfileLoading = false,
  displayName,
  displayTitle,
  displayAvatar,
  currentPage,
  theme,
  language,
  unreadChatCount,
  searchHistory,
  showSearchHistory,
  onlineUsers,
  realtimeProfile,
  onProfileClick,
  onNavigate,
  onThemeToggle,
  onLanguageChange,
  onShowWidgets,
  onShowOnboarding,
  onToggleSearchHistory,
  onSearchHistoryClick,
  currentUserId,
  onLogout,
  onToggleCollapse,
}) => {
  const { translations: t } = useLanguage();
  const { hasPermission } = usePermissions();
  const newTaskCount = useNewTaskCount();
  
  const DANIEL_USER_ID = '05b44255-4358-450c-8aa4-0558b31df70b';
  const isLeadership = hasPermission('view_reports') || hasPermission('create_ora_plan');
  const visibleNavItems = navigationItems.filter(item => {
    if (item.section === 'my-backlog' && currentUserId !== DANIEL_USER_ID) return false;
    if (item.requiresLeadership && !isLeadership) return false;
    return true;
  });
  
  // Helper function to get translated label
  const getLabel = (labelKey: string): string => {
    return (t as any)[labelKey] || labelKey;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-center mb-4">
          {!isCollapsed ? <OrshLogo size="medium" /> : <OrshLogo size="small" />}
        </div>
        
        {isCollapsed ? (
          <div 
            role="button" 
            tabIndex={0} 
            onClick={onProfileClick}
            onKeyDown={(e) => e.key === 'Enter' && onProfileClick()}
            className="w-full p-3 h-auto flex items-center justify-center hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
          >
            {isProfileLoading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback delayMs={600} className="bg-gradient-to-br from-primary to-accent text-white">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ) : (
          <>
            <Button 
              variant="ghost" 
              onClick={onProfileClick}
              className="w-full p-3 h-auto hover:bg-muted/50 justify-start transition-colors"
            >
              {isProfileLoading ? (
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0 mr-3" />
              ) : (
                <Avatar className="h-10 w-10 flex-shrink-0 mr-3">
                  <AvatarImage src={displayAvatar} alt={displayName} />
                  <AvatarFallback delayMs={600} className="bg-gradient-to-br from-primary to-accent text-white">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 text-left min-w-0">
                {isProfileLoading ? (
                  <>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium truncate">{displayName.split(' ')[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">{displayTitle}</p>
                  </>
                )}
              </div>
            </Button>
            
            {realtimeProfile && (
              <div className="px-3 pt-2">
                <ProfileCompletionIndicator
                  profile={realtimeProfile}
                  onOpenProfile={onProfileClick}
                  collapsed={false}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 sm:px-4">
        <div className="py-4">
          {!isCollapsed && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-2">
                {t.navigation || 'Navigation'}
              </p>
              <div className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.section;
                  
                  return (
                    <Button
                      key={item.section}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => onNavigate(item.section || '', isMobile)}
                      className={cn(
                        "w-full justify-start h-10 sm:h-9 relative",
                        isActive && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                      )}
                    >
                      <Icon className={cn(
                        "mr-2 h-4 w-4 transition-colors flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      {sectionGlossaryTerm[item.section || ''] ? (
                        <GlossaryTerm term={sectionGlossaryTerm[item.section || '']}>
                          <span className="truncate">{getLabel(item.labelKey)}</span>
                        </GlossaryTerm>
                      ) : (
                        <span className="truncate">{getLabel(item.labelKey)}</span>
                      )}
                      {item.section === 'ask-orsh' && unreadChatCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {unreadChatCount}
                        </span>
                      )}
                      {item.section === 'my-tasks' && newTaskCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                          {newTaskCount}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="space-y-2 mb-6">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.section;
                
                return (
                  <Button
                    key={item.section}
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onNavigate(item.section || '', false)}
                    className={cn(
                      "w-full h-9 relative",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                    )}
                    title={getLabel(item.labelKey)}
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                    {item.section === 'ask-orsh' && unreadChatCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                        {unreadChatCount}
                      </span>
                    )}
                    {item.section === 'my-tasks' && newTaskCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
                        {newTaskCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          )}

          <Separator className="mb-4" />

          {!isCollapsed && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-2">
                {t.settings || 'Settings'}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            {hasPermission('access_admin') && (
              <Button 
                variant="outline" 
                size={isCollapsed ? "icon" : "sm"} 
                onClick={() => onNavigate('admin-tools', isMobile)} 
                className={cn(
                  `w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`,
                  currentPage === 'admin-tools' && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                )} 
                title={t.adminTools || 'Admin Tools'}
              >
                <Settings className={cn(
                  "w-4 h-4 transition-colors",
                  currentPage === 'admin-tools' ? "text-primary" : "text-muted-foreground"
                )} />
                {!isCollapsed && <span className="ml-2">{t.adminTools || 'Admin Tools'}</span>}
              </Button>
            )}

            <Button 
              variant="outline" 
              size={isCollapsed ? "icon" : "sm"} 
              onClick={onThemeToggle} 
              className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`} 
              title={theme === 'dark' ? (t.lightMode || 'Light Mode') : (t.darkMode || 'Dark Mode')}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-muted-foreground" />
                  {!isCollapsed && <span className="ml-2">{t.lightMode || 'Light Mode'}</span>}
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-muted-foreground" />
                  {!isCollapsed && <span className="ml-2">{t.darkMode || 'Dark Mode'}</span>}
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              size={isCollapsed ? "icon" : "sm"} 
              className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`} 
              title={t.notifications || 'Notifications'}
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              {!isCollapsed && <span className="ml-2">{t.notifications || 'Notifications'}</span>}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size={isCollapsed ? "icon" : "sm"} 
                  className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`} 
                  title={t.language || 'Language'}
                >
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  {!isCollapsed && <span className="ml-2">{t.language || 'Language'}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-background z-50">
                <DropdownMenuLabel>{t.selectLanguage || 'Select Language'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onLanguageChange?.('English')}>
                  English {language === 'English' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLanguageChange?.('العربية')}>
                  العربية {language === 'العربية' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLanguageChange?.('Français')}>
                  Français {language === 'Français' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLanguageChange?.('Bahasa Melayu')}>
                  Bahasa Melayu {language === 'Bahasa Melayu' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLanguageChange?.('Қазақша')}>
                  Қазақша {language === 'Қазақша' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isLeadership && (
              <Button 
                variant="outline" 
                size={isCollapsed ? "icon" : "sm"} 
                onClick={onShowOnboarding} 
                className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`} 
                title={t.takeTour || 'Take Tour'}
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
                {!isCollapsed && <span className="ml-2">{t.takeTour || 'Take Tour'}</span>}
              </Button>
            )}
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && !isCollapsed && (
            <div className="mt-6 pt-6 border-t border-border/40">
              <div className="flex items-center justify-between px-4 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.recent || 'Recent'}</p>
                <Button variant="ghost" size="icon" onClick={onToggleSearchHistory} className="h-6 w-6">
                  <ChevronDown className={`w-3 h-3 transition-transform ${showSearchHistory ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              {showSearchHistory && (
                <div className="space-y-1">
                  {searchHistory.slice(0, 5).map((item, idx) => (
                    <Button 
                      key={idx} 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onSearchHistoryClick?.(item)} 
                      className="w-full justify-start h-8 px-4 text-xs hover:bg-muted/50"
                    >
                      <History className="w-3 h-3 mr-2 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-left">{item}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Online Users */}
      <div className="flex-shrink-0">
        <OnlineUsersIndicator users={onlineUsers} collapsed={isCollapsed} />
      </div>

      {/* Footer */}
      <div className="p-2 sm:p-4 border-t border-border/40 space-y-2 flex-shrink-0">
        <Button 
          variant="outline" 
          size={isCollapsed ? "icon" : "sm"} 
          onClick={onLogout}
          className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'} text-destructive hover:text-destructive`} 
          title={t.logout || 'Log Out'}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">{t.logout || 'Log Out'}</span>}
        </Button>

        {/* Collapse/Expand Button */}
        {onToggleCollapse && !isMobile && (
          <Button 
            variant="ghost" 
            size={isCollapsed ? "icon" : "sm"} 
            onClick={onToggleCollapse}
            className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'} text-muted-foreground hover:text-foreground`} 
            title={isCollapsed ? (t.expandSidebar || 'Expand Sidebar') : (t.collapseSidebar || 'Collapse Sidebar')}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="ml-2">{t.collapse || 'Collapse'}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
});

SidebarContent.displayName = 'SidebarContent';
