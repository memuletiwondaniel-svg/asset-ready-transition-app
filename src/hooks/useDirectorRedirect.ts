import { useEffect, useRef, useState } from 'react';
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
 * Returns isChecking to allow blocking render until redirect check completes.
 */
export const useDirectorRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasChecked = useRef(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // If no user, not checking
    if (!user?.id) {
      setIsChecking(false);
      return;
    }

    // Already checked this session
    if (hasChecked.current) {
      setIsChecking(false);
      return;
    }
    
    // Already on target pages - no need to redirect
    if (location.pathname === '/my-tasks' || location.pathname === '/projects') {
      hasChecked.current = true;
      setIsChecking(false);
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

        if (profileError || !profile?.role) {
          hasChecked.current = true;
          setIsChecking(false);
          return;
        }

        // Get the role name
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('name')
          .eq('id', profile.role)
          .single();

        if (roleError || !role?.name) {
          hasChecked.current = true;
          setIsChecking(false);
          return;
        }

        // Check if SoF Director → My Tasks
        const isSofDirector = SOF_DIRECTOR_ROLES.some(
          pattern => role.name.toLowerCase() === pattern.toLowerCase()
        );

        if (isSofDirector) {
          hasChecked.current = true;
          navigate('/my-tasks', { replace: true });
          // Don't setIsChecking(false) - let the navigation handle it
          return;
        }

        // Check if Plant Director → Projects with plant filter
        const isPlantDirector = PLANT_DIRECTOR_ROLES.some(
          pattern => role.name.toLowerCase() === pattern.toLowerCase()
        );

        if (isPlantDirector) {
          hasChecked.current = true;
          
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
          return;
        }

        // Not a director - done checking
        hasChecked.current = true;
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking director status:', error);
        hasChecked.current = true;
        setIsChecking(false);
      }
    };

    checkDirectorAndRedirect();
  }, [user?.id, navigate, location.pathname]);

  return { isChecking };
};
