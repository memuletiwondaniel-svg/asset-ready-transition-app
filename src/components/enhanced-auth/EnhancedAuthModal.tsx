import React, { useEffect, useState } from 'react';
import { Dialog, DialogContentNoOverlay, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, AlertTriangle, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { TwoFactorVerifyModal } from '@/components/user-management/TwoFactorVerifyModal';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTenantSSOConfigPublic } from '@/hooks/useTenantSSOConfig';
import EnhancedRegistrationForm from '@/components/user-management/EnhancedRegistrationForm';
import OrshLogo from '@/components/ui/OrshLogo';
import { GulfGasMark, EpcmMark } from './SsoMarks';
import { ArrowRight } from 'lucide-react';

interface EnhancedAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

const OrDivider = () => (
  <div className="flex items-center gap-3 my-1">
    <div className="flex-1 h-px bg-[#ece9e2]" />
    <span className="text-xs text-gray-400 lowercase">or</span>
    <div className="flex-1 h-px bg-[#ece9e2]" />
  </div>
);

const inputCls =
  "pl-10 h-11 text-sm rounded-[10px] border border-[#e6e4de] bg-[#fafaf8] text-gray-900 placeholder:text-gray-400 focus-visible:border-[#2563eb] focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] transition-all";

const ssoBtnCls =
  "w-full h-11 text-sm font-medium rounded-[10px] bg-white border border-[#e6e4de] text-gray-800 shadow-none transition-all duration-150 ease-out hover:bg-[#f7f8fa] hover:border-[#c7ccd2] hover:shadow-[0_4px_10px_rgba(0,0,0,0.06)] hover:-translate-y-px active:translate-y-0 active:shadow-none";

const EnhancedAuthModal: React.FC<EnhancedAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated
}) => {
  const { signIn, signUp, signInWithSSO, resetPassword, complete2FA, cancel2FA } = useAuth();
  const { subdomainTenant, tenantMismatch } = useTenantContext();
  const [show2FA, setShow2FA] = useState(false);
  const { ssoConfig } = useTenantSSOConfigPublic(subdomainTenant?.id ?? null);
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Modal mount/unmount + transition states for a premium open/close animation
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    let enterTimer: ReturnType<typeof setTimeout>;
    let exitTimer: ReturnType<typeof setTimeout>;
    if (isOpen) {
      setIsVisible(true);
      setIsEntered(false);
      enterTimer = setTimeout(() => setIsEntered(true), 30);
    } else {
      setIsEntered(false);
      exitTimer = setTimeout(() => setIsVisible(false), 220);
    }
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [isOpen]);

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', fullName: '',
    company: '', jobTitle: '', department: '', phoneNumber: ''
  });
  const [resetEmail, setResetEmail] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginFailed(false);
    const { error, requires2FA } = await signIn(signInData.email, signInData.password, rememberMe);
    if (!error) {
      if (requires2FA) {
        setShow2FA(true);
      } else {
        onAuthenticated();
        onClose();
      }
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
    const userData = { ...signUpData, fullName: `${signUpData.firstName} ${signUpData.lastName}` };
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

  const hasSSOButtons = !!ssoConfig || !ssoConfig; // always true — fallback buttons shown

  return (
    <Dialog open={isVisible} onOpenChange={onClose}>
      <DialogContentNoOverlay className="max-w-none max-h-none w-screen h-screen p-0 bg-transparent border-none shadow-none overflow-hidden [&>button]:hidden data-[state=open]:animate-none data-[state=closed]:animate-none" aria-describedby="enhanced-auth-description">
        <DialogHeader className="sr-only">
          <DialogTitle>Authentication</DialogTitle>
          <DialogDescription id="enhanced-auth-description">Sign in or register</DialogDescription>
        </DialogHeader>

        <div
          className={`absolute inset-0 z-[5] bg-black/25 backdrop-blur-[1px] motion-safe:transition-opacity motion-safe:ease-out motion-reduce:transition-opacity motion-reduce:duration-300 ${isEntered ? 'motion-safe:duration-modal-backdrop' : 'motion-safe:duration-modal-close'} ${isEntered ? 'motion-safe:opacity-100 motion-reduce:opacity-100' : 'motion-safe:opacity-0 motion-reduce:opacity-0'}`}
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="w-screen h-screen flex items-center justify-start p-4 md:pl-[6vw] lg:pl-[8vw] relative z-10 pointer-events-none">
          <div className="w-full max-w-[360px] relative z-10 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className={`rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.18)] p-8 relative overflow-hidden bg-white supports-[backdrop-filter]:bg-white/[0.96] supports-[backdrop-filter]:backdrop-blur-[12px] [-webkit-backdrop-filter:blur(12px)] motion-safe:transition-all motion-safe:ease-modal-in motion-reduce:transition-opacity motion-reduce:duration-300 will-change-transform ${isEntered ? 'motion-safe:duration-[340ms]' : 'motion-safe:duration-200'} ${isEntered ? 'motion-safe:opacity-100 motion-safe:scale-100 motion-safe:translate-y-0 motion-reduce:opacity-100' : 'motion-safe:opacity-0 motion-safe:scale-[0.92] motion-safe:translate-y-[14px] motion-reduce:opacity-0'}`}>

              <div className="relative z-10">
                {/* Header — logo centered + single muted welcome line */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    {subdomainTenant?.logo_url ? (
                      <img src={subdomainTenant.logo_url} alt={subdomainTenant.name} className="h-12 w-auto" />
                    ) : (
                      <OrshLogo className="h-12 w-auto text-gray-900" />
                    )}
                  </div>
                  {activeTab === 'reset' ? (
                    <p className="text-gray-500 text-[13px]">Reset your password</p>
                  ) : (
                    <p className="whitespace-nowrap" style={{ color: '#9aa0a8', fontSize: '12.5px' }}>
                      Welcome back — access your ORSH workspace.
                    </p>
                  )}
                </div>

                {/* Tenant mismatch warning */}
                {tenantMismatch && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Your account belongs to a different organization. Please use the correct portal.</span>
                  </div>
                )}

                <div className="space-y-4">
                  {activeTab === 'reset' ? (
                    resetEmailSent ? (
                      <div className="text-center space-y-4 py-6">
                        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                          <Mail className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="text-base font-semibold">Check Your Email</h3>
                        <p className="text-sm text-muted-foreground">
                          We've sent reset instructions to <strong>{resetEmail}</strong>
                        </p>
                        <Button
                          variant="outline"
                          size="default"
                          onClick={() => { setActiveTab('signin'); setResetEmailSent(false); setResetEmail(''); }}
                          className="w-full h-10 text-sm"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back to Sign In
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="your.email@company.com"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              className="pl-10 h-10 text-sm border-border bg-input"
                              required
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-10 text-sm font-semibold" disabled={loading}>
                          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Reset Link'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="default"
                          onClick={() => { setActiveTab('signin'); setResetEmail(''); }}
                          className="w-full h-10 text-sm"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back to Sign In
                        </Button>
                      </form>
                    )
                  ) : (
                    <>
                      {/* ===== SSO BUTTONS FIRST (Enterprise Priority) ===== */}
                      {ssoConfig ? (
                        <div className="space-y-2">
                          <Button 
                            onClick={() => handleSSO(ssoConfig.supabase_sso_provider_id || 'saml')} 
                            disabled={loading} 
                            variant="outline"
                            className={ssoBtnCls}
                          >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="w-4 h-4 mr-2 text-gray-500" />}
                            {ssoConfig.button_label || 'Sign in with SSO'}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            onClick={() => handleSSO('azure')}
                            disabled={loading}
                            variant="outline"
                            className={ssoBtnCls}
                          >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                              <GulfGasMark className="w-5 h-5 mr-2" />
                            )}
                            Continue with Gulf Gas
                          </Button>
                          <Button
                            onClick={() => handleSSO('google')}
                            disabled={loading}
                            variant="outline"
                            className={ssoBtnCls}
                          >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                              <EpcmMark className="w-5 h-5 mr-2" />
                            )}
                            Continue with EPCM
                          </Button>
                        </div>
                      )}

                      {/* ===== OR DIVIDER ===== */}
                      <OrDivider />

                      {/* ===== EMAIL/PASSWORD FORM ===== */}

                      {/* Inline error banner */}
                      {loginFailed && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm" role="alert" id="login-error">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Invalid email or password. Please try again.</span>
                        </div>
                      )}

                      <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="signin-email" className="uppercase tracking-wider" style={{ color: '#aab0b8', fontSize: '11px', fontWeight: 500 }}>Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="signin-email"
                              type="email"
                              placeholder="your.email@company.com"
                              value={signInData.email}
                              onChange={e => { setSignInData({ ...signInData, email: e.target.value }); setLoginFailed(false); }}
                              className={inputCls}
                              required
                              aria-invalid={loginFailed}
                              aria-describedby={loginFailed ? 'login-error' : undefined}
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="signin-password" className="uppercase tracking-wider" style={{ color: '#aab0b8', fontSize: '11px', fontWeight: 500 }}>Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="signin-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter your password"
                              value={signInData.password}
                              onChange={e => { setSignInData({ ...signInData, password: e.target.value }); setLoginFailed(false); }}
                              className={`${inputCls} pr-10`}
                              required
                              aria-invalid={loginFailed}
                              aria-describedby={loginFailed ? 'login-error' : undefined}
                              disabled={loading}
                            />
                            {signInData.password.length > 0 && (
                              <button 
                                type="button" 
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" 
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="remember-me"
                              checked={rememberMe}
                              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                              className="h-4 w-4 border-gray-300 data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400 data-[state=checked]:text-white"
                            />
                            <Label htmlFor="remember-me" className="text-sm text-gray-600 cursor-pointer">
                              Remember me
                            </Label>
                          </div>
                          <Button variant="link" className="p-0 h-auto text-[#2563eb] hover:text-[#1d4ed8] text-sm" onClick={() => setActiveTab('reset')}>
                            Forgot password?
                          </Button>
                        </div>

                        <Button
                          type="submit"
                          className="group w-full h-[46px] text-sm font-medium rounded-[10px] bg-[#0c0f16] hover:bg-[#0c0f16] text-white shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-150 ease-out disabled:opacity-100 disabled:bg-[#0c0f16]/40 disabled:hover:bg-[#0c0f16]/40 disabled:cursor-not-allowed disabled:shadow-lg disabled:translate-y-0"
                          disabled={loading || !signInData.email.trim() || !signInData.password}
                        >
                          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : (
                            <span className="inline-flex items-center justify-center gap-2">
                              Sign in
                              <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-[3px]" />
                            </span>
                          )}
                        </Button>
                      </form>

                      {/* Register link */}
                      <div className="text-center text-sm text-gray-600 pt-3">
                        New to ORSH?{' '}
                        <Button variant="link" className="p-0 h-auto text-[#2563eb] hover:text-[#1d4ed8] text-sm font-medium" onClick={() => setShowRegistrationForm(true)}>
                          Create your account
                        </Button>
                      </div>

                      {/* Terms */}
                      <div className="text-center text-xs text-gray-400 pt-2">
                        By signing in, you agree to our{' '}
                        <Button variant="link" className="p-0 h-auto text-gray-500 hover:text-gray-700 text-xs underline">Terms</Button>{' '}
                        and{' '}
                        <Button variant="link" className="p-0 h-auto text-gray-500 hover:text-gray-700 text-xs underline">Privacy Policy</Button>
                      </div>

                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContentNoOverlay>
      
      <EnhancedRegistrationForm
        isOpen={showRegistrationForm}
        onClose={() => setShowRegistrationForm(false)}
        onSuccess={() => { setShowRegistrationForm(false); setActiveTab('signin'); }}
        isAdminCreated={false}
      />

      <TwoFactorVerifyModal
        open={show2FA}
        onVerified={() => {
          setShow2FA(false);
          complete2FA();
          onAuthenticated();
          onClose();
        }}
        onCancel={async () => {
          setShow2FA(false);
          await cancel2FA();
        }}
      />
    </Dialog>
  );
};

export default EnhancedAuthModal;