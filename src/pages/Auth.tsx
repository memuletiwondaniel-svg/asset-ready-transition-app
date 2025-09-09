import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, AlertCircle, Building2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const AuthPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation for signup
    if (authMode === 'signup') {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (authMode === 'login' && !formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please check your credentials.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Welcome back!');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('An account with this email already exists. Please sign in instead.');
          setAuthMode('login');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Please check your email to confirm your account.');
        setAuthMode('login');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setErrors({ email: 'Email is required for password reset' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset email sent. Please check your inbox.');
        setAuthMode('login');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        toast.error('Google sign-in failed. Please try again.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  const handleBGCSignIn = async () => {
    try {
      // This would use a custom OAuth provider configured in Supabase for BGC SSO
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure' as any, // BGC would typically use Azure AD or similar
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'openid profile email',
        }
      });

      if (error) {
        toast.error('BGC SSO sign-in failed. Please contact your IT administrator.');
      }
    } catch (error) {
      toast.error('BGC SSO is not configured. Please use regular sign-in or contact support.');
    }
  };

  const handleKentSignIn = async () => {
    try {
      // This would use a custom OAuth provider configured in Supabase for Kent SSO
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure' as any, // Kent would typically use their own Azure AD or OAuth provider
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'openid profile email',
        }
      });

      if (error) {
        toast.error('Kent SSO sign-in failed. Please contact your IT administrator.');
      }
    } catch (error) {
      toast.error('Kent SSO is not configured. Please use regular sign-in or contact support.');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      {/* Floating Particles Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" 
                 style={{ animationDelay: `${Math.random() * 2}s` }} />
          </div>
        ))}
      </div>

      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-r from-accent/20 to-primary/20 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative group">
            <img 
              src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
              alt="BGC Logo" 
              className="h-16 w-auto mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" 
            />
            <div className="absolute inset-0 rounded-full bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg" />
          </div>
          <h1 className="text-3xl font-bold text-foreground animate-slide-in-right">
            Welcome to ORSH
            <Sparkles className="inline-block ml-2 h-6 w-6 text-primary animate-pulse" />
          </h1>
          <p className="text-muted-foreground mt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Basrah Gas Company Operations Platform
          </p>
        </div>

        <Card className="shadow-lg backdrop-blur-sm bg-card/95 border-2 hover:border-primary/20 transition-all duration-300 animate-scale-in group">
          <CardHeader className="space-y-1 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-lg" />
            <CardTitle className="text-2xl text-center relative z-10 transition-colors duration-300 group-hover:text-primary">
              {authMode === 'login' ? 'Sign In' : 
               authMode === 'signup' ? 'Create Account' : 'Reset Password'}
            </CardTitle>
            <CardDescription className="text-center relative z-10">
              {authMode === 'login' ? 'Enter your credentials to access ORSH' :
               authMode === 'signup' ? 'Fill in your details to create an account' :
               'Enter your email to reset your password'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@bgc.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.email && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errors.email}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errors.password}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setAuthMode('reset')}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button type="submit" className="w-full group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/25 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary" disabled={isLoading}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2 relative z-10" />
                        <span className="relative z-10">Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative z-10">Sign In</span>
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 relative z-10" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                      {errors.firstName && (
                        <p className="text-sm text-destructive">{errors.firstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        disabled={isLoading}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signupEmail"
                        type="email"
                        placeholder="your.email@bgc.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.email && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errors.email}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signupPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-secondary/25 bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary border border-secondary/20 hover:border-secondary/40" disabled={isLoading}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2 relative z-10" />
                        <span className="relative z-10">Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative z-10">Create Account</span>
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 relative z-10" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {authMode === 'reset' && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="your.email@bgc.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errors.email}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <Button type="submit" className="w-full group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-accent/25 bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent border border-accent/20 hover:border-accent/40" disabled={isLoading}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2 relative z-10" />
                      <span className="relative z-10">Sending...</span>
                    </>
                  ) : (
                    <>
                      <span className="relative z-10">Send Reset Link</span>
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 relative z-10" />
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-sm text-primary hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {authMode === 'login' && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={handleBGCSignIn}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white border-slate-800 hover:border-slate-900 group transition-all duration-300 hover:scale-105 hover:shadow-lg relative overflow-hidden"
                    disabled={isLoading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-700/0 via-slate-500/20 to-slate-700/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <img 
                      src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                      alt="BGC Logo" 
                      className="mr-2 h-4 w-4 object-contain relative z-10 transition-transform duration-300 group-hover:scale-110" 
                    />
                    <span className="relative z-10">Continue with BGC</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={handleKentSignIn}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700 group transition-all duration-300 hover:scale-105 hover:shadow-lg relative overflow-hidden"
                    disabled={isLoading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-300/20 to-orange-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <img 
                      src="/lovable-uploads/a38e7106-c33c-4a6c-9cf7-1a84ce322f21.png" 
                      alt="Kent Logo" 
                      className="mr-2 h-4 w-4 object-contain relative z-10 transition-transform duration-300 group-hover:scale-110" 
                    />
                    <span className="relative z-10">Continue with Kent</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={handleGoogleSignIn}
                    className="w-full group transition-all duration-300 hover:scale-105 hover:shadow-md"
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.6s' }}>
              By signing in, you agree to our{' '}
              <span className="text-primary hover:underline cursor-pointer transition-colors duration-200">Terms of Service</span>
              {' '}and{' '}
              <span className="text-primary hover:underline cursor-pointer transition-colors duration-200">Privacy Policy</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;