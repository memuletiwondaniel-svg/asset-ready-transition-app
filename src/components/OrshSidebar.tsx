import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { UserProfileModal } from '@/components/user-management/UserProfileModal';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useTheme } from '@/components/ui/theme-provider';
import { useToast } from '@/hooks/use-toast';
import { ORSHChatDialog } from '@/components/widgets/ORSHChatDialog';
import { useRealtimeProfile } from '@/hooks/useRealtimeProfile';
import { useUserPresence } from '@/hooks/useUserPresence';
import { SidebarContent } from '@/components/sidebar/SidebarContent';
import { supabase } from '@/integrations/supabase/client';

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
  userName = 'User',
  userTitle = '',
  userAvatar = '',
  language = 'en',
  onLanguageChange,
  onNavigate,
  onShowWidgets,
  onShowOnboarding,
  onLogout,
  currentPage = 'home',
  searchHistory = [],
  onSearchHistoryClick,
  showSearchHistory = false,
  onToggleSearchHistory
}) => {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    fetchUserId();
  }, []);

  const { profile: realtimeProfile, refetch: refetchProfile } = useRealtimeProfile(currentUserId);
  const onlineUsers = useUserPresence(currentUserId);
  
  const displayName = realtimeProfile?.full_name || userName;
  const displayTitle = realtimeProfile?.position || userTitle;
  const displayAvatar = realtimeProfile?.avatar_url || userAvatar;

  const handleNavigate = useCallback((section: string, closeMobile = false) => {
    if (closeMobile) setMobileOpen(false);
    if (section === 'ask-orsh') {
      setChatOpen(true);
    } else {
      onNavigate?.(section);
    }
  }, [onNavigate]);

  const handleThemeToggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const handleProfileClick = useCallback(() => {
    setProfileModalOpen(true);
  }, []);

  const handleLogoutClick = useCallback(() => {
    setLogoutDialogOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    setLogoutDialogOpen(false);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    onLogout?.();
  }, [toast, onLogout]);

  return (
    <>
      {/* Mobile Menu Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent
            isMobile={true}
            isCollapsed={false}
            isProfileLoading={!!currentUserId && !realtimeProfile}
            displayName={displayName}
            displayTitle={displayTitle}
            displayAvatar={displayAvatar}
            currentPage={currentPage}
            theme={theme}
            language={language}
            unreadChatCount={unreadChatCount}
            searchHistory={searchHistory}
            showSearchHistory={showSearchHistory}
            onlineUsers={onlineUsers}
            realtimeProfile={realtimeProfile}
            onProfileClick={handleProfileClick}
            onNavigate={handleNavigate}
            onThemeToggle={handleThemeToggle}
            onLanguageChange={onLanguageChange}
            onShowWidgets={onShowWidgets}
            onShowOnboarding={onShowOnboarding}
            onToggleSearchHistory={onToggleSearchHistory}
            onSearchHistoryClick={onSearchHistoryClick}
            onLogout={handleLogoutClick}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col border-r border-border/40 bg-background/95 backdrop-blur-sm transition-[width] duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-16' : 'w-72'
        } h-screen relative`}
      >
        <SidebarContent
          isMobile={false}
          isCollapsed={isSidebarCollapsed}
          isProfileLoading={!!currentUserId && !realtimeProfile}
          displayName={displayName}
          displayTitle={displayTitle}
          displayAvatar={displayAvatar}
          currentPage={currentPage}
          theme={theme}
          language={language}
          unreadChatCount={unreadChatCount}
          searchHistory={searchHistory}
          showSearchHistory={showSearchHistory}
          onlineUsers={onlineUsers}
          realtimeProfile={realtimeProfile}
          onProfileClick={handleProfileClick}
          onNavigate={handleNavigate}
          onThemeToggle={handleThemeToggle}
          onLanguageChange={onLanguageChange}
          onShowWidgets={onShowWidgets}
          onShowOnboarding={onShowOnboarding}
          onToggleSearchHistory={onToggleSearchHistory}
          onSearchHistoryClick={onSearchHistoryClick}
          onLogout={handleLogoutClick}
        />
        
        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-muted"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>

      {/* Modals */}
      <UserProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        onProfileUpdated={refetchProfile}
      />

      <ORSHChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        onUnreadCountChange={setUnreadChatCount}
      />

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
