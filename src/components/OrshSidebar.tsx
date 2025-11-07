import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserProfileModal } from '@/components/user-management/UserProfileModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import OrshLogo from '@/components/ui/OrshLogo';
import { Home, Settings, ChevronDown, ChevronLeft, ChevronRight, Languages, Check, User, Shield, Bell, LogOut, AlertTriangle, LayoutGrid, Moon, Sun, Users, FolderKanban } from 'lucide-react';
import { useTheme } from '@/components/ui/theme-provider';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
  showWidgets = false,
  currentPage = 'home',
  searchHistory = [],
  onSearchHistoryClick,
  showSearchHistory = false,
  onToggleSearchHistory
}) => {
  
  // Navigation items
  const navigationItems: NavigationItem[] = [
    { label: 'Home', icon: Home, path: '/', section: 'home' },
    { label: 'Safe Start-Up', icon: AlertTriangle, path: '/safe-startup', section: 'safe-startup' },
    { label: 'User Management', icon: Users, path: '/user-management', section: 'user-management' },
    { label: 'Admin Tools', icon: Settings, path: '/admin-tools', section: 'admin-tools' },
    { label: 'Projects', icon: FolderKanban, path: '/projects', section: 'projects' },
  ];
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    toast
  } = useToast();
  return <div className={`relative border-r border-border/40 bg-card/50 backdrop-blur-xl flex flex-col h-screen transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Collapse/Expand Button */}
      

      {/* ORSH Branding & Header */}
      <div className="p-4 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-center mb-3">
          {!isSidebarCollapsed ? <OrshLogo size="medium" className="animate-fade-in" /> : <OrshLogo size="small" />}
        </div>
        
        {/* User Profile Section */}
        <Collapsible open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <CollapsibleTrigger asChild>
            {isSidebarCollapsed ? <div role="button" tabIndex={0} className="w-full p-3 h-auto flex items-center justify-center hover:bg-muted/50 rounded-md cursor-pointer">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                    {userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div> : <Button variant="ghost" className="w-full p-3 h-auto hover:bg-muted/50 justify-start">
                <Avatar className="h-10 w-10 flex-shrink-0 mr-3">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                    {userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <>
                  <div className="flex-1 text-left animate-fade-in">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{userTitle}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </>
              </Button>}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1 animate-fade-in">
            {isSidebarCollapsed ? <>
                <Button variant="ghost" size="icon" onClick={() => setProfileModalOpen(true)} className="w-full h-9" title="Edit Profile">
                  <User className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-full h-9" title="Account Settings">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-full h-9" title="Security">
                  <Shield className="h-4 w-4" />
                </Button>
              </> : <>
                <Button variant="ghost" size="sm" onClick={() => setProfileModalOpen(true)} className="w-full justify-start h-9 pl-10">
                  <User className="mr-2 h-4 w-4" />
                  <span>Edit Profile</span>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start h-9 pl-10">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start h-9 pl-10">
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Security</span>
                </Button>
              </>}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 p-4 flex flex-col min-h-0">
        {/* Main Navigation */}
        {!isSidebarCollapsed && (
          <div className="mb-3">
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
                    onClick={() => onNavigate?.(item.section || '')}
                    className={cn(
                      "w-full justify-start h-9",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {isSidebarCollapsed && (
          <div className="space-y-2 mb-3">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.section;
              
              return (
                <Button
                  key={item.section}
                  variant={isActive ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => onNavigate?.(item.section || '')}
                  className={cn(
                    "w-full h-9",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                  )}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        )}

        <Separator className="mb-3" />

        {/* Settings Section */}
        {!isSidebarCollapsed && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-2">
              Settings
            </p>
            <div className="space-y-1">
              <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-full justify-start h-9">
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </Button>

              <Button variant="outline" size="sm" className="w-full justify-start h-9">
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start h-9">
                    <Languages className="mr-2 h-4 w-4" />
                    <span>Language</span>
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

              <Button variant="outline" size="sm" onClick={onShowWidgets} className="w-full justify-start h-9">
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>Widgets</span>
              </Button>
            </div>
          </div>
        )}

        {isSidebarCollapsed && (
          <div className="space-y-2 mb-3">
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-full h-9" title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button variant="outline" size="icon" className="w-full h-9" title="Notifications">
              <Bell className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="w-full h-9" title="Language">
                  <Languages className="w-4 h-4" />
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

            <Button variant="outline" size="icon" onClick={onShowWidgets} className="w-full h-9" title="Widgets">
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border/40 space-y-2 flex-shrink-0">
        {/* Logout Row */}
        <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-destructive hover:text-destructive animate-fade-in`} title="Log Out">
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
      <UserProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} onProfileUpdated={() => {
      // Force parent component to refresh profile data
      window.location.reload();
    }} />
    </div>;
};