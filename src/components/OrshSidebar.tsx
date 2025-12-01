import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserProfileModal } from '@/components/user-management/UserProfileModal';
import OrshLogo from '@/components/ui/OrshLogo';
import { Home, Settings, ChevronDown, ChevronLeft, ChevronRight, Languages, Check, User, Shield, Bell, LogOut, Clock, History, LayoutGrid, Moon, Sun, AlertTriangle, Users, FileText, FolderKanban, MessageSquare, CalendarCheck, Key, Wrench } from 'lucide-react';
import { useTheme } from '@/components/ui/theme-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ORSHChatDialog } from '@/components/widgets/ORSHChatDialog';
import { useRealtimeProfile } from '@/hooks/useRealtimeProfile';
import { useUserPresence } from '@/hooks/useUserPresence';
import { ProfileCompletionIndicator } from '@/components/sidebar/ProfileCompletionIndicator';
import { OnlineUsersIndicator } from '@/components/sidebar/OnlineUsersIndicator';
import { supabase } from '@/integrations/supabase/client';

interface NavigationItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  section?: string;
}

interface OrshSidebarProps {
  userName?: string;
  userTitle?: string;
  userAvatar?: string;
  language?: string;
  onLanguageChange?: (language: string) => void;
  onNavigate?: (section: string) => void;
  onShowWidgets?: () => void;
  onShowOnboarding?: () => void;
  onLogout?: () => void;
  showWidgets?: boolean;
  currentPage?: string;
  searchHistory?: string[];
  onSearchHistoryClick?: (item: string) => void;
  showSearchHistory?: boolean;
  onToggleSearchHistory?: () => void;
}
export const OrshSidebar: React.FC<OrshSidebarProps> = ({
  userName = 'Daniel',
  userTitle = 'ORA Engr.',
  userAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  language = 'en',
  onLanguageChange,
  onNavigate,
  onShowWidgets,
  onShowOnboarding,
  onLogout,
  showWidgets = false,
  currentPage = 'home',
  searchHistory = [],
  onSearchHistoryClick,
  showSearchHistory = false,
  onToggleSearchHistory
}) => {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  
  // Fetch current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    fetchUserId();
  }, []);

  // Real-time profile updates
  const { profile: realtimeProfile, refetch: refetchProfile } = useRealtimeProfile(currentUserId);
  
  // User presence tracking
  const onlineUsers = useUserPresence(currentUserId);
  
  // Use real-time profile data if available, otherwise use props
  const displayName = realtimeProfile?.full_name || userName;
  const displayTitle = realtimeProfile?.position || userTitle;
  const displayAvatar = realtimeProfile?.avatar_url || userAvatar;
  
  // Navigation items
  const navigationItems: NavigationItem[] = [
    { label: 'Home', icon: Home, path: '/', section: 'home' },
    { label: 'Ask ORSH AI', icon: MessageSquare, path: '/ask-orsh', section: 'ask-orsh' },
    { label: 'Safe Start-Up', icon: AlertTriangle, path: '/safe-startup', section: 'safe-startup' },
    { label: 'OR Plans', icon: CalendarCheck, path: '/operation-readiness', section: 'operation-readiness' },
    { label: 'OR Maintenance', icon: Wrench, path: '/or-maintenance', section: 'or-maintenance' },
    { label: 'P2A Handover', icon: Key, path: '/p2a-handover', section: 'p2a-handover' },
    { label: 'Projects', icon: FolderKanban, path: '/projects', section: 'projects' },
  ];
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    toast
  } = useToast();
  return <div className={`relative border-r border-border/40 bg-card/50 backdrop-blur-xl flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} h-screen`}>
      {/* Collapse/Expand Button */}
      

      {/* ORSH Branding & Header */}
      <div className="p-6 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-center mb-4">
          {!isSidebarCollapsed ? <OrshLogo size="medium" className="animate-fade-in" /> : <OrshLogo size="small" />}
        </div>
        
        {/* User Profile Section - Direct click to open modal */}
        {isSidebarCollapsed ? (
          <div 
            role="button" 
            tabIndex={0} 
            onClick={() => setProfileModalOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setProfileModalOpen(true)}
            className="w-full p-3 h-auto flex items-center justify-center hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
          >
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <>
            <Button 
              variant="ghost" 
              onClick={() => setProfileModalOpen(true)}
              className="w-full p-3 h-auto hover:bg-muted/50 justify-start transition-colors"
            >
              <Avatar className="h-10 w-10 flex-shrink-0 mr-3">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left animate-fade-in">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displayTitle}</p>
              </div>
            </Button>
            
            {/* Profile Completion Indicator */}
            {realtimeProfile && (
              <div className="px-3 pt-2">
                <ProfileCompletionIndicator
                  profile={realtimeProfile}
                  onOpenProfile={() => setProfileModalOpen(true)}
                  collapsed={false}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4">
        {/* Main Navigation */}
        {!isSidebarCollapsed && (
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
                    onClick={() => {
                      console.log('Sidebar navigation clicked:', item.section, item);
                      if (item.section === 'ask-orsh') {
                        setChatOpen(true);
                      } else {
                        console.log('Calling onNavigate with:', item.section);
                        onNavigate?.(item.section || '');
                      }
                    }}
                    className={cn(
                      "w-full justify-start h-9 relative",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                    )}
                  >
                    <Icon className={cn(
                      "mr-2 h-4 w-4 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span>{item.label}</span>
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

        {isSidebarCollapsed && (
          <div className="space-y-2 mb-6">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.section;
              
              return (
                <Button
                  key={item.section}
                  variant={isActive ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => {
                    console.log('Sidebar navigation clicked (collapsed):', item.section, item);
                    if (item.section === 'ask-orsh') {
                      setChatOpen(true);
                    } else {
                      console.log('Calling onNavigate with:', item.section);
                      onNavigate?.(item.section || '');
                    }
                  }}
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

        {/* Settings Section */}
        {!isSidebarCollapsed && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-2">
              Settings
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          {/* Theme Toggle Row */}
          <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            {theme === 'dark' ? <>
                <Sun className="w-4 h-4 text-muted-foreground" />
                {!isSidebarCollapsed && <span className="ml-2">Light Mode</span>}
              </> : <>
                <Moon className="w-4 h-4 text-muted-foreground" />
                {!isSidebarCollapsed && <span className="ml-2">Dark Mode</span>}
              </>}
          </Button>

          {/* Notifications Row */}
          <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`} title="Notifications">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {!isSidebarCollapsed && <span className="ml-2">Notifications</span>}
          </Button>

          {/* Language Selector Row */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`} title="Language">
                <Languages className="w-4 h-4 text-muted-foreground" />
                {!isSidebarCollapsed && <span className="ml-2">Language</span>}
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

          {/* Widgets Row */}
          <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} onClick={onShowWidgets} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`} title="Widgets">
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            {!isSidebarCollapsed && <span className="ml-2">Widgets</span>}
          </Button>

          {/* Take Tour Row */}
          <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} onClick={onShowOnboarding} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`} title="Take Tour">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {!isSidebarCollapsed && <span className="ml-2">Take Tour</span>}
          </Button>

          {/* Admin Tools Row */}
          <Button 
            variant="outline" 
            size={isSidebarCollapsed ? "icon" : "sm"} 
            onClick={() => onNavigate?.('admin-tools')} 
            className={cn(
              `w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`,
              currentPage === 'admin-tools' && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
            )} 
            title="Admin Tools"
          >
            <Settings className={cn(
              "w-4 h-4 transition-colors",
              currentPage === 'admin-tools' ? "text-primary" : "text-muted-foreground"
            )} />
            {!isSidebarCollapsed && <span className="ml-2">Admin Tools</span>}
          </Button>
        </div>

        {/* Search History Section */}
        {searchHistory.length > 0 && !isSidebarCollapsed && <div className="mt-6 pt-6 border-t border-border/40 animate-fade-in">
            <div className="flex items-center justify-between px-4 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent</p>
              <Button variant="ghost" size="icon" onClick={onToggleSearchHistory} className="h-6 w-6">
                <ChevronDown className={`w-3 h-3 transition-transform ${showSearchHistory ? 'rotate-180' : ''}`} />
              </Button>
            </div>
            {showSearchHistory && <div className="space-y-1">
                {searchHistory.slice(0, 5).map((item, idx) => <Button key={idx} variant="ghost" size="sm" onClick={() => onSearchHistoryClick?.(item)} className="w-full justify-start h-8 px-4 text-xs hover:bg-muted/50">
                    <History className="w-3 h-3 mr-2 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-left">{item}</span>
                  </Button>)}
              </div>}
          </div>}
        </div>
      </ScrollArea>

      {/* Online Users Indicator */}
      <div className="flex-shrink-0">
        <OnlineUsersIndicator users={onlineUsers} collapsed={isSidebarCollapsed} />
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/40 space-y-2 flex-shrink-0">
        {/* Logout Row */}
        <Button 
          variant="outline" 
          size={isSidebarCollapsed ? "icon" : "sm"} 
          onClick={() => setLogoutDialogOpen(true)}
          className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-destructive hover:text-destructive animate-fade-in`} 
          title="Log Out"
        >
          <LogOut className="w-4 h-4" />
          {!isSidebarCollapsed && <span className="ml-2">Log Out</span>}
        </Button>
        
        {/* Sidebar Toggle Button */}
        <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'}`} title={isSidebarCollapsed ? 'Expand' : 'Collapse'}>
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="animate-fade-in">Collapse</span>
            </>}
        </Button>
      </div>

      {/* Profile Editor Modal */}
      <UserProfileModal 
        open={profileModalOpen} 
        onOpenChange={setProfileModalOpen} 
        onProfileUpdated={() => {
          refetchProfile();
          toast({
            title: "Profile updated",
            description: "Your profile has been updated successfully.",
          });
        }}
      />

      {/* ORSH Chat Dialog */}
      <ORSHChatDialog 
        open={chatOpen} 
        onOpenChange={setChatOpen}
        onUnreadCountChange={setUnreadChatCount}
      />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLogoutDialogOpen(false);
                toast({
                  title: "Logged out successfully",
                  description: "You have been logged out of your account.",
                });
                onLogout?.();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};