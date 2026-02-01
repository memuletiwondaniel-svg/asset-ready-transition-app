import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

// Directors that go straight to My Tasks (SoF focused)
const SOF_DIRECTOR_ROLES = [
  'P&E Director',
  'P&M Director',
  'HSE Director',
  'HSSE Director',
  'BNGL Director',
  'CS Director',
  'UQ Director',
  'KAZ Director',
  'NRNGL Director',
];

// Directors that go to Projects page filtered by their plant
const PLANT_DIRECTOR_ROLES = [
  'Plant Director',
  'Dep. Plant Director',
  'Deputy Plant Director',
];

/**
 * Hook that automatically redirects directors to appropriate pages after login.
 * - P&E, P&M, HSE Directors → /my-tasks (SoF focused)
 * - Plant Directors, Deputy Plant Directors → /projects?plant={their_plant}
 * Only triggers once per session to avoid redirect loops.
 */
export const useDirectorRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only run once per session and only if we have a user
    if (!user?.id || hasRedirected.current) return;
    
    // Skip if already on target pages
    if (location.pathname === '/my-tasks' || location.pathname === '/projects') {
      hasRedirected.current = true;
      return;
    }

    const checkDirectorAndRedirect = async () => {
      try {
        // Get user's role and plant from profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, plant')
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

        // Check if SoF Director → My Tasks
        const isSofDirector = SOF_DIRECTOR_ROLES.some(
          pattern => role.name.toLowerCase() === pattern.toLowerCase()
        );

        if (isSofDirector) {
          hasRedirected.current = true;
          navigate('/my-tasks', { replace: true });
          return;
        }

        // Check if Plant Director → Projects with plant filter
        const isPlantDirector = PLANT_DIRECTOR_ROLES.some(
          pattern => role.name.toLowerCase() === pattern.toLowerCase()
        );

        if (isPlantDirector) {
          hasRedirected.current = true;
          
          // Get plant name if plant exists (it's a UUID reference)
          if (profile.plant) {
            const { data: plant } = await supabase
              .from('plant')
              .select('name')
              .eq('id', profile.plant)
              .single();
            
            if (plant?.name) {
              navigate(`/projects?plant=${encodeURIComponent(plant.name)}`, { replace: true });
              return;
            }
          }
          
          // Fallback to projects without filter
          navigate('/projects', { replace: true });
        }
      } catch (error) {
        console.error('Error checking director status:', error);
      }
    };

    checkDirectorAndRedirect();
  }, [user?.id, navigate, location.pathname]);
};
