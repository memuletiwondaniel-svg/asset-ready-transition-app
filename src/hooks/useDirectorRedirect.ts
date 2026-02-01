import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

// The 8 director roles that should auto-redirect to My Tasks
const DIRECTOR_ROLE_PATTERNS = [
  'P&E Director',
  'P&M Director',
  'HSSE Director',
  'BNGL Director',
  'CS Director',
  'UQ Director',
  'KAZ Director',
  'NRNGL Director',
];

/**
 * Hook that automatically redirects directors to My Tasks page after login.
 * Only triggers once per session to avoid redirect loops.
 */
export const useDirectorRedirect = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only run once per session and only if we have a user
    if (!user?.id || hasRedirected.current) return;
    
    // Skip if already on my-tasks
    if (location.pathname === '/my-tasks') {
      hasRedirected.current = true;
      return;
    }

    const checkDirectorAndRedirect = async () => {
      try {
        // Get user's role from profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profile?.role) return;

        // Get the role name
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('name')
          .eq('id', profile.role)
          .single();

        if (roleError || !role?.name) return;

        // Check if role name matches any director pattern
        const isDirector = DIRECTOR_ROLE_PATTERNS.some(
          pattern => role.name.toLowerCase() === pattern.toLowerCase()
        );

        if (isDirector) {
          hasRedirected.current = true;
          navigate('/my-tasks', { replace: true });
        }
      } catch (error) {
        console.error('Error checking director status:', error);
      }
    };

    checkDirectorAndRedirect();
  }, [user?.id, navigate, location.pathname]);
};
