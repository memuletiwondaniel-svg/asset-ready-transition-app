import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Loader2, CheckCircle } from 'lucide-react';

interface RolesStepProps { onComplete: () => void; }

export const RolesStep: React.FC<RolesStepProps> = ({ onComplete }) => {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['setup-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, category_id, role_categories(name)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => { if (roles.length > 0) onComplete(); }, [roles.length]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof roles>();
    roles.forEach(r => {
      const cat = (r.role_categories as any)?.name || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    });
    return map;
  }, [roles]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Roles
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review the roles available in your organisation. Roles determine user permissions and are assigned during user creation.
          To add or edit roles, use <strong>Admin Tools → Functions & Roles</strong> after setup.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : roles.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No roles found. Roles are typically seeded during tenant creation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([category, categoryRoles]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category}</p>
              <div className="space-y-1.5">
                {categoryRoles.map(r => (
                  <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
