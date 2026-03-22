import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  pending2FA: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any; requires2FA?: boolean }>;
  signUp: (userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInWithSSO: (provider: string) => Promise<{ error: any }>;
  updateProfile: (updates: any) => Promise<{ error: any }>;
  complete2FA: () => void;
  cancel2FA: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Track login activity
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            try {
              await supabase.rpc('track_user_login', {
                user_uuid: session.user.id,
                session_data: {
                  event,
                  timestamp: new Date().toISOString(),
                  user_agent: navigator.userAgent
                }
              });
              // Audit log: successful login
              await supabase.from('audit_logs').insert({
                user_id: session.user.id,
                user_email: session.user.email,
                category: 'auth',
                action: 'login',
                severity: 'info',
                description: 'User signed in successfully',
                metadata: { user_agent: navigator.userAgent },
              });
            } catch (error) {
              console.error('Failed to track login:', error);
            }
          }, 0);
        }
        
        if (event === 'SIGNED_OUT') {
          setTimeout(async () => {
            try {
              await supabase.from('audit_logs').insert({
                category: 'auth',
                action: 'logout',
                severity: 'info',
                description: 'User signed out',
              });
            } catch {
              // Silent fail - user is signing out
            }
          }, 0);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session and handle remember me preference
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Check if there's a session but no rememberMe flag in sessionStorage
      const rememberMeFlag = sessionStorage.getItem('rememberMe');
      
      if (session && rememberMeFlag === 'false') {
        // User didn't check remember me, so sign them out on new browser session
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      // Check if account is locked BEFORE attempting sign-in
      try {
        const { data: lockStatus } = await supabase.rpc('check_account_lockout', {
          user_email: email,
        });

        const lockData = lockStatus as any;
        if (lockData && lockData.locked) {
          const remainingMin = Math.ceil((lockData.remaining_seconds || 0) / 60);
          const message = `Account is locked due to too many failed attempts. Try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`;
          toast.error(message);
          return { error: { message } };
        }
      } catch {
        // If check fails, allow the attempt (fail-open for the check only)
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Track failed login attempt
        if (error.message.includes('Invalid login credentials')) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('email', email)
              .single();
            
            if (profileData) {
              const { data: trackResult } = await supabase.rpc('track_failed_login', {
                user_uuid: profileData.user_id
              });

              const tr = trackResult as any;
              // Show remaining attempts warning
              if (tr && !tr.locked && tr.remaining > 0 && tr.remaining <= 3) {
                toast.warning(`Invalid credentials. ${tr.remaining} attempt${tr.remaining !== 1 ? 's' : ''} remaining before lockout.`);
              } else if (tr && tr.locked) {
                const lockMin = Math.ceil((tr.locked_until ? 
                  (new Date(tr.locked_until).getTime() - Date.now()) / 60000 : 30));
                toast.error(`Account locked after ${tr.max_attempts} failed attempts. Try again in ${lockMin} minutes.`);
                return { error };
              }
            }
            // Audit log: failed login
            await supabase.from('audit_logs').insert({
              user_email: email,
              category: 'auth',
              action: 'login_failed',
              severity: 'warning',
              description: 'Failed login attempt for ' + email,
              metadata: { reason: error.message, user_agent: navigator.userAgent },
            });
          } catch (e) {
            console.error('Failed to track failed login:', e);
          }
        }
        toast.error(error.message);
        return { error };
      }

      // Store remember me preference
      if (rememberMe) {
        sessionStorage.removeItem('rememberMe');
        localStorage.setItem('rememberMe', 'true');
      } else {
        sessionStorage.setItem('rememberMe', 'false');
        localStorage.removeItem('rememberMe');
      }

      toast.success('Successfully signed in!');
      return { error: null };
    } catch (err: any) {
      console.error('Sign in error:', err);
      toast.error('Unable to sign in. Please try again.');
      return { error: err };
    }
  };

  const signUp = async (userData: any) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: userData.fullName,
            first_name: userData.firstName,
            last_name: userData.lastName,
            company: userData.company,
            job_title: userData.jobTitle,
            department: userData.department,
            phone_number: userData.phoneNumber
          }
        }
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Registration successful! Please check your email for verification.');
      return { error: null };
    } catch (error: any) {
      toast.error('An unexpected error occurred during registration');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Successfully signed out');
      }
    } catch (error: any) {
      toast.error('Error signing out');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Password reset email sent!');
      return { error: null };
    } catch (error: any) {
      toast.error('Error sending password reset email');
      return { error };
    }
  };

  const signInWithSSO = async (provider: string) => {
    try {
      // Check if this is a Supabase SAML SSO provider ID (UUID format)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(provider);
      
      if (isUUID || provider === 'saml') {
        // Real SAML SSO via Supabase
        const ssoParams: any = {
          options: {
            redirectTo: `${window.location.origin}/`
          }
        };
        
        if (isUUID) {
          ssoParams.providerId = provider;
        }
        
        const { data, error } = await supabase.auth.signInWithSSO(ssoParams);

        if (error) {
          toast.error(error.message || 'SSO authentication failed');
          return { error };
        }

        // Redirect to IdP login page
        if (data?.url) {
          window.location.href = data.url;
        }

        return { error: null };
      }

      // Legacy demo SSO for BGC/Kent buttons
      if (provider === 'azure' || provider === 'google') {
        const mockUser = {
          id: 'sso-user-id',
          email: 'user@company.com',
          user_metadata: {
            full_name: provider === 'azure' ? 'BGC User' : 'Kent User',
            provider: provider
          }
        };
        
        setUser(mockUser as any);
        setSession({
          access_token: 'mock-sso-token',
          refresh_token: 'mock-refresh-token',
          user: mockUser,
          expires_at: Date.now() + 3600000,
          expires_in: 3600,
          token_type: 'bearer'
        } as any);
        
        toast.success(`Successfully signed in with ${provider === 'azure' ? 'BGC' : 'Kent'}!`);
        return { error: null };
      }

      // Fallback to real OAuth for other providers
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      toast.error('SSO authentication failed');
      return { error };
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Profile updated successfully');
      return { error: null };
    } catch (error: any) {
      toast.error('Error updating profile');
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    signInWithSSO,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};