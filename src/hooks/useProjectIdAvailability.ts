import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectIdConflict {
  id: string;
  project_title: string | null;
}

/**
 * Checks if a given project_id_prefix + project_id_number already exists.
 * Debounces input to avoid hammering the DB while the user is typing.
 */
export function useProjectIdAvailability(
  prefix: string | undefined,
  number: string | undefined,
  delayMs = 350
) {
  const [debouncedNumber, setDebouncedNumber] = useState(number || '');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedNumber((number || '').trim()), delayMs);
    return () => clearTimeout(t);
  }, [number, delayMs]);

  const enabled = !!prefix && !!debouncedNumber;

  const query = useQuery({
    queryKey: ['project-id-availability', prefix, debouncedNumber],
    enabled,
    queryFn: async (): Promise<ProjectIdConflict | null> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_title')
        .eq('project_id_prefix', prefix as any)
        .eq('project_id_number', debouncedNumber)
        .eq('is_active', true)
        .maybeSingle();
      if (error && (error as any).code !== 'PGRST116') throw error;
      return (data as ProjectIdConflict) || null;
    },
    staleTime: 30_000,
  });

  return {
    conflict: query.data ?? null,
    isChecking: enabled && query.isFetching,
    isPending: enabled && (number || '').trim() !== debouncedNumber,
  };
}
