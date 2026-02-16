import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Layers, Trash2, Flame, Snowflake, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SystemsStepProps {
  vcrId: string;
  projectCode?: string;
}

export const SystemsStep: React.FC<SystemsStepProps> = ({ vcrId, projectCode }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: systems = [], isLoading } = useQuery({
    queryKey: ['vcr-exec-systems', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('*, p2a_systems!inner(id, name, system_id, is_hydrocarbon, overall_completion, itr_completion, punchlist_a_count, punchlist_b_count)')
        .eq('handover_point_id', vcrId);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        systemId: row.p2a_systems?.id,
        name: row.p2a_systems?.name || 'Unknown',
        systemCode: row.p2a_systems?.system_id || '',
        isHydrocarbon: row.p2a_systems?.is_hydrocarbon || false,
        overallCompletion: row.p2a_systems?.overall_completion || 0,
        itrCompletion: row.p2a_systems?.itr_completion || 0,
        punchlistA: row.p2a_systems?.punchlist_a_count || 0,
        punchlistB: row.p2a_systems?.punchlist_b_count || 0,
      }));
    },
  });

  const removeSystem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-systems'] });
      toast.success('System removed from VCR');
    },
  });

  const filtered = systems.filter((s: any) =>
    !searchQuery ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.systemCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hcCount = systems.filter((s: any) => s.isHydrocarbon).length;

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search systems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{systems.length} systems</Badge>
        {hcCount > 0 && (
          <Badge variant="outline" className="border-orange-300 text-orange-600 gap-1">
            <Flame className="w-3 h-3" />
            {hcCount} HC
          </Badge>
        )}
      </div>

      {systems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
              <Layers className="w-7 h-7 text-orange-500" />
            </div>
            <h3 className="font-medium">No Systems Mapped</h3>
            <p className="text-xs text-muted-foreground mt-1">Map systems from the VCR workspace.</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(min(90vh,780px)-280px)]">
          <div className="space-y-2 pr-4">
            {filtered.map((system: any) => (
              <Card key={system.id} className="group hover:border-orange-500/40 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {system.isHydrocarbon ? (
                          <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : (
                          <Snowflake className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                        <h4 className="font-medium text-sm truncate">{system.name}</h4>
                        {system.systemCode && (
                          <Badge variant="outline" className="text-[10px] font-mono">{system.systemCode}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {Math.round(system.overallCompletion)}% complete
                        </span>
                        <span>ITR: {Math.round(system.itrCompletion)}%</span>
                        {(system.punchlistA > 0 || system.punchlistB > 0) && (
                          <span>
                            PL: {system.punchlistA}A / {system.punchlistB}B
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(system.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && searchQuery && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No systems match your search</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove System</AlertDialogTitle>
            <AlertDialogDescription>Remove this system from the VCR mapping?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && removeSystem.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
