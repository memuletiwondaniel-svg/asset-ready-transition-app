import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortfolioManager {
  user_id: string;
  full_name: string;
  position: string | null;
}

export const usePortfolioManagers = () => {
  const { data: managers, isLoading } = useQuery({
    queryKey: ['portfolio-managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, position')
        .or('position.ilike.%Project Manager%,position.ilike.%Proj Manager%')
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching portfolio managers:', error);
        return [];
      }

      return (data || []) as PortfolioManager[];
    }
  });

  const getManagerForRegion = (regionName: string): PortfolioManager | undefined => {
    if (!managers || !regionName) return undefined;
    
    return managers.find(m => 
      m.position?.toLowerCase().includes(regionName.toLowerCase())
    );
  };

  return {
    managers: managers || [],
    isLoading,
    getManagerForRegion
  };
};
