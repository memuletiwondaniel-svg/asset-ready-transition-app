import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight, Star } from 'lucide-react';
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
          className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-muted/30"
        >
          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-full shadow-elevation-3 flex items-center justify-center">
                <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </div>

            {/* Login Card */}
            <div className="fluent-card bg-card/80 backdrop-blur-xl rounded-2xl shadow-elevation-4 p-8 border border-border/30 relative overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-card/50 via-transparent to-accent/5 pointer-events-none" />

              {/* Sign In Header */}
              <div className="text-center mb-8 relative z-10">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-2">
                  Welcome Back
                </h2>
                <p className="text-muted-foreground text-sm font-medium">
                  Sign in to continue to ORSH
                </p>
              </div>

              <div className="space-y-6 relative z-10">
                  {/* Email/Password Sign In */}
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-3">
                      <Label htmlFor="signin-email" className="text-foreground font-semibold text-sm">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="your.email@bgc.com"
                          value={signInData.email}
                          onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                          className="pl-12 h-12 text-sm border-2 border-border bg-input/50 backdrop-blur-sm rounded-xl transition-all duration-300 hover:border-primary/30 focus:border-primary focus:shadow-elevation-2 focus:bg-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="signin-password" className="text-foreground font-semibold text-sm">Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={signInData.password}
                          onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                          className="pl-12 pr-12 h-12 text-sm border-2 border-border bg-input/50 backdrop-blur-sm rounded-xl transition-all duration-300 hover:border-primary/30 focus:border-primary focus:shadow-elevation-2 focus:bg-input"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 px-0 hover:bg-muted/50 rounded-lg transition-colors"
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
                      className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground rounded-xl shadow-elevation-2 hover:shadow-elevation-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          <span>Signing in...</span>
                        </div>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-wider">
                      <span className="bg-card/80 px-4 py-1 text-muted-foreground font-medium rounded-full backdrop-blur-sm">
                        OR CONTINUE WITH
                      </span>
                    </div>
                  </div>

                  {/* SSO Buttons */}
                  <div className="space-y-4">
                    <Button
                      onClick={() => handleSSO('azure')}
                      disabled={loading}
                      className="w-full h-12 text-sm font-semibold bg-bgc text-bgc-foreground hover:bg-bgc/90 rounded-xl border border-bgc/20 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
                    >
                      <img 
                        src="/lovable-uploads/6e3cd7e2-9a08-4d20-88f7-d3a2ab9f4f7b.png" 
                        alt="BGC Logo" 
                        className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-110"
                      />
                      Continue with BGC
                    </Button>
                    
                    <Button
                      onClick={() => handleSSO('google')}
                      disabled={loading}
                      className="w-full h-12 text-sm font-semibold bg-kent text-kent-foreground hover:bg-kent/90 rounded-xl border border-kent/20 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
                    >
                      <img 
                        src="/lovable-uploads/dc6cee89-84f7-416a-b996-ec5cbb00d683.png" 
                        alt="Kent Logo" 
                        className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-110"
                      />
                      Continue with Kent
                    </Button>
                  </div>

                  {/* New to ORSH Text */}
                  <div className="text-center text-sm text-muted-foreground mt-6">
                    New to ORSH?{' '}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-primary text-sm font-medium"
                      onClick={() => setShowRegistrationForm(true)}
                    >
                      Create your account
                    </Button>
                  </div>

                  {/* Terms */}
                  <div className="text-center text-xs text-muted-foreground mt-4">
                    By signing in, you agree to our{' '}
                    <Button variant="link" className="p-0 h-auto text-primary text-xs">
                      Terms of Service
                    </Button>{' '}
                    and{' '}
                    <Button variant="link" className="p-0 h-auto text-primary text-xs">
                      Privacy Policy
                    </Button>
                  </div>
                </div>
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