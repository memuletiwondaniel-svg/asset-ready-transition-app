import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Users, Loader2, CheckCircle, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';

interface UsersStepProps { onComplete: () => void; onFinish: () => void; }

export const UsersStep: React.FC<UsersStepProps> = ({ onComplete, onFinish }) => {
  const { tenant, tenantId } = useTenant();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['setup-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email, status, position').limit(20);
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => { if (users.length > 0) onComplete(); }, [users.length]);

  const finishMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      const currentSettings = (tenant?.settings ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from('tenants')
        .update({ settings: { ...currentSettings, setup_completed: true } })
        .eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tenant setup completed!');
      onFinish();
    },
    onError: () => toast.error('Failed to mark setup as complete'),
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" /> Users
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review existing users or invite new ones. For bulk invitations, use <strong>Admin Tools → Bulk User Upload</strong> after setup.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''} registered</span>
            </div>
            <div className="divide-y divide-border max-h-[240px] overflow-y-auto">
              {users.map(u => (
                <div key={u.user_id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {(u.full_name || u.email || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{u.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.position || u.email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {u.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-3">
            <PartyPopper className="h-8 w-8 text-primary mx-auto" />
            <div>
              <p className="text-base font-semibold text-foreground">You're all set!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your organisation's core configuration is complete. Click below to finish setup and start using ORSH.
              </p>
            </div>
            <Button onClick={() => finishMutation.mutate()} disabled={finishMutation.isPending} className="min-w-[200px]">
              {finishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Complete Setup
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
