import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  ChevronDown, 
  Flame, 
  Snowflake,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

interface AddSystemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoverPointId: string;
  handoverPlanId: string;
  currentVcrCode: string;
}

interface SystemWithAssignment {
  id: string;
  system_id: string;
  name: string;
  is_hydrocarbon: boolean;
  completion_percentage: number;
  assigned_vcr_code?: string;
  assigned_handover_point_id?: string;
}

export const AddSystemSheet: React.FC<AddSystemSheetProps> = ({
  open,
  onOpenChange,
  handoverPointId,
  handoverPlanId,
  currentVcrCode,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignedExpanded, setAssignedExpanded] = useState(false);
  const [confirmMove, setConfirmMove] = useState<SystemWithAssignment | null>(null);

  // Fetch all systems with their assignments
  const { data: allSystems, isLoading } = useQuery({
    queryKey: ['p2a-all-systems-for-assignment', handoverPlanId],
    queryFn: async () => {
      const { data: systemsData, error: systemsError } = await supabase
        .from('p2a_systems')
        .select('*')
        .eq('handover_plan_id', handoverPlanId)
        .order('name');

      if (systemsError) throw systemsError;

      // Get all assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('p2a_handover_point_systems')
        .select(`
          system_id,
          handover_point_id,
          p2a_handover_points!inner (
            id,
            vcr_code
          )
        `);

      if (assignmentsError) throw assignmentsError;

      const assignmentMap = new Map<string, { handover_point_id: string; vcr_code: string }>();
      assignments?.forEach((a: any) => {
        assignmentMap.set(a.system_id, {
          handover_point_id: a.handover_point_id,
          vcr_code: a.p2a_handover_points.vcr_code,
        });
      });

      return (systemsData || []).map((system: any) => {
        const assignment = assignmentMap.get(system.id);
        return {
          ...system,
          assigned_handover_point_id: assignment?.handover_point_id,
          assigned_vcr_code: assignment?.vcr_code,
        };
      }) as SystemWithAssignment[];
    },
    enabled: open,
  });

  // Assign system mutation
  const assignSystem = useMutation({
    mutationFn: async (systemId: string) => {
      // First remove from any existing assignment
      await supabase
        .from('p2a_handover_point_systems')
        .delete()
        .eq('system_id', systemId);

      // Then assign to this VCR
      const { error } = await supabase
        .from('p2a_handover_point_systems')
        .insert({
          handover_point_id: handoverPointId,
          system_id: systemId,
          assigned_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-point-systems', handoverPointId] });
      queryClient.invalidateQueries({ queryKey: ['p2a-systems'] });
      queryClient.invalidateQueries({ queryKey: ['p2a-all-systems-for-assignment'] });
      toast.success('System assigned to this VCR');
    },
    onError: (error: any) => {
      toast.error('Failed to assign system', { description: error.message });
    },
  });

  // Split systems into unassigned and assigned to other VCRs
  const unassignedSystems = allSystems?.filter(
    (s) => !s.assigned_handover_point_id
  ) || [];
  
  const assignedToOtherSystems = allSystems?.filter(
    (s) => s.assigned_handover_point_id && s.assigned_handover_point_id !== handoverPointId
  ) || [];

  const handleAddSystem = (system: SystemWithAssignment) => {
    if (system.assigned_vcr_code) {
      // Show confirmation dialog for moving
      setConfirmMove(system);
    } else {
      // Direct assignment
      assignSystem.mutate(system.id);
    }
  };

  const handleConfirmMove = () => {
    if (confirmMove) {
      assignSystem.mutate(confirmMove.id);
      setConfirmMove(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Add System to {currentVcrCode}</SheetTitle>
            <SheetDescription>
              Select systems to assign to this VCR
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
            <div className="space-y-6">
              {/* Unassigned Systems */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  Available Systems ({unassignedSystems.length})
                </div>
                {unassignedSystems.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                    No unassigned systems available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unassignedSystems.map((system) => (
                      <div
                        key={system.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-6 h-6 rounded flex items-center justify-center',
                            system.is_hydrocarbon 
                              ? 'bg-orange-500/10 text-orange-500' 
                              : 'bg-blue-500/10 text-blue-500'
                          )}>
                            {system.is_hydrocarbon ? (
                              <Flame className="w-3.5 h-3.5" />
                            ) : (
                              <Snowflake className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{system.name}</div>
                            <div className="text-xs text-muted-foreground">{system.system_id}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddSystem(system)}
                          disabled={assignSystem.isPending}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned to Other VCRs - Collapsible */}
              {assignedToOtherSystems.length > 0 && (
                <Collapsible open={assignedExpanded} onOpenChange={setAssignedExpanded}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Assigned to Other VCRs ({assignedToOtherSystems.length})
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      assignedExpanded && "rotate-180"
                    )} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-2">
                      {assignedToOtherSystems.map((system) => (
                        <div
                          key={system.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-6 h-6 rounded flex items-center justify-center',
                              system.is_hydrocarbon 
                                ? 'bg-orange-500/10 text-orange-500' 
                                : 'bg-blue-500/10 text-blue-500'
                            )}>
                              {system.is_hydrocarbon ? (
                                <Flame className="w-3.5 h-3.5" />
                              ) : (
                                <Snowflake className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{system.name}</div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">{system.system_id}</span>
                                <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                                  {system.assigned_vcr_code}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                            onClick={() => handleAddSystem(system)}
                            disabled={assignSystem.isPending}
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            Move
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog for Moving Systems */}
      <AlertDialog open={!!confirmMove} onOpenChange={() => setConfirmMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Move System to Different VCR?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                <strong>{confirmMove?.name}</strong> is currently assigned to{' '}
                <Badge variant="outline" className="mx-1">{confirmMove?.assigned_vcr_code}</Badge>.
              </p>
              <p>
                Moving it to <Badge variant="outline" className="mx-1">{currentVcrCode}</Badge> will 
                remove it from its current VCR assignment.
              </p>
              <p className="text-amber-600 font-medium">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmMove}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Move System
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
