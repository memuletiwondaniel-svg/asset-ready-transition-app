import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_FIELDS = [
  { name: 'Rumaila' },
  { name: 'Zubair' },
  { name: 'West Qurna' },
  { name: 'Majnoon' },
];

interface FieldsStepProps { onComplete: () => void; }

export const FieldsStep: React.FC<FieldsStepProps> = ({ onComplete }) => {
  const queryClient = useQueryClient();
  const [newName, setNewName] = React.useState('');

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['setup-fields'],
    queryFn: async () => {
      const { data, error } = await supabase.from('field').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => { if (fields.length > 0) onComplete(); }, [fields.length]);

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const f of BGC_DEFAULTS) {
        const exists = fields.some(fl => fl.name === f.name);
        if (!exists) await supabase.from('field').insert({ name: f.name, is_active: true });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['setup-fields'] }); toast.success('BGC default fields added'); },
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('field').insert({ name, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['setup-fields'] }); setNewName(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('field').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setup-fields'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" /> Fields
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Oil & gas fields associated with your operations. Fields are linked to plants and used for location-based scoping.
        </p>
      </div>

      {fields.length === 0 && !isLoading && (
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No fields configured yet.</p>
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
          {fields.map(f => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-sm font-medium text-foreground">{f.name}</p>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(f.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input placeholder="New field name..." value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addMutation.mutate(newName.trim()); }} />
        <Button size="sm" disabled={!newName.trim() || addMutation.isPending} onClick={() => addMutation.mutate(newName.trim())}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
};
