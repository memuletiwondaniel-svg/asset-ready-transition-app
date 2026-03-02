import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  category: string;
  action: string;
  severity?: 'info' | 'warning' | 'critical';
  entity_type?: string;
  entity_id?: string;
  entity_label?: string;
  description: string;
  metadata?: Record<string, any>;
}

export const useAuditLog = () => {
  const log = useCallback(async (entry: AuditLogEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        category: entry.category,
        action: entry.action,
        severity: entry.severity || 'info',
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        entity_label: entry.entity_label,
        description: entry.description,
        metadata: entry.metadata || {},
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }, []);

  const logAuth = useCallback((action: string, description: string, metadata?: Record<string, any>) => {
    return log({ category: 'auth', action, description, severity: action === 'login_failed' ? 'warning' : 'info', metadata });
  }, [log]);

  return { log, logAuth };
};
