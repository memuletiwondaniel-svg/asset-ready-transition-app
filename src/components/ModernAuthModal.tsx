import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Building, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import P2ALogo from '@/components/P2ALogo';
import EnhancedCreateUserModal from '@/components/user-management/EnhancedCreateUserModal';
import { useUsers } from '@/hooks/useUsers';

interface ModernAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

const ModernAuthModal: React.FC<ModernAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: ''
  });

  const { addUser } = useUsers();

  const handleSSOLogin = (provider: string) => {
    console.log(`SSO Login with ${provider}`);
    if (provider === 'BGC' || provider === 'Kent') {
      onAuthenticated();
    } else {
      alert('SSO access is only available for BGC and Kent employees.');
    }
  };

  const handleSignIn = () => {
    if (formData.email && formData.password) {
      onAuthenticated();
    }
  };

  const handleSignUp = () => {
    if (formData.email && formData.password && formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      // For demo purposes, we'll just authenticate
      onAuthenticated();
    }
  };

  const handleCreateUser = (userData: any) => {
    addUser(userData);
    setShowRegistrationModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showRegistrationModal} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 border-0 bg-transparent shadow-none">
          <div className="bg-card/95 backdrop-blur-xl border border-border/20 rounded-2xl p-8 shadow-2xl">
            {/* Header with Logo */}
            <div className="text-center mb-8">
              <P2ALogo size={40} className="justify-center mb-4" />
              <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome</h1>
              <p className="text-muted-foreground text-sm">Access the ORSH Platform</p>
            </div>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger 
                  value="signin" 
                  className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Create your Account
                </TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin" className="space-y-6">
                {/* SSO Buttons */}
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-left justify-start bg-background hover:bg-muted/50 border-border/50 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
                    onClick={() => handleSSOLogin('BGC')}
                  >
                    <Building className="h-5 w-5 mr-3 text-primary" />
                    <span className="font-medium">Continue with BGC</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-left justify-start bg-background hover:bg-muted/50 border-border/50 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
                    onClick={() => handleSSOLogin('Kent')}
                  >
                    <img src="/lovable-uploads/08d85d46-7571-49db-977b-a806bd1c91e5.png" alt="Kent Logo" className="h-5 w-5 mr-3" />
                    <span className="font-medium">Continue with Kent</span>
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/30" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or sign in with email</span>
                  </div>
                </div>

                {/* Email and Password Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="your.email@company.com"
                        className="pl-10 h-12 rounded-xl border-border/50 bg-background focus:border-primary focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 h-12 rounded-xl border-border/50 bg-background focus:border-primary focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="rounded border-border/50"
                    />
                    <Label htmlFor="remember" className="text-sm text-foreground cursor-pointer">
                      Keep me signed in
                    </Label>
                  </div>
                  <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <Button 
                  onClick={handleSignIn}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
                >
                  Sign In
                </Button>
              </TabsContent>

              {/* Create Account Tab */}
              <TabsContent value="signup" className="space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create your P2A account with detailed information and project associations.
                  </p>
                  
                  <Button 
                    onClick={() => setShowRegistrationModal(true)}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Create Your Account
                  </Button>
                  
                  <p className="text-xs text-muted-foreground">
                    Approval required by BGC
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      
      <EnhancedCreateUserModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onCreateUser={handleCreateUser}
        isAdminCreated={false}
      />
    </>
  );
};

export default ModernAuthModal;