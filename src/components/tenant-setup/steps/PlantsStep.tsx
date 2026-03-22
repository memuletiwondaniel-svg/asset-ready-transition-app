import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Factory, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BGC_DEFAULTS = [
  { name: 'KA Plant', description: 'Khor Al-Zubair Plant' },
  { name: 'Rumaila FGPP', description: 'Rumaila Flared Gas Processing Plant' },
  { name: 'Basrah Gas Plant', description: 'Basrah Gas Main Processing Plant' },
];

interface PlantsStepProps { onComplete: () => void; }

export const PlantsStep: React.FC<PlantsStepProps> = ({ onComplete }) => {
  const queryClient = useQueryClient();
  const [newName, setNewName] = React.useState('');

  const { data: plants = [], isLoading } = useQuery({
    queryKey: ['setup-plants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plant').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => { if (plants.length > 0) onComplete(); }, [plants.length]);

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const p of BGC_DEFAULTS) {
        const exists = plants.some(pl => pl.name === p.name);
        if (!exists) {
          await supabase.from('plant').insert({ name: p.name, description: p.description, is_active: true });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['setup-plants'] }); toast.success('BGC default plants added'); },
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('plant').insert({ name, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['setup-plants'] }); setNewName(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plant').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setup-plants'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Factory className="h-5 w-5 text-primary" /> Plants
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the processing plants in your organisation. These are used for PSSR assignments and project scoping.
        </p>
      </div>

      {plants.length === 0 && !isLoading && (
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No plants configured yet.</p>
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
          {plants.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input placeholder="New plant name..." value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addMutation.mutate(newName.trim()); }} />
        <Button size="sm" disabled={!newName.trim() || addMutation.isPending} onClick={() => addMutation.mutate(newName.trim())}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
};
