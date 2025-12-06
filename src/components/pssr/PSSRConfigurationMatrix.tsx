import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Save, X, Lock, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { usePSSRReasonConfigurations, useUpsertPSSRReasonConfiguration, ConfigurationWithDetails } from '@/hooks/usePSSRReasonConfiguration';
import { useChecklists } from '@/hooks/useChecklists';
import { useRoles } from '@/hooks/useRoles';
import { toast } from 'sonner';

interface LocalConfiguration {
  reason_id: string;
  reason_name: string;
  checklist_id: string | null;
  pssr_approver_role_ids: string[];
  sof_approver_role_ids: string[];
  isDirty: boolean;
}

const PSSRConfigurationMatrix: React.FC = () => {
  const { data: configurations = [], isLoading: isLoadingConfigs } = usePSSRReasonConfigurations();
  const { data: checklists = [], isLoading: isLoadingChecklists } = useChecklists();
  const { roles = [], isLoading: isLoadingRoles } = useRoles();
  const upsertMutation = useUpsertPSSRReasonConfiguration();

  const [localConfigs, setLocalConfigs] = useState<LocalConfiguration[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Initialize local configs from fetched data
  useEffect(() => {
    if (configurations.length > 0) {
      setLocalConfigs(configurations.map(config => ({
        reason_id: config.reason_id,
        reason_name: config.reason?.name || '',
        checklist_id: config.checklist_id,
        pssr_approver_role_ids: config.pssr_approver_role_ids || [],
        sof_approver_role_ids: config.sof_approver_role_ids || [],
        isDirty: false,
      })));
    }
  }, [configurations]);

  const hasUnsavedChanges = useMemo(() => 
    localConfigs.some(c => c.isDirty), 
    [localConfigs]
  );

  const handleChecklistChange = (reasonId: string, checklistId: string | null) => {
    setLocalConfigs(prev => prev.map(config => 
      config.reason_id === reasonId 
        ? { ...config, checklist_id: checklistId === 'none' ? null : checklistId, isDirty: true }
        : config
    ));
  };

  const handlePSSRApproverToggle = (reasonId: string, roleId: string) => {
    setLocalConfigs(prev => prev.map(config => {
      if (config.reason_id !== reasonId) return config;
      
      const currentRoles = config.pssr_approver_role_ids;
      const newRoles = currentRoles.includes(roleId)
        ? currentRoles.filter(id => id !== roleId)
        : [...currentRoles, roleId];
      
      // Remove from SoF if added to PSSR
      const newSofRoles = config.sof_approver_role_ids.filter(id => !newRoles.includes(id));
      
      return { 
        ...config, 
        pssr_approver_role_ids: newRoles,
        sof_approver_role_ids: newSofRoles,
        isDirty: true 
      };
    }));
  };

  const handleSoFApproverToggle = (reasonId: string, roleId: string) => {
    setLocalConfigs(prev => prev.map(config => {
      if (config.reason_id !== reasonId) return config;
      
      // Check if role is already a PSSR approver
      if (config.pssr_approver_role_ids.includes(roleId)) {
        toast.error('This role is already assigned as a PSSR Approver');
        return config;
      }
      
      const currentRoles = config.sof_approver_role_ids;
      const newRoles = currentRoles.includes(roleId)
        ? currentRoles.filter(id => id !== roleId)
        : [...currentRoles, roleId];
      
      return { ...config, sof_approver_role_ids: newRoles, isDirty: true };
    }));
  };

  const handleSave = async () => {
    const dirtyConfigs = localConfigs.filter(c => c.isDirty);
    
    if (dirtyConfigs.length === 0) {
      toast.info('No changes to save');
      return;
    }

    try {
      await upsertMutation.mutateAsync(dirtyConfigs.map(c => ({
        reason_id: c.reason_id,
        checklist_id: c.checklist_id,
        pssr_approver_role_ids: c.pssr_approver_role_ids,
        sof_approver_role_ids: c.sof_approver_role_ids,
      })));

      setLocalConfigs(prev => prev.map(c => ({ ...c, isDirty: false })));
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Failed to save configurations:', error);
    }
  };

  const handleCancelChanges = () => {
    setLocalConfigs(configurations.map(config => ({
      reason_id: config.reason_id,
      reason_name: config.reason?.name || '',
      checklist_id: config.checklist_id,
      pssr_approver_role_ids: config.pssr_approver_role_ids || [],
      sof_approver_role_ids: config.sof_approver_role_ids || [],
      isDirty: false,
    })));
    toast.info('Changes discarded');
  };

  const getRoleName = (roleId: string) => {
    return roles.find(r => r.id === roleId)?.name || 'Unknown Role';
  };

  const getChecklistName = (checklistId: string | null) => {
    if (!checklistId) return 'Not configured';
    return checklists.find(c => c.id === checklistId)?.name || 'Unknown Checklist';
  };

  const isLoading = isLoadingConfigs || isLoadingChecklists || isLoadingRoles;

  if (isLoading) {
    return (
      <Card className="fluent-card border-border/40">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="fluent-card border-border/40">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/5 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold">PSSR Reason Configuration Matrix</CardTitle>
              <CardDescription className="text-base">
                Configure which checklist, PSSR approvers, and SoF approvers are assigned for each PSSR reason
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Button 
                  variant="outline"
                  onClick={handleCancelChanges}
                  className="fluent-button"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button 
                onClick={() => setShowSaveDialog(true)}
                disabled={!hasUnsavedChanges || upsertMutation.isPending}
                className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
              >
                {upsertMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </div>
          </div>

          {/* Warning Banner */}
          <Alert className="mt-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Changes to this configuration will only apply to newly created PSSRs. Existing PSSRs will not be affected.
            </AlertDescription>
          </Alert>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[250px]">
                    PSSR Reason
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">
                    Assigned Checklist
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[250px]">
                    PSSR Approver Roles
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[250px]">
                    SoF Approver Roles
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localConfigs.map((config) => (
                  <TableRow 
                    key={config.reason_id}
                    className={`transition-all duration-200 hover:bg-accent/30 ${config.isDirty ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
                  >
                    {/* Reason Name */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{config.reason_name}</span>
                        {config.isDirty && (
                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                            Modified
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Checklist Selection */}
                    <TableCell>
                      <Select
                        value={config.checklist_id || 'none'}
                        onValueChange={(value) => handleChecklistChange(config.reason_id, value)}
                      >
                        <SelectTrigger className="h-9 w-full max-w-[220px]">
                          <SelectValue placeholder="Select checklist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">Not configured</span>
                          </SelectItem>
                          {checklists.map((checklist) => (
                            <SelectItem key={checklist.id} value={checklist.id}>
                              {checklist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* PSSR Approver Roles */}
                    <TableCell>
                      <RoleMultiSelect
                        roles={roles}
                        selectedRoleIds={config.pssr_approver_role_ids}
                        onToggle={(roleId) => handlePSSRApproverToggle(config.reason_id, roleId)}
                        placeholder="Select PSSR Approvers"
                        disabledRoleIds={[]}
                      />
                    </TableCell>

                    {/* SoF Approver Roles */}
                    <TableCell>
                      <RoleMultiSelect
                        roles={roles}
                        selectedRoleIds={config.sof_approver_role_ids}
                        onToggle={(roleId) => handleSoFApproverToggle(config.reason_id, roleId)}
                        placeholder="Select SoF Approvers"
                        disabledRoleIds={config.pssr_approver_role_ids}
                        disabledTooltip="Already assigned as PSSR Approver"
                      />
                    </TableCell>
                  </TableRow>
                ))}

                {localConfigs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No PSSR reasons found. Add reasons in the "PSSR Reasons" tab first.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Save Configuration Changes?
            </DialogTitle>
            <DialogDescription className="pt-2">
              These changes will only apply to <strong>newly created PSSRs</strong>. Existing PSSRs will not be affected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              You are about to update the configuration for {localConfigs.filter(c => c.isDirty).length} PSSR reason(s).
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

// Role Multi-Select Component
interface RoleMultiSelectProps {
  roles: Array<{ id: string; name: string }>;
  selectedRoleIds: string[];
  onToggle: (roleId: string) => void;
  placeholder: string;
  disabledRoleIds: string[];
  disabledTooltip?: string;
}

const RoleMultiSelect: React.FC<RoleMultiSelectProps> = ({
  roles,
  selectedRoleIds,
  onToggle,
  placeholder,
  disabledRoleIds,
  disabledTooltip,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCount = selectedRoleIds.length;

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-full max-w-[220px] justify-between text-left font-normal"
      >
        <span className={selectedCount === 0 ? 'text-muted-foreground' : ''}>
          {selectedCount === 0 ? placeholder : `${selectedCount} role(s) selected`}
        </span>
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg">
            <ScrollArea className="max-h-[200px]">
              <div className="p-2 space-y-1">
                {roles.map((role) => {
                  const isDisabled = disabledRoleIds.includes(role.id);
                  const isSelected = selectedRoleIds.includes(role.id);

                  return (
                    <Tooltip key={role.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            isDisabled 
                              ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => !isDisabled && onToggle(role.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            className="pointer-events-none"
                          />
                          <span className="text-sm flex-1">{role.name}</span>
                          {isDisabled && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </TooltipTrigger>
                      {isDisabled && disabledTooltip && (
                        <TooltipContent side="right">
                          <p>{disabledTooltip}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
                {roles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No roles available</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Display selected roles as badges */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedRoleIds.slice(0, 2).map((roleId) => {
            const role = roles.find(r => r.id === roleId);
            return (
              <Badge key={roleId} variant="secondary" className="text-xs">
                {role?.name || 'Unknown'}
              </Badge>
            );
          })}
          {selectedCount > 2 && (
            <Badge variant="outline" className="text-xs">
              +{selectedCount - 2} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default PSSRConfigurationMatrix;
