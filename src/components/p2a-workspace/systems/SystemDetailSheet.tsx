import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Flame,
  ChevronDown,
  ChevronRight,
  Save,
  AlertCircle,
  FileCheck,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2ASystem, P2ASubsystem, useP2ASubsystems } from '../hooks/useP2ASystems';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';

interface SystemDetailSheetProps {
  system: P2ASystem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSystem?: (id: string, updates: Partial<P2ASystem>) => void;
  isUpdating?: boolean;
  handoverPoints?: P2AHandoverPoint[];
  onAssignSystemToVCR?: (handoverPointId: string, systemId: string) => void;
  onUnassignSystemFromVCR?: (systemId: string) => void;
}

export const SystemDetailSheet: React.FC<SystemDetailSheetProps> = ({
  system,
  open,
  onOpenChange,
  onUpdateSystem,
  isUpdating = false,
  handoverPoints = [],
  onAssignSystemToVCR,
  onUnassignSystemFromVCR,
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [editName, setEditName] = useState(system.name);
  const [editIsHC, setEditIsHC] = useState(system.is_hydrocarbon);
  const [hasChanges, setHasChanges] = useState(false);
  const [subsystemsExpanded, setSubsystemsExpanded] = useState(false);

  const { subsystems, isLoading: subsystemsLoading } = useP2ASubsystems(system.id);

  // Reset state when system changes
  useEffect(() => {
    setEditName(system.name);
    setEditIsHC(system.is_hydrocarbon);
    setHasChanges(false);
    setActiveTab('details');
    setSubsystemsExpanded(false);
  }, [system.id, open]);

  // Track changes
  useEffect(() => {
    setHasChanges(editName !== system.name || editIsHC !== system.is_hydrocarbon);
  }, [editName, editIsHC, system.name, system.is_hydrocarbon]);

  const handleSave = () => {
    if (onUpdateSystem && hasChanges) {
      onUpdateSystem(system.id, { name: editName, is_hydrocarbon: editIsHC });
    }
  };

  const currentVCRId = system.assigned_handover_point_id || '';

  const handleVCRChange = (value: string) => {
    if (value === 'none') {
      onUnassignSystemFromVCR?.(system.id);
    } else {
      onAssignSystemToVCR?.(value, system.id);
    }
  };

  const handleSubsystemVCRChange = (subsystemId: string, value: string) => {
    // For subsystem-level assignment, we'd need a dedicated mutation.
    // For now, this is a placeholder — the existing hooks assign at system level.
    // TODO: implement subsystem-level VCR assignment
    console.log('Subsystem VCR change:', subsystemId, value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border text-muted-foreground">
              {system.system_id}
            </span>
            {system.is_hydrocarbon && (
              <Badge variant="outline" className="text-[9px] font-semibold px-1 py-0 border-orange-200 bg-orange-100 text-orange-700">
                HC
              </Badge>
            )}
          </div>
          <SheetTitle className="text-lg font-semibold mt-1">
            {system.name}
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 shrink-0">
            <TabsTrigger value="details" className="text-xs gap-1">
              <ClipboardList className="w-3 h-3" />
              Details
            </TabsTrigger>
            <TabsTrigger value="statistics" className="text-xs gap-1">
              <BarChart3 className="w-3 h-3" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="punchlist" className="text-xs gap-1">
              <AlertCircle className="w-3 h-3" />
              Punchlist
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-4 py-4 space-y-4">
                {/* System Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">System Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="System name"
                  />
                </div>

                {/* Hydrocarbon Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2">
                    <Flame className={cn('w-4 h-4', editIsHC ? 'text-orange-500' : 'text-muted-foreground')} />
                    <span className="text-sm font-medium">Hydrocarbon System</span>
                  </div>
                  <Switch
                    checked={editIsHC}
                    onCheckedChange={setEditIsHC}
                  />
                </div>

                {/* VCR Assignment */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Assigned VCR</Label>
                  <Select value={currentVCRId || 'none'} onValueChange={handleVCRChange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {handoverPoints.map(hp => (
                        <SelectItem key={hp.id} value={hp.id}>
                          <span className="font-mono text-[10px] mr-1.5 text-muted-foreground">{hp.vcr_code}</span>
                          {hp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Save Button */}
                {hasChanges && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="w-full gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </Button>
                )}

                <Separator />

                {/* Subsystems */}
                {(subsystems.length > 0 || subsystemsLoading) && (
                  <Collapsible open={subsystemsExpanded} onOpenChange={setSubsystemsExpanded}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-1 hover:bg-muted/30 rounded px-1 transition-colors">
                      <div className="flex items-center gap-2">
                        {subsystemsExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Subsystems
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {subsystems.length}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-1.5">
                      {subsystems.map(sub => {
                        // Check if this subsystem has an individual VCR assignment
                        const subAssignment = system.assigned_subsystems?.find(
                          as => as.id === sub.id
                        );
                        const subVCRId = subAssignment?.assigned_handover_point_id || currentVCRId || 'none';

                        return (
                          <div key={sub.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border border-border/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{sub.name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{sub.subsystem_id}</p>
                            </div>
                            <Select value={subVCRId} onValueChange={(v) => handleSubsystemVCRChange(sub.id, v)}>
                              <SelectTrigger className="h-7 w-[120px] text-[10px]">
                                <SelectValue placeholder="VCR" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {handoverPoints.map(hp => (
                                  <SelectItem key={hp.id} value={hp.id}>
                                    <span className="font-mono text-[9px]">{hp.vcr_code}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-4 py-4 space-y-4">
                {/* Overall Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm font-bold">{system.completion_percentage}%</span>
                  </div>
                  <Progress
                    value={system.completion_percentage}
                    className="h-2"
                    indicatorClassName={cn(
                      system.completion_percentage >= 100 ? 'bg-emerald-500' :
                      system.completion_percentage >= 50 ? 'bg-amber-500' : 'bg-primary'
                    )}
                  />
                </div>

                <Separator />

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Outstanding ITR-A"
                    value={system.itr_a_count}
                    icon={<FileCheck className="w-3.5 h-3.5 text-blue-500" />}
                    color="blue"
                  />
                  <MetricCard
                    label="Outstanding ITR-B"
                    value={system.itr_b_count}
                    icon={<FileCheck className="w-3.5 h-3.5 text-purple-500" />}
                    color="purple"
                  />
                  <MetricCard
                    label="Punchlist A"
                    value={system.punchlist_a_count}
                    icon={<AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                    color="red"
                    onClick={() => setActiveTab('punchlist')}
                    clickable
                  />
                  <MetricCard
                    label="Punchlist B"
                    value={system.punchlist_b_count}
                    icon={<AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                    color="amber"
                    onClick={() => setActiveTab('punchlist')}
                    clickable
                  />
                </div>

                <Separator />

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className="text-xs">
                    {system.completion_status.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Assigned VCR */}
                {system.assigned_vcr_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assigned VCR</span>
                    <span className="text-xs font-mono text-muted-foreground">{system.assigned_vcr_code}</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Punchlist Tab */}
          <TabsContent value="punchlist" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-4 py-4 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-center">
                    <div className="text-2xl font-bold text-red-500">{system.punchlist_a_count}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Category A</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
                    <div className="text-2xl font-bold text-amber-500">{system.punchlist_b_count}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Category B</div>
                  </div>
                </div>

                <Separator />

                {/* Placeholder for actual punchlist items */}
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Punchlist items will be displayed here once integrated with the punchlist data source.
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {system.punchlist_a_count + system.punchlist_b_count} total items outstanding
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

// Metric card component
const MetricCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
}> = ({ label, value, icon, color, onClick, clickable }) => (
  <div
    className={cn(
      `p-3 rounded-lg bg-${color}-500/5 border border-${color}-500/10`,
      clickable && 'cursor-pointer hover:bg-opacity-10 transition-colors'
    )}
    onClick={onClick}
  >
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
    <div className={`text-xl font-bold text-${color}-500`}>{value}</div>
  </div>
);
