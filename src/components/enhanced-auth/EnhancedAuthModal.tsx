import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight, Star, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import EnhancedRegistrationForm from '@/components/user-management/EnhancedRegistrationForm';
import OrshLogo from '@/components/ui/OrshLogo';
import BackgroundSlideshow from '@/components/BackgroundSlideshow';
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
  const {
    signIn,
    signUp,
    signInWithSSO,
    resetPassword
  } = useAuth();
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
    const {
      error
    } = await signIn(signInData.email, signInData.password, rememberMe);
    if (!error) {
      onAuthenticated();
      onClose();
      setLoginFailed(false);
    } else {
      setLoginFailed(true);
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
    const {
      error
    } = await signUp(userData);
    if (!error) {
      setActiveTab('signin');
    }
    setLoading(false);
  };
  const handleSSO = async (provider: string) => {
    setLoading(true);
    const {
      error
    } = await signInWithSSO(provider);
    if (!error) {
      onAuthenticated();
      onClose();
    }
    setLoading(false);
  };
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      error
    } = await resetPassword(resetEmail);
    if (!error) {
      setResetEmailSent(true);
    }
    setLoading(false);
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none max-h-none w-screen h-screen p-0 bg-transparent border-none shadow-none overflow-hidden" aria-describedby="enhanced-auth-description">
        <DialogHeader className="sr-only">
          <DialogTitle>Authentication</DialogTitle>
          <DialogDescription id="enhanced-auth-description">Sign in or register</DialogDescription>
        </DialogHeader>
        
        {/* ORSH Background Slideshow */}
        <BackgroundSlideshow showFunFacts={false} />
        
        <div className="w-screen h-screen flex items-center justify-center p-4 relative z-10">
          
          <div className="w-full max-w-xs relative z-10">
            {/* Modern Fluent Design Card */}
            <div className="bg-card/80 backdrop-blur-2xl rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] border border-border/20 p-5 relative overflow-hidden transition-all duration-500 hover:shadow-[0_40px_80px_-12px_rgba(0,0,0,0.3)] hover:bg-card/85">
              {/* Close Button */}
              <Button onClick={onClose} variant="ghost" size="sm" className="absolute top-3 right-3 z-20 w-7 h-7 p-0 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors duration-200">
                <X className="h-3.5 w-3.5" />
              </Button>
              
              {/* Fluent Design Acrylic Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-card/40 to-accent/6 rounded-2xl"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-background/5 to-foreground/3 rounded-2xl"></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Sign In Header */}
                <div className="text-center mb-4">
                  <div className="flex justify-center mb-2">
                    <OrshLogo className="h-10 w-auto" />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {activeTab === 'reset' ? 'Reset your password' : 'Sign in to your ORSH account'}
                  </p>
                </div>

              <div className="space-y-3">
                  {activeTab === 'reset' ? (
                    /* Password Reset Form */
                    resetEmailSent ? (
                      <div className="text-center space-y-3 py-4">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold">Check Your Email</h3>
                        <p className="text-xs text-muted-foreground">
                          We've sent reset instructions to <strong>{resetEmail}</strong>
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveTab('signin');
                            setResetEmailSent(false);
                            setResetEmail('');
                          }}
                          className="w-full h-8 text-xs"
                        >
                          <ArrowLeft className="mr-1.5 h-3 w-3" />
                          Back to Sign In
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handlePasswordReset} className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="reset-email" className="text-xs font-medium">
                            Email Address
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="your.email@bgc.com"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              className="pl-9 h-8 text-xs border-border bg-input"
                              required
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-8 text-xs font-semibold bg-gradient-to-r from-primary to-primary-hover text-primary-foreground"
                          disabled={loading}
                        >
                          {loading ? 'Sending...' : 'Send Reset Link'}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveTab('signin');
                            setResetEmail('');
                          }}
                          className="w-full h-8 text-xs"
                        >
                          <ArrowLeft className="mr-1.5 h-3 w-3" />
                          Back to Sign In
                        </Button>
                      </form>
                    )
                  ) : (
                  /* Email/Password Sign In */
                  <form onSubmit={handleSignIn} className="space-y-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="signin-email" className="text-xs font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                        <Input id="signin-email" type="email" placeholder="your.email@bgc.com" value={signInData.email} onChange={e => setSignInData({
                        ...signInData,
                        email: e.target.value
                      })} className="pl-9 h-8 text-xs border-border bg-input" required />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="signin-password" className="text-xs font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={signInData.password} onChange={e => setSignInData({
                        ...signInData,
                        password: e.target.value
                      })} className="pl-9 pr-9 h-8 text-xs border-border bg-input" required />
                        <button 
                          type="button" 
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" 
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Checkbox
                          id="remember-me"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                          className="h-3.5 w-3.5"
                        />
                        <Label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer">
                          Remember me
                        </Label>
                      </div>
                      <Button variant="link" className="p-0 h-auto text-primary text-xs" onClick={() => setActiveTab('reset')}>
                        Forgot password?
                      </Button>
                    </div>

                    <Button type="submit" className="w-full h-9 text-xs font-semibold bg-gradient-to-r from-primary to-primary-hover text-primary-foreground
                                 shadow-lg hover:shadow-xl transition-all duration-300 ease-out
                                 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]
                                 border border-primary/20 hover:border-primary/40
                                 relative overflow-hidden group" disabled={loading}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In'}</span>
                    </Button>
                  </form>
                  )}

                  {activeTab === 'signin' && (
                    <>
                      {/* SSO Buttons */}
                  <div className="space-y-2 pt-1">
                    <Button onClick={() => handleSSO('azure')} disabled={loading} className="w-full h-8 text-xs font-semibold bg-muted/40 text-muted-foreground 
                                 hover:bg-gradient-to-r hover:from-bgc hover:to-bgc/90 hover:text-bgc-foreground
                                 shadow-sm hover:shadow-lg transition-all duration-300 ease-out
                                 hover:scale-[1.02] active:scale-[0.98]
                                 border border-border/40 hover:border-bgc/40
                                 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <div className="relative z-10 flex items-center justify-center">
                        <img src="/lovable-uploads/6e3cd7e2-9a08-4d20-88f7-d3a2ab9f4f7b.png" alt="BGC Logo" className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-all duration-300" />
                        Continue with BGC
                      </div>
                    </Button>
                    
                    <Button onClick={() => handleSSO('google')} disabled={loading} className="w-full h-8 text-xs font-semibold bg-muted/40 text-muted-foreground 
                                 hover:bg-gradient-to-r hover:from-kent hover:to-kent/90 hover:text-kent-foreground
                                 shadow-sm hover:shadow-lg transition-all duration-300 ease-out
                                 hover:scale-[1.02] active:scale-[0.98]
                                 border border-border/40 hover:border-kent/40
                                 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <div className="relative z-10 flex items-center justify-center">
                        <img src="/lovable-uploads/dc6cee89-84f7-416a-b996-ec5cbb00d683.png" alt="Kent Logo" className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-all duration-300" />
                        Continue with Kent
                      </div>
                    </Button>
                  </div>

                  {/* New to ORSH Text */}
                  <div className="text-center text-xs text-muted-foreground pt-2">
                    New to ORSH?{' '}
                    <Button variant="link" className="p-0 h-auto text-primary text-xs font-medium" onClick={() => setShowRegistrationForm(true)}>
                      Create your account
                    </Button>
                  </div>

                  {/* Terms */}
                  <div className="text-center text-[10px] text-muted-foreground pt-1">
                    By signing in, you agree to our{' '}
                    <Button variant="link" className="p-0 h-auto text-primary text-[10px]">
                      Terms
                    </Button>{' '}
                    and{' '}
                    <Button variant="link" className="p-0 h-auto text-primary text-[10px]">
                      Privacy Policy
                    </Button>
                  </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      <EnhancedRegistrationForm isOpen={showRegistrationForm} onClose={() => setShowRegistrationForm(false)} onSuccess={() => {
      setShowRegistrationForm(false);
      setActiveTab('signin');
    }} isAdminCreated={false} />
    </Dialog>;
};
export default EnhancedAuthModal;