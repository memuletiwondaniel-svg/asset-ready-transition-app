import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInWithSSO: (provider: string) => Promise<{ error: any }>;
  updateProfile: (updates: any) => Promise<{ error: any }>;
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
            } catch (error) {
              console.error('Failed to track login:', error);
            }
          }, 0);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
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
              await supabase.rpc('track_failed_login', {
                user_uuid: profileData.user_id
              });
            }
          } catch (e) {
            console.error('Failed to track failed login:', e);
          }
        }
        toast.error(error.message);
        return { error };
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
      // For demo purposes, simulate SSO login
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