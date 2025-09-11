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
        .rpc('get_enhanced_user_management_data')
        .select('role')
        .limit(100);

      if (error) throw error;

      // Get unique roles and format them
      const roles = ['admin', 'manager', 'engineer', 'safety_officer', 'technical_authority', 'user'];
      
      const roleOptions: RoleOption[] = roles.map(role => ({
        value: role,
        label: role.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      }));

      return roleOptions;
    },
  });
};

export const useCommissions = () => {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      return [
        { value: 'Asset', label: 'Asset' },
        { value: 'Project and Engineering', label: 'Project and Engineering' }
      ];
    },
  });
};

export const useDisciplines = () => {
  return useQuery({
    queryKey: ['disciplines'],
    queryFn: async () => {
      return [
        { value: 'Civil', label: 'Civil' },
        { value: 'Static', label: 'Static' },
        { value: 'PACO', label: 'PACO' },
        { value: 'Process', label: 'Process' },
        { value: 'Technical Safety', label: 'Technical Safety' }
      ];
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