import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleOption {
  value: string;
  label: string;
}

export interface TA2Option {
  commission: string;
  discipline: string;
  displayName: string;
}

export const useRoles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .not('role', 'is', null)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }

      console.log('Raw roles data:', data);

      // Get unique roles and format them
      const uniqueRoles = [...new Set(data.map(item => item.role))];
      
      const roleOptions: RoleOption[] = uniqueRoles
        .sort()
        .map(role => ({
          value: role,
          label: role
        }));

      console.log('Formatted role options:', roleOptions);
      return roleOptions;
    },
  });
};

export const useCommissions = () => {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('ta2_commission')
        .not('ta2_commission', 'is', null)
        .eq('is_active', true)
        .order('ta2_commission');

      if (error) {
        console.error('Error fetching commissions:', error);
        throw error;
      }

      console.log('Raw commissions data:', data);

      // Get unique commissions and format them
      const uniqueCommissions = [...new Set(data.map(item => item.ta2_commission))];
      
      const commissionOptions = uniqueCommissions.map(commission => ({
        value: commission,
        label: commission
      }));

      console.log('Formatted commission options:', commissionOptions);
      return commissionOptions;
    },
  });
};

export const useDisciplines = () => {
  return useQuery({
    queryKey: ['disciplines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('ta2_discipline')
        .not('ta2_discipline', 'is', null)
        .eq('is_active', true)
        .order('ta2_discipline');

      if (error) {
        console.error('Error fetching disciplines:', error);
        throw error;
      }

      console.log('Raw disciplines data:', data);

      // Get unique disciplines and format them
      const uniqueDisciplines = [...new Set(data.map(item => item.ta2_discipline))];
      
      const disciplineOptions = uniqueDisciplines.map(discipline => ({
        value: discipline,
        label: discipline
      }));

      console.log('Formatted discipline options:', disciplineOptions);
      return disciplineOptions;
    },
  });
};

export const useTA2Options = () => {
  const { data: commissions } = useCommissions();
  const { data: disciplines } = useDisciplines();

  return useQuery({
    queryKey: ['ta2-options', commissions, disciplines],
    queryFn: async () => {
      if (!commissions || !disciplines) return [];

      const ta2Options: TA2Option[] = [];
      
      commissions.forEach(commission => {
        disciplines.forEach(discipline => {
          ta2Options.push({
            commission: commission.value,
            discipline: discipline.value,
            displayName: `TA2 ${discipline.label} (${commission.label})`
          });
        });
      });

      return ta2Options;
    },
    enabled: !!commissions && !!disciplines,
  });
};