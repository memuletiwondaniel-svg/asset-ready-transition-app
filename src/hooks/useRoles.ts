import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook to get unique roles from profiles
export const useRoles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .not('role', 'is', null)
        .not('role', 'eq', '')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Get unique roles
      const uniqueRoles = [...new Set(data.map(profile => profile.role).filter(Boolean))];
      return uniqueRoles.sort();
    },
  });
};

// Hook to get TA2 commissions
export const useTA2Commissions = () => {
  return useQuery({
    queryKey: ['ta2-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('ta2_commission')
        .not('ta2_commission', 'is', null)
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Get unique commissions
      const uniqueCommissions = [...new Set(data.map(profile => profile.ta2_commission).filter(Boolean))];
      return uniqueCommissions.sort();
    },
  });
};

// Hook to get TA2 disciplines for a specific commission
export const useTA2Disciplines = (commission?: string) => {
  return useQuery({
    queryKey: ['ta2-disciplines', commission],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('ta2_discipline')
        .not('ta2_discipline', 'is', null)
        .eq('is_active', true);
      
      if (commission) {
        query = query.eq('ta2_commission', commission);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get unique disciplines
      const uniqueDisciplines = [...new Set(data.map(profile => profile.ta2_discipline).filter(Boolean))];
      return uniqueDisciplines.sort();
    },
    enabled: !!commission, // Only run if commission is provided
  });
};