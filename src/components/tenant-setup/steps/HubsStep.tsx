import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Network, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BGC_DEFAULTS = [
  { name: 'Zubair', description: 'Southern hub operations' },
  { name: 'Rumaila', description: 'Rumaila field hub' },
  { name: 'Central', description: 'Central processing hub' },
];

interface HubsStepProps { onComplete: () => void; }

export const HubsStep: React.FC<HubsStepProps> = ({ onComplete }) => {
  const queryClient = useQueryClient();
  const [newName, setNewName] = React.useState('');

  const { data: hubs = [], isLoading } = useQuery({
    queryKey: ['setup-hubs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hubs').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => { if (hubs.length > 0) onComplete(); }, [hubs.length]);

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const h of BGC_DEFAULTS) {
        const exists = hubs.some(hub => hub.name === h.name);
        if (!exists) await supabase.from('hubs').insert({ name: h.name, description: h.description, is_active: true });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['setup-hubs'] }); toast.success('BGC default hubs added'); },
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('hubs').insert({ name, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['setup-hubs'] }); setNewName(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hubs').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setup-hubs'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" /> Hubs
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Operational hubs group projects and personnel by location. They determine team auto-population and portfolio access.
        </p>
      </div>

      {hubs.length === 0 && !isLoading && (
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No hubs configured yet.</p>
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
          {hubs.map(h => (
            <div key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{h.name}</p>
                {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(h.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input placeholder="New hub name..." value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addMutation.mutate(newName.trim()); }} />
        <Button size="sm" disabled={!newName.trim() || addMutation.isPending} onClick={() => addMutation.mutate(newName.trim())}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
};
