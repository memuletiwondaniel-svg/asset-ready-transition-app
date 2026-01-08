import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import OrshLogo from '@/components/ui/OrshLogo';
import { Home, Settings, ChevronDown, ChevronLeft, ChevronRight, Languages, Check, Bell, LogOut, Clock, History, LayoutGrid, Moon, Sun, AlertTriangle, FolderKanban, MessageSquare, CalendarCheck, Key, Wrench, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileCompletionIndicator } from '@/components/sidebar/ProfileCompletionIndicator';
import { OnlineUsersIndicator } from '@/components/sidebar/OnlineUsersIndicator';

interface NavigationItem {
  label: string;
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

const navigationItems: NavigationItem[] = [
  { label: 'Home', icon: Home, path: '/', section: 'home' },
  { label: 'Ask ORSH AI', icon: MessageSquare, path: '/ask-orsh', section: 'ask-orsh' },
  { label: 'PSSR', icon: AlertTriangle, path: '/pssr', section: 'pssr' },
  { label: 'My Reviews', icon: ClipboardCheck, path: '/pssr/approver-dashboard', section: 'pssr-reviews' },
  { label: 'OR Plans', icon: CalendarCheck, path: '/operation-readiness', section: 'operation-readiness' },
  { label: 'OR Maintenance', icon: Wrench, path: '/or-maintenance', section: 'or-maintenance' },
  { label: 'P2A Handover', icon: Key, path: '/p2a-handover', section: 'p2a-handover' },
  { label: 'Projects', icon: FolderKanban, path: '/projects', section: 'projects' },
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
  onLogout,
  onToggleCollapse,
}) => {
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
                    <p className="text-sm font-medium truncate">{displayName}</p>
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
                Navigation
              </p>
              <div className="space-y-1">
                {navigationItems.map((item) => {
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
                      <span className="truncate">{item.label}</span>
                      {item.section === 'ask-orsh' && unreadChatCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {unreadChatCount}
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
              {navigationItems.map((item) => {
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
                    title={item.label}
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
                  </Button>
                );
              })}
            </div>
          )}

          <Separator className="mb-4" />

          {!isCollapsed && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-2">
                Settings
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size={isCollapsed ? "icon" : "sm"} 
              onClick={() => onNavigate('admin-tools', isMobile)} 
              className={cn(
                `w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`,
                currentPage === 'admin-tools' && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
              )} 
              title="Admin Tools"
            >
              <Settings className={cn(
                "w-4 h-4 transition-colors",
                currentPage === 'admin-tools' ? "text-primary" : "text-muted-foreground"
              )} />
              {!isCollapsed && <span className="ml-2">Admin Tools</span>}
            </Button>

            <Button 
              variant="outline" 
              size={isCollapsed ? "icon" : "sm"} 
              onClick={onThemeToggle} 
              className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`} 
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-muted-foreground" />
                  {!isCollapsed && <span className="ml-2">Light Mode</span>}
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-muted-foreground" />
                  {!isCollapsed && <span className="ml-2">Dark Mode</span>}
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              size={isCollapsed ? "icon" : "sm"} 
              className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`} 
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              {!isCollapsed && <span className="ml-2">Notifications</span>}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size={isCollapsed ? "icon" : "sm"} 
                  className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`} 
                  title="Language"
                >
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  {!isCollapsed && <span className="ml-2">Language</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-background z-50">
                <DropdownMenuLabel>Select Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onLanguageChange?.('en')}>
                  English {language === 'en' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLanguageChange?.('es')}>
                  Español {language === 'es' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLanguageChange?.('fr')}>
                  Français {language === 'fr' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="outline" 
              size={isCollapsed ? "icon" : "sm"} 
              onClick={onShowOnboarding} 
              className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`} 
              title="Take Tour"
            >
              <Clock className="w-4 h-4 text-muted-foreground" />
              {!isCollapsed && <span className="ml-2">Take Tour</span>}
            </Button>
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && !isCollapsed && (
            <div className="mt-6 pt-6 border-t border-border/40">
              <div className="flex items-center justify-between px-4 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent</p>
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
          title="Log Out"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Log Out</span>}
        </Button>

        {/* Collapse/Expand Button */}
        {onToggleCollapse && !isMobile && (
          <Button 
            variant="ghost" 
            size={isCollapsed ? "icon" : "sm"} 
            onClick={onToggleCollapse}
            className={`w-full h-10 sm:h-9 ${isCollapsed ? 'justify-center px-0' : 'justify-start'} text-muted-foreground hover:text-foreground`} 
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="ml-2">Collapse</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
});

SidebarContent.displayName = 'SidebarContent';
