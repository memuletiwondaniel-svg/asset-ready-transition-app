import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BGC_DEFAULTS = [
  { name: 'Commissioning Team A', description: 'Primary commissioning team' },
  { name: 'Commissioning Team B', description: 'Secondary commissioning team' },
  { name: 'Pre-Commissioning', description: 'Pre-commissioning activities team' },
];

interface CommissionsStepProps { onComplete: () => void; }

export const CommissionsStep: React.FC<CommissionsStepProps> = ({ onComplete }) => {
  const queryClient = useQueryClient();
  const [newName, setNewName] = React.useState('');

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['setup-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('commission').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => { if (commissions.length > 0) onComplete(); }, [commissions.length]);

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const c of BGC_DEFAULTS) {
        const exists = commissions.some(cm => cm.name === c.name);
        if (!exists) await supabase.from('commission').insert({ name: c.name, description: c.description, is_active: true });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['setup-commissions'] }); toast.success('BGC default commissions added'); },
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('commission').insert({ name, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['setup-commissions'] }); setNewName(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('commission').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setup-commissions'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Commissions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Commissioning teams responsible for system handover activities. Users are assigned to commissions in their profiles.
        </p>
      </div>

      {commissions.length === 0 && !isLoading && (
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No commissions configured yet.</p>
          <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Load BGC Defaults
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {commissions.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input placeholder="New commission name..." value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addMutation.mutate(newName.trim()); }} />
        <Button size="sm" disabled={!newName.trim() || addMutation.isPending} onClick={() => addMutation.mutate(newName.trim())}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
};
