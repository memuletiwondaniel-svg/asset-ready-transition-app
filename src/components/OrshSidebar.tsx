import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from './admin/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { UserProfileModal } from '@/components/user-management/UserProfileModal';
import { 
  Home, Settings, ClipboardList, KeyRound, ChevronDown, ChevronLeft, ChevronRight, 
  Languages, Check, User, Shield, Bell, LogOut, Eye, EyeOff, GripVertical,
  Clock, Sparkles, History
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/components/ui/use-toast';

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

interface SortableNavItemProps {
  item: {
    id: string;
    label: string;
    icon: string;
    visible: boolean;
    gradient?: string;
  };
}

const SortableNavItem: React.FC<SortableNavItemProps> = ({ item }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/30 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium flex-1">{item.label}</span>
      {!item.visible && (
        <Badge variant="secondary" className="text-xs">Hidden</Badge>
      )}
    </div>
  );
};

export const OrshSidebar: React.FC<OrshSidebarProps> = ({
  userName = 'Daniel',
  userTitle = 'ORA Engr.',
  userAvatar = '/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png',
  language = 'en',
  onLanguageChange,
  onNavigate,
  onShowWidgets,
  onShowOnboarding,
  showWidgets = false,
  currentPage = 'dashboard',
  searchHistory = [],
  onSearchHistoryClick,
  showSearchHistory = false,
  onToggleSearchHistory
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarSettingsOpen, setSidebarSettingsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { toast } = useToast();

  // Navigation items configuration with visibility and order
  const [navItems, setNavItems] = useState(() => {
    const saved = localStorage.getItem('sidebarNavConfig');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: 'dashboard', label: 'Dashboard', icon: 'Home', visible: true },
      { id: 'safe-startup', label: 'Safe Start-Up', icon: 'ClipboardList', gradient: 'from-blue-500 to-blue-600', visible: true },
      { id: 'p2o', label: 'Project-to-Operations', icon: 'KeyRound', gradient: 'from-purple-500 to-purple-600', visible: true },
      { id: 'admin-tools', label: 'Admin & Tools', icon: 'Settings', gradient: 'from-orange-500 to-orange-600', visible: true }
    ];
  });

  // Save navigation config to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('sidebarNavConfig', JSON.stringify(navItems));
  }, [navItems]);

  // Icon mapping helper
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Home, ClipboardList, KeyRound, Settings
    };
    return icons[iconName] || Home;
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setNavItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleNavItemVisibility = (id: string) => {
    setNavItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const resetNavConfig = () => {
    const defaultConfig = [
      { id: 'dashboard', label: 'Dashboard', icon: 'Home', visible: true },
      { id: 'safe-startup', label: 'Safe Start-Up', icon: 'ClipboardList', gradient: 'from-blue-500 to-blue-600', visible: true },
      { id: 'p2o', label: 'Project-to-Operations', icon: 'KeyRound', gradient: 'from-purple-500 to-purple-600', visible: true },
      { id: 'admin-tools', label: 'Admin & Tools', icon: 'Settings', gradient: 'from-orange-500 to-orange-600', visible: true }
    ];
    setNavItems(defaultConfig);
    toast({
      title: "Settings Reset",
      description: "Navigation menu restored to default configuration"
    });
  };

  // Get workspace data by id
  const getWorkspaceGradient = (id: string) => {
    const item = navItems.find(i => i.id === id);
    return item?.gradient || '';
  };

  return (
    <div className={`border-r border-border/40 bg-card/50 backdrop-blur-xl flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
      {/* ORSH Branding & Header */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-xl font-bold text-white">OR</span>
          </div>
          {!isSidebarCollapsed && (
            <div className="animate-fade-in">
              <h2 className="font-bold text-lg">ORSH</h2>
              <p className="text-xs text-muted-foreground">Operations Hub</p>
            </div>
          )}
        </div>

        {!isSidebarCollapsed && (
          <>
            {/* Breadcrumb Navigation */}
            <div className="mb-4 animate-fade-in">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="flex items-center gap-1.5 text-sm">
                      <Home className="h-3.5 w-3.5" />
                      {currentPage === 'dashboard' ? 'Home' : currentPage.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Settings Row - Theme, Notifications, Language */}
            <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/20 animate-fade-in">
              <ThemeToggle />
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Languages className="h-4 w-4" />
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
            </div>

            <Separator className="mb-4" />
          </>
        )}
        
        {/* User Profile Section */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={`w-full p-3 h-auto hover:bg-muted/50 ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
            >
              <Avatar className={`h-10 w-10 flex-shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`}>
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                  {userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isSidebarCollapsed && (
                <>
                  <div className="flex-1 text-left animate-fade-in">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{userTitle}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-background z-50">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>Edit Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Shield className="mr-2 h-4 w-4" />
              <span>Security</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell className="mr-2 h-4 w-4" />
              <span>Notifications</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.filter(item => item.visible).map((navItem) => {
            const IconComponent = getIconComponent(navItem.icon);
            const isActive = currentPage === navItem.id;
            
            if (navItem.id === 'dashboard') {
              return (
                <Button
                  key={navItem.id}
                  variant="ghost"
                  onClick={() => onNavigate?.('dashboard')}
                  className={`w-full h-11 px-4 ${isActive ? 'bg-primary/10 text-primary' : ''} hover:bg-primary/20 ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                >
                  <IconComponent className={`w-4 h-4 ${isSidebarCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                  {!isSidebarCollapsed && <span className="animate-fade-in">{navItem.label}</span>}
                </Button>
              );
            }

            return (
              <Button
                key={navItem.id}
                variant="ghost"
                onClick={() => onNavigate?.(navItem.id)}
                className={`w-full h-11 px-4 hover:bg-muted/50 transition-all group ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${navItem.gradient} flex items-center justify-center ${isSidebarCollapsed ? '' : 'mr-3'} group-hover:scale-110 transition-transform flex-shrink-0`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex-1 text-left animate-fade-in">
                    <p className="text-sm font-medium">{navItem.label}</p>
                  </div>
                )}
              </Button>
            );
          })}
        </div>

        {/* Search History Section */}
        {searchHistory.length > 0 && !isSidebarCollapsed && (
          <div className="mt-6 pt-6 border-t border-border/40 animate-fade-in">
            <div className="flex items-center justify-between px-4 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSearchHistory}
                className="h-6 w-6"
              >
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
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/40 space-y-2">
        {/* Sidebar Settings Button */}
        {!isSidebarCollapsed && (
          <Sheet open={sidebarSettingsOpen} onOpenChange={setSidebarSettingsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-9 animate-fade-in"
              >
                <Settings className="w-4 h-4 mr-2" />
                Customize Menu
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md bg-background z-[100]">
              <SheetHeader>
                <SheetTitle>Navigation Menu Settings</SheetTitle>
                <SheetDescription>
                  Customize which sections appear and their order in the sidebar
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Visibility Toggles */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Section Visibility</h3>
                  <div className="space-y-3">
                    {navItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                        <div className="flex items-center gap-3">
                          {item.visible ? (
                            <Eye className="w-4 h-4 text-primary" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Label htmlFor={`toggle-${item.id}`} className="cursor-pointer">
                            {item.label}
                          </Label>
                        </div>
                        <Switch
                          id={`toggle-${item.id}`}
                          checked={item.visible}
                          onCheckedChange={() => toggleNavItemVisibility(item.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Drag to Reorder */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Reorder Sections</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Drag to change the order of navigation items
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={navItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {navItems.map((item) => (
                          <SortableNavItem key={item.id} item={item} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                <Separator />

                {/* Reset Button */}
                <Button
                  variant="outline"
                  onClick={resetNavConfig}
                  className="w-full"
                >
                  Reset to Default
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Sidebar Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`w-full h-9 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start'}`}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="animate-fade-in">Collapse</span>
            </>
          )}
        </Button>
        
        {!isSidebarCollapsed && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onShowWidgets}
              className="w-full justify-start h-9 animate-fade-in"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {showWidgets ? 'Hide Widgets' : 'Show Widgets'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onShowOnboarding}
              className="w-full justify-start h-9 animate-fade-in"
            >
              <Clock className="w-4 h-4 mr-2" />
              Take Tour
            </Button>
          </>
        )}
      </div>

      {/* Profile Editor Modal */}
      <UserProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        onProfileUpdated={() => {
          // Force parent component to refresh profile data
          window.location.reload();
        }}
      />
    </div>
  );
};
