import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Settings, Shield, LogOut, ChevronDown, Key, Bell, UserCog } from 'lucide-react';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { NotificationPreferencesPanel } from '@/components/NotificationPreferencesPanel';
interface UserProfileDropdownProps {
  className?: string;
  translations: any;
}
const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  className = "",
  translations
}) => {
  const {
    session,
    signOut
  } = useAuth();
  const { data: userRoleData } = useCurrentUserRole();
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const userEmail = session?.user?.email || '';
  const user = {
    name: session?.user?.email?.split('@')[0] || 'User',
    email: userEmail,
    role: userRoleData?.role || userRoleData?.position || 'User',
    avatar: '',
    initials: userEmail?.slice(0, 2).toUpperCase() || 'U',
    company: 'Basrah Gas Company',
    department: userRoleData?.position || ''
  };
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  const t = translations || {
    profile: 'Profile',
    settings: 'Settings',
    security: 'Security',
    signOut: 'Sign Out',
    notifications: 'Notifications',
    accountSettings: 'Account Settings'
  };
  return <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={`h-9 w-9 p-0 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 ${className}`}>
            <Avatar className="h-8 w-8">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback delayMs={600} className="text-xs bg-primary text-primary-foreground font-semibold">
                {user.initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-72 bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl p-0">
          {/* User Info Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback delayMs={600} className="bg-primary text-primary-foreground text-lg">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <div className="flex items-center mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>
            
          </div>

          {/* Menu Items */}
          <div className="p-1">
            <DropdownMenuItem className="cursor-pointer p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <User className="h-4 w-4 mr-3 text-muted-foreground" />
              <span className="font-medium">{t.profile}</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <Settings className="h-4 w-4 mr-3 text-muted-foreground" />
              <span className="font-medium">{t.accountSettings}</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer p-3 rounded-lg hover:bg-accent/50 transition-colors" onClick={() => setShowSecurityModal(true)}>
              <Shield className="h-4 w-4 mr-3 text-muted-foreground" />
              <span className="font-medium">{t.security}</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer p-3 rounded-lg hover:bg-accent/50 transition-colors" onClick={() => setShowNotificationsModal(true)}>
              <Bell className="h-4 w-4 mr-3 text-muted-foreground" />
              <span className="font-medium">{t.notifications}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />
            
            <DropdownMenuItem className="cursor-pointer p-3 rounded-lg hover:bg-destructive/10 text-destructive hover:text-destructive transition-colors" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-3" />
              <span className="font-medium">{t.signOut}</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Security Modal */}
      <Dialog open={showSecurityModal} onOpenChange={setShowSecurityModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary" />
              Security Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center">
                <Key className="h-4 w-4 mr-3 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center">
                <UserCog className="h-4 w-4 mr-3 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Setup</Button>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-green-600" />
                <p className="text-sm text-green-800">Your account is secure</p>
              </div>
              <p className="text-xs text-green-600 mt-1">Last login: Today at 2:45 PM</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Preferences Modal */}
      <Dialog open={showNotificationsModal} onOpenChange={setShowNotificationsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-primary" />
              Notification Preferences
            </DialogTitle>
          </DialogHeader>
          <NotificationPreferencesPanel />
        </DialogContent>
      </Dialog>
    </>;
};
export default UserProfileDropdown;