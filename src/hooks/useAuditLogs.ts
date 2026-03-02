import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  category: string;
  action: string;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  description: string;
  old_values: any;
  new_values: any;
  metadata: any;
}

interface AuditLogFilters {
  category?: string;
  severity?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .limit(filters.limit || 50)
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.dateFrom) {
        query = query.gte('timestamp', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('timestamp', filters.dateTo + 'T23:59:59.999Z');
      }
      if (filters.search) {
        query = query.or(
          `description.ilike.%${filters.search}%,user_name.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%,entity_label.ilike.%${filters.search}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: (data as AuditLogRecord[]) || [], total: count || 0 };
    },
    staleTime: 30 * 1000,
  });
};
