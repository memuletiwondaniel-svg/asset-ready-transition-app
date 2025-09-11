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
      <DialogContent className="max-w-none max-h-none w-screen h-screen p-0 bg-transparent border-none shadow-none overflow-hidden">
        <div 
          className="w-screen h-screen flex items-center justify-center p-4 relative fixed inset-0 overflow-hidden"
          style={{
            background: `
              radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.15) 0%, transparent 40%),
              radial-gradient(circle at 75% 75%, hsl(var(--accent) / 0.12) 0%, transparent 40%),
              radial-gradient(circle at 50% 10%, hsl(var(--secondary) / 0.08) 0%, transparent 30%),
              linear-gradient(135deg, 
                hsl(var(--background)) 0%, 
                hsl(var(--background) / 0.95) 25%,
                hsl(var(--primary) / 0.03) 50%,
                hsl(var(--accent) / 0.05) 75%,
                hsl(var(--background) / 0.98) 100%
              )
            `,
          }}
        >
          {/* Dynamic Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating Orbs with Animation */}
            <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/5 w-80 h-80 bg-gradient-to-tl from-accent/15 via-accent/8 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gradient-to-r from-secondary/12 via-secondary/6 to-transparent rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse delay-500"></div>
            
            {/* Geometric Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.02]">
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px'
              }}></div>
            </div>
            
            {/* Flowing Light Streaks */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent transform rotate-45 animate-pulse delay-2000"></div>
            <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-accent/25 to-transparent transform -rotate-45 animate-pulse delay-3000"></div>
            
            {/* Floating Glass Elements */}
            <div className="absolute top-1/6 right-1/4 w-32 h-32 bg-gradient-to-br from-background/20 to-background/5 backdrop-blur-sm rounded-2xl border border-border/10 rotate-12 animate-bounce"></div>
            <div className="absolute bottom-1/4 left-1/6 w-24 h-24 bg-gradient-to-tl from-card/30 to-card/10 backdrop-blur-sm rounded-xl border border-border/15 -rotate-12 animate-bounce delay-1000"></div>
            
            {/* Subtle Particle Effect */}
            <div className="absolute inset-0 opacity-[0.4]">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 3}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
          
          <div className="w-full max-w-sm relative z-10">
            {/* Modern Fluent Design Card */}
            <div className="bg-card/80 backdrop-blur-2xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] border border-border/20 p-8 relative overflow-hidden transition-all duration-500 hover:shadow-[0_40px_80px_-12px_rgba(0,0,0,0.3)] hover:bg-card/85">
              {/* Close Button */}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-20 w-8 h-8 p-0 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <X className="h-4 w-4" />
              </Button>
              
              {/* Fluent Design Acrylic Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-card/40 to-accent/6 rounded-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-background/5 to-foreground/3 rounded-3xl"></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Sign In Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">Welcome back</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Sign in to your ORSH account
                  </p>
                </div>

              <div className="space-y-4">
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
                      <p className="text-xs text-muted-foreground">
                        If you have a functional email, use your personal email to sign in
                      </p>
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
                      className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-primary-hover text-primary-foreground 
                                 shadow-lg hover:shadow-xl transition-all duration-300 ease-out
                                 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]
                                 border border-primary/20 hover:border-primary/40
                                 peer-hover:opacity-50 peer-hover:scale-95 peer-hover:shadow-sm
                                 relative overflow-hidden group" 
                      disabled={loading}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In'}</span>
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
                      className="w-full h-11 text-sm font-semibold bg-muted/40 text-muted-foreground 
                                 hover:bg-gradient-to-r hover:from-bgc hover:to-bgc/90 hover:text-bgc-foreground
                                 shadow-sm hover:shadow-lg transition-all duration-300 ease-out
                                 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]
                                 border border-border/40 hover:border-bgc/40
                                 peer
                                 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <div className="relative z-10 flex items-center justify-center">
                        <img 
                          src="/lovable-uploads/6e3cd7e2-9a08-4d20-88f7-d3a2ab9f4f7b.png" 
                          alt="BGC Logo" 
                          className="w-5 h-5 mr-3 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110"
                        />
                        Continue with BGC
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => handleSSO('google')}
                      disabled={loading}
                      className="w-full h-11 text-sm font-semibold bg-muted/40 text-muted-foreground 
                                 hover:bg-gradient-to-r hover:from-kent hover:to-kent/90 hover:text-kent-foreground
                                 shadow-sm hover:shadow-lg transition-all duration-300 ease-out
                                 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]
                                 border border-border/40 hover:border-kent/40
                                 peer
                                 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <div className="relative z-10 flex items-center justify-center">
                        <img 
                          src="/lovable-uploads/dc6cee89-84f7-416a-b996-ec5cbb00d683.png" 
                          alt="Kent Logo" 
                          className="w-5 h-5 mr-3 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110"
                        />
                        Continue with Kent
                      </div>
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