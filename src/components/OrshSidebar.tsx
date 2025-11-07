import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from './admin/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { UserProfileModal } from '@/components/user-management/UserProfileModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import OrshLogo from '@/components/ui/OrshLogo';
import { Home, Settings, ChevronDown, ChevronLeft, ChevronRight, Languages, Check, User, Shield, Bell, LogOut, Clock, History, LayoutGrid, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ui/theme-provider';
import { useToast } from '@/components/ui/use-toast';
interface BreadcrumbItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
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
  breadcrumbs?: BreadcrumbItem[];
}
export const OrshSidebar: React.FC<OrshSidebarProps> = ({
  userName = 'Daniel',
  userTitle = 'ORA Engr.',
  userAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  language = 'en',
  onLanguageChange,
  onShowWidgets,
  onShowOnboarding,
  showWidgets = false,
  searchHistory = [],
  onSearchHistoryClick,
  showSearchHistory = false,
  onToggleSearchHistory,
  breadcrumbs = [{ label: 'Home', icon: Home }]
}) => {
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
  return <div className={`relative border-r border-border/40 bg-card/50 backdrop-blur-xl flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Collapse/Expand Button */}
      

      {/* ORSH Branding & Header */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center justify-center mb-4">
          {!isSidebarCollapsed ? <OrshLogo size="medium" className="animate-fade-in" /> : <OrshLogo size="small" />}
        </div>

        {!isSidebarCollapsed && <>
            {/* Breadcrumb Navigation */}
            <div className="mb-4 animate-fade-in">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => {
                    const Icon = crumb.icon || Home;
                    const isLast = index === breadcrumbs.length - 1;
                    
                    return (
                      <React.Fragment key={index}>
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage className="flex items-center gap-1.5 text-sm font-medium">
                              <Icon className="h-3.5 w-3.5" />
                              {crumb.label}
                            </BreadcrumbPage>
                          ) : (
                            <button
                              onClick={crumb.onClick}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {crumb.label}
                            </button>
                          )}
                        </BreadcrumbItem>
                        {!isLast && (
                          <span className="mx-2 text-muted-foreground text-sm">/</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <Separator className="mb-4" />
          </>}
        
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

      {/* Navigation Menu - Removed, only widgets on main page */}
      <ScrollArea className="flex-1 p-4">
        {/* Quick Actions */}
        <div className="space-y-2">
          {/* Theme Toggle Row */}
          <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            {theme === 'dark' ? <>
                <Sun className="w-4 h-4" />
                {!isSidebarCollapsed && <span className="ml-2">Light Mode</span>}
              </> : <>
                <Moon className="w-4 h-4" />
                {!isSidebarCollapsed && <span className="ml-2">Dark Mode</span>}
              </>}
          </Button>

          {/* Notifications Row */}
          <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`} title="Notifications">
            <Bell className="w-4 h-4" />
            {!isSidebarCollapsed && <span className="ml-2">Notifications</span>}
          </Button>

          {/* Language Selector Row */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`} title="Language">
                <Languages className="w-4 h-4" />
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
            <LayoutGrid className="w-4 h-4" />
            {!isSidebarCollapsed && <span className="ml-2">Widgets</span>}
          </Button>

          {/* Take Tour Row */}
          <Button variant="outline" size={isSidebarCollapsed ? "icon" : "sm"} onClick={onShowOnboarding} className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'} animate-fade-in`} title="Take Tour">
            <Clock className="w-4 h-4" />
            {!isSidebarCollapsed && <span className="ml-2">Take Tour</span>}
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
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/40 space-y-2">
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