import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  GraduationCap,
  Trash2,
  Clock,
  Calendar,
  Building,
  MapPin,
  Globe,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useHandoverPointSystems } from '@/components/p2a-workspace/hooks/useP2AHandoverPoints';
import { AddTrainingWizard } from './AddTrainingWizard';
import { TrainingDetailSheet } from './TrainingDetailSheet';

interface TrainingStepProps {
  vcrId: string;
}

const DELIVERY_ICONS: Record<string, React.ElementType> = {
  'Onsite': MapPin,
  'Offsite (Out-of-Country)': Globe,
  'Online': Monitor,
};

export const TrainingStep: React.FC<TrainingStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const { systems, isLoading: systemsLoading } = useHandoverPointSystems(vcrId);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['vcr-exec-training', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_training')
        .select('*')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const addItem = useMutation({
    mutationFn: async (item: any) => {
      const { system_ids, ...rest } = item;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: inserted, error } = await (supabase as any)
        .from('p2a_vcr_training')
        .insert({ 
          ...rest, 
          handover_point_id: vcrId,
          created_by: user?.id || null,
        })
        .select('id')
        .single();
      if (error) throw error;

      // Save system mappings if any were selected in the wizard
      if (inserted?.id && system_ids?.length > 0) {
        await (supabase as any)
          .from('ora_training_system_mappings')
          .insert(system_ids.map((sid: string) => ({
            training_item_id: inserted.id,
            system_id: sid,
            handover_point_id: vcrId,
            created_by: user?.id || null,
          })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-training'] });
      toast.success('Training item added');
      setAddOpen(false);
    },
    onError: (error: any) => {
      console.error('Failed to create training:', error);
      toast.error('Failed to create training item');
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('p2a_vcr_training')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-training'] });
      toast.success('Training item removed');
    },
  });

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{items.length} training items</Badge>
        {items.length > 0 && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Training
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
              <GraduationCap className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="font-medium">No Training Items</h3>
            <p className="text-xs text-muted-foreground mt-1">Add training requirements for this VCR.</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 gap-1.5">
              <Plus className="w-4 h-4" />
              Add First Training
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(min(90vh,780px)-280px)]">
          <div className="space-y-2 px-1 pr-4 max-w-[95%]">
            {items.map((item: any, index: number) => {
              const hueOffset = index * 137.5; // golden angle for distinct hues
              return (
                <Card
                  key={item.id}
                  className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                  style={{
                    borderColor: `hsl(${(210 + hueOffset) % 360}, 60%, 70%, 0.15)`,
                  }}
                  onClick={() => setDetailItem(item)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `hsl(${(210 + hueOffset) % 360}, 60%, 60%, 0.5)`;
                    e.currentTarget.style.backgroundColor = `hsl(${(210 + hueOffset) % 360}, 60%, 95%, 0.3)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `hsl(${(210 + hueOffset) % 360}, 60%, 70%, 0.15)`;
                    e.currentTarget.style.backgroundColor = '';
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 shrink-0" style={{ color: `hsl(${(210 + hueOffset) % 360}, 55%, 50%)` }} />
                          <h4 className="font-medium text-sm truncate">{item.title}</h4>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                          {item.training_provider && (
                            <span className="flex items-center gap-1"><Building className="w-3 h-3" />{item.training_provider}</span>
                          )}
                          {item.duration_hours && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round(item.duration_hours / 8)} day{Math.round(item.duration_hours / 8) !== 1 ? 's' : ''}</span>
                          )}
                          {item.tentative_date && (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.tentative_date}</span>
                          )}
                          {item.delivery_method?.map((dm: string) => {
                            const Icon = DELIVERY_ICONS[dm] || MapPin;
                            return (
                              <span key={dm} className="flex items-center gap-1"><Icon className="w-3 h-3" />{dm}</span>
                            );
                          })}
                        </div>
                        {item.target_audience?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.target_audience.map((a: string) => (
                              <Badge key={a} variant="secondary" className="text-[9px]">{a}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(item.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Add Training Wizard */}
      <AddTrainingWizard
        open={addOpen}
        onOpenChange={setAddOpen}
        systems={systems || []}
        systemsLoading={systemsLoading}
        onSubmit={(item) => addItem.mutate(item)}
        isSaving={addItem.isPending}
      />

      {/* Training Detail Sheet */}
      <TrainingDetailSheet
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
        item={detailItem}
        systems={systems || []}
      />

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Item</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteItem.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
