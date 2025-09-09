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
          className="min-h-screen flex items-center justify-center p-4 bg-muted/30"
        >
          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <h1 className="text-3xl font-light text-foreground mb-2">
                Welcome to ORSH
              </h1>
              <p className="text-muted-foreground text-sm font-normal">
                Sign in to your account to continue
              </p>
            </div>

            {/* Login Card */}
            <div className="relative bg-card rounded-xl shadow-sm border border-border p-8">
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-6 right-6 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 rounded-lg p-1 h-11">
                  <TabsTrigger value="signin" className="text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md">Create your Account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-6">
                  {/* Email/Password Sign In */}
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium text-foreground">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="Enter your email"
                          value={signInData.email}
                          onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                          className="pl-10 h-11 text-sm bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={signInData.password}
                          onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                          className="pl-10 pr-10 h-11 text-sm bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="remember"
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                        />
                        <Label htmlFor="remember" className="text-sm text-muted-foreground">
                          Keep me signed in
                        </Label>
                      </div>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-primary text-sm font-medium hover:underline"
                        onClick={() => setActiveTab('reset')}
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200" 
                      disabled={loading}
                    >
                      {loading ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-4 text-muted-foreground font-medium">
                        or continue with
                      </span>
                    </div>
                  </div>

                  {/* SSO Buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={() => handleSSO('azure')}
                      disabled={loading}
                      variant="outline"
                      className="w-full h-11 text-sm font-medium bg-background hover:bg-muted/50 border-border transition-colors duration-200"
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
                      variant="outline"
                      className="w-full h-11 text-sm font-medium bg-background hover:bg-muted/50 border-border transition-colors duration-200"
                    >
                      <img 
                        src="/lovable-uploads/9104f3e3-ab82-4f30-acff-da61a68da7e0.png" 
                        alt="Kent Logo" 
                        className="w-5 h-5 mr-3"
                      />
                      Continue with Kent
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="signup" className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-foreground">Create your account</h3>
                      <p className="text-sm text-muted-foreground">
                        Get started with ORSH by creating your account
                      </p>
                    </div>
                    <Button 
                      className="w-full h-11 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200" 
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