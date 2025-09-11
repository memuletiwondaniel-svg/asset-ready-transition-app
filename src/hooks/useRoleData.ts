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
      const { data, error } = await (supabase.rpc as any)('get_active_roles');

      if (error) {
        console.error('Error fetching roles via RPC:', error);
        throw error;
      }

      console.log('Raw roles data (RPC):', data);

      const roleOptions: RoleOption[] = (data || [])
        .map((item: { value: string }) => ({ value: item.value, label: item.value }))
        .sort((a, b) => a.label.localeCompare(b.label));

      console.log('Formatted role options:', roleOptions);
      return roleOptions;
    },
  });
};

export const useCommissions = () => {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_active_ta2_commissions');

      if (error) {
        console.error('Error fetching commissions via RPC:', error);
        throw error;
      }

      console.log('Raw commissions data (RPC):', data);

      const commissionOptions = (data || []).map((item: { value: string }) => ({
        value: item.value,
        label: item.value
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
      const { data, error } = await (supabase.rpc as any)('get_active_ta2_disciplines');

      if (error) {
        console.error('Error fetching disciplines via RPC:', error);
        throw error;
      }

      console.log('Raw disciplines data (RPC):', data);

      const disciplineOptions = (data || []).map((item: { value: string }) => ({
        value: item.value,
        label: item.value
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