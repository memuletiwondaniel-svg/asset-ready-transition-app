import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight, Star, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import EnhancedRegistrationForm from '@/components/user-management/EnhancedRegistrationForm';

interface EnhancedAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

const EnhancedAuthModal: React.FC<EnhancedAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated
}) => {
  const { signIn, signUp, signInWithSSO, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // Form states
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    fullName: '',
    company: '',
    jobTitle: '',
    department: '',
    phoneNumber: ''
  });

  const [resetEmail, setResetEmail] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(signInData.email, signInData.password);
    
    if (!error) {
      onAuthenticated();
      onClose();
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpData.password !== signUpData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    
    const userData = {
      ...signUpData,
      fullName: `${signUpData.firstName} ${signUpData.lastName}`
    };

    const { error } = await signUp(userData);
    
    if (!error) {
      setActiveTab('signin');
    }
    
    setLoading(false);
  };

  const handleSSO = async (provider: string) => {
    setLoading(true);
    const { error } = await signInWithSSO(provider);
    
    if (!error) {
      onAuthenticated();
      onClose();
    }
    
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await resetPassword(resetEmail);
    
    if (!error) {
      setResetEmailSent(true);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-0 bg-transparent border-none shadow-none">
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{
            background: 'linear-gradient(135deg, hsl(220, 30%, 97%) 0%, hsl(220, 20%, 95%) 50%, hsl(220, 25%, 92%) 100%)',
          }}
        >
          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome to ORSH
              </h1>
            </div>

            {/* Login Card */}
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6">
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-full p-2"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Sign In Header */}
              <div className="text-center mb-6 mt-2">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign In</h2>
                <p className="text-gray-600 text-sm">
                  Enter your credentials to access ORSH
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-50 rounded-lg p-1">
                  <TabsTrigger value="signin" className="text-sm transition-all duration-200 hover:bg-white data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm transition-all duration-200 hover:bg-white data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  {/* Email/Password Sign In */}
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-foreground font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="your.email@bgc.com"
                          value={signInData.email}
                          onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                          className="pl-11 h-10 text-sm border-border bg-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-foreground font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={signInData.password}
                          onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                          className="pl-11 pr-11 h-10 text-sm border-border bg-input"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-primary text-sm"
                        onClick={() => setActiveTab('reset')}
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-10 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]" 
                      disabled={loading}
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground font-medium">
                        OR CONTINUE WITH
                      </span>
                    </div>
                  </div>

                  {/* SSO Buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={() => handleSSO('azure')}
                      disabled={loading}
                      className="w-full h-10 text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <img 
                        src="/lovable-uploads/3500f340-f92e-4cc2-ac18-cd2d5afacdaf.png" 
                        alt="BGC Logo" 
                        className="w-5 h-5 mr-3"
                      />
                      Continue with BGC
                    </Button>
                    
                    <Button
                      onClick={() => handleSSO('google')}
                      disabled={loading}
                      className="w-full h-10 text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <img 
                        src="/lovable-uploads/9104f3e3-ab82-4f30-acff-da61a68da7e0.png" 
                        alt="Kent Logo" 
                        className="w-5 h-5 mr-3"
                      />
                      Continue with Kent
                    </Button>
                  </div>

                  {/* Terms */}
                  <div className="text-center text-xs text-muted-foreground mt-6">
                    By signing in, you agree to our{' '}
                    <Button variant="link" className="p-0 h-auto text-primary text-xs">
                      Terms of Service
                    </Button>{' '}
                    and{' '}
                    <Button variant="link" className="p-0 h-auto text-primary text-xs">
                      Privacy Policy
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <div className="text-center">
                    <Button 
                      className="w-full h-10 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]" 
                      onClick={() => setShowRegistrationForm(true)}
                    >
                      Create Your Account
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
      
      <EnhancedRegistrationForm
        isOpen={showRegistrationForm}
        onClose={() => setShowRegistrationForm(false)}
        onSuccess={() => {
          setShowRegistrationForm(false);
          setActiveTab('signin');
        }}
        isAdminCreated={false}
      />
    </Dialog>
  );
};

export default EnhancedAuthModal;