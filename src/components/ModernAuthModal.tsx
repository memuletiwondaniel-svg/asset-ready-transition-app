import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock, X, Building, Key } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  onAuthenticated
}) => {
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const { addUser } = useUsers();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signInData.email && signInData.password) {
      setLoading(true);
      // Simulate authentication
      setTimeout(() => {
        onAuthenticated();
        setLoading(false);
      }, 1000);
    }
  };

  const handleSSO = async (provider: string) => {
    setLoading(true);
    // Simulate SSO authentication
    setTimeout(() => {
      onAuthenticated();
      setLoading(false);
    }, 1000);
  };

  const handleCreateUser = (userData: any) => {
    addUser(userData);
    setShowCreateAccount(false);
    onClose();
  };

  const handleForgotPassword = () => {
    // Handle forgot password logic
    console.log('Forgot password clicked');
  };

  return (
    <>
      <Dialog open={isOpen && !showCreateAccount} onOpenChange={onClose}>
        <DialogContent className="max-w-[400px] p-0 bg-white rounded-xl border-0 shadow-2xl overflow-hidden">
          {/* Header with close button */}
          <div className="flex justify-end p-4 pb-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          </div>

          {/* Main Content */}
          <div className="px-8 pb-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tab Navigation */}
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-lg p-1 mb-6">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-sm font-medium"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-sm font-medium"
                >
                  Create your Account
                </TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin" className="space-y-4 mt-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="pl-10 bg-gray-50 border-gray-200 rounded-lg h-12 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-10 pr-10 bg-gray-50 border-gray-200 rounded-lg h-12 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Remember me and Forgot password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="rounded"
                      />
                      <Label htmlFor="remember" className="text-sm text-gray-600">
                        Keep me signed in
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleForgotPassword}
                      className="p-0 h-auto text-sm text-blue-600 hover:text-blue-700"
                    >
                      Forgot password?
                    </Button>
                  </div>

                  {/* Sign In Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-12 text-sm font-medium transition-colors duration-200"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>

                {/* Separator */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or continue with</span>
                  </div>
                </div>

                {/* SSO Buttons */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSSO('bgc')}
                    disabled={loading}
                    className="w-full border-gray-200 rounded-lg h-12 text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Building className="h-4 w-4 mr-3 text-blue-600" />
                    Continue with BGC
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSSO('kent')}
                    disabled={loading}
                    className="w-full border-gray-200 rounded-lg h-12 text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Key className="h-4 w-4 mr-3 text-green-600" />
                    Continue with Kent
                  </Button>
                </div>
              </TabsContent>

              {/* Create Account Tab */}
              <TabsContent value="signup" className="space-y-4 mt-0">
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Join the ORSH Platform
                    </h3>
                    <p className="text-sm text-gray-600">
                      Create your account with detailed information and project associations.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => setShowCreateAccount(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-12 text-sm font-medium transition-colors duration-200"
                  >
                    Create Your Account
                  </Button>
                  
                  <p className="text-xs text-gray-500">
                    Account approval required by BGC administrators
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <EnhancedCreateUserModal
        isOpen={showCreateAccount}
        onClose={() => setShowCreateAccount(false)}
        onCreateUser={handleCreateUser}
        isAdminCreated={false}
      />
    </>
  );
};

export default ModernAuthModal;