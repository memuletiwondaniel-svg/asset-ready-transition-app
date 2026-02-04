import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Box, Key, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardSystem } from './SystemsImportStep';
import { WizardVCR } from './VCRCreationStep';

interface SystemMappingStepProps {
  systems: WizardSystem[];
  vcrs: WizardVCR[];
  mappings: Record<string, string[]>; // vcrId -> systemIds[]
  onMappingsChange: (mappings: Record<string, string[]>) => void;
}

export const SystemMappingStep: React.FC<SystemMappingStepProps> = ({
  systems,
  vcrs,
  mappings,
  onMappingsChange,
}) => {
  const toggleMapping = (vcrId: string, systemId: string) => {
    const currentSystems = mappings[vcrId] || [];
    const newSystems = currentSystems.includes(systemId)
      ? currentSystems.filter(id => id !== systemId)
      : [...currentSystems, systemId];
    
    onMappingsChange({
      ...mappings,
      [vcrId]: newSystems,
    });
  };

  const getAssignedCount = (vcrId: string) => {
    return (mappings[vcrId] || []).length;
  };

  const isSystemAssigned = (systemId: string) => {
    return Object.values(mappings).some(systems => systems.includes(systemId));
  };

  const unassignedSystems = systems.filter(s => !isSystemAssigned(s.id));

  if (systems.length === 0 || vcrs.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="py-12 text-muted-foreground">
          <ArrowRight className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {systems.length === 0 && vcrs.length === 0 
              ? "Add systems and VCRs first to create mappings"
              : systems.length === 0 
                ? "Add systems first to map them to VCRs"
                : "Create VCRs first to map systems to them"
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Map Systems to VCRs</h3>
          <p className="text-xs text-muted-foreground">
            Assign systems to their verification checkpoints
          </p>
        </div>
        <Badge variant="outline" className={cn(
          unassignedSystems.length > 0 && "bg-amber-50 text-amber-700 border-amber-200"
        )}>
          {unassignedSystems.length} unassigned
        </Badge>
      </div>

      <ScrollArea className="h-[340px]">
        <div className="space-y-4">
          {vcrs.map((vcr) => (
            <div key={vcr.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-muted/30 border-b">
                <Key className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{vcr.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded">
                  {vcr.code}
                </span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {getAssignedCount(vcr.id)} systems
                </Badge>
              </div>
              <div className="p-2 space-y-1">
                {systems.map((system) => {
                  const isChecked = (mappings[vcr.id] || []).includes(system.id);
                  return (
                    <div
                      key={system.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors",
                        isChecked 
                          ? "bg-primary/5 border border-primary/20" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleMapping(vcr.id, system.id)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleMapping(vcr.id, system.id)}
                      />
                      <Box className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{system.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          {system.system_id}
                        </span>
                      </div>
                      {system.is_hydrocarbon && (
                        <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                          HC
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {unassignedSystems.length > 0 && (
        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 rounded-lg">
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> {unassignedSystems.length} system{unassignedSystems.length !== 1 ? 's are' : ' is'} not assigned to any VCR:
            <span className="font-medium ml-1">
              {unassignedSystems.map(s => s.name).join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
