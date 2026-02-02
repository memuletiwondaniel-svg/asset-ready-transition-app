import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Layers,
} from 'lucide-react';
import { P2ASystem } from '../hooks/useP2ASystems';
import { DraggableSystemCard } from './SystemCard';
import { AddSystemDialog } from './AddSystemDialog';
import { SystemDetailOverlay } from './SystemDetailOverlay';
import { cn } from '@/lib/utils';

interface SystemsPanelProps {
  systems: P2ASystem[];
  unassignedSystems: P2ASystem[];
  assignedSystems: P2ASystem[];
  handoverPlanId: string;
  plantCode?: string;
  projectCode?: string;
  onAddSystem: (system: any) => void;
  onImportSystems: (systems: any[]) => void;
  onUpdateSystem?: (id: string, updates: Partial<P2ASystem>) => void;
  isAdding?: boolean;
  isImporting?: boolean;
  isUpdating?: boolean;
}

export const SystemsPanel: React.FC<SystemsPanelProps> = ({
  systems,
  unassignedSystems,
  assignedSystems,
  handoverPlanId,
  plantCode,
  projectCode,
  onAddSystem,
  onImportSystems,
  onUpdateSystem,
  isAdding,
  isImporting,
  isUpdating,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<P2ASystem | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    unassigned: false,
    assigned: true,
  });

  const toggleSection = (section: 'unassigned' | 'assigned') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter systems by search query
  const filterSystems = (systemsList: P2ASystem[]) => {
    if (!searchQuery.trim()) return systemsList;
    const query = searchQuery.toLowerCase();
    return systemsList.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.system_id.toLowerCase().includes(query)
    );
  };

  const filteredUnassigned = filterSystems(unassignedSystems);
  const filteredAssigned = filterSystems(assignedSystems);

  return (
    <>
      <div 
        className="w-48 h-full border-l border-border bg-card flex flex-col ml-4 overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Systems</h3>
          </div>

          {/* Search - only visible on hover */}
          <div className={cn(
            "relative transition-all duration-200 overflow-hidden",
            isHovered || searchQuery ? "h-8 opacity-100" : "h-0 opacity-0"
          )}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search systems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Systems List - fills remaining height with internal scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-3 space-y-3">
            {/* Assigned Systems Section - only show when there are assigned systems */}
            {filteredAssigned.length > 0 && (
              <>
                <Collapsible 
                  open={expandedSections.assigned}
                  onOpenChange={() => toggleSection('assigned')}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedSections.assigned ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center">
                        {filteredAssigned.length}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Assigned</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {filteredAssigned.map(system => (
                        <DraggableSystemCard
                          key={system.id}
                          system={system}
                          compact
                          onClick={() => setSelectedSystem(system)}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Separator />
              </>
            )}

            {/* Unassigned Systems Section */}
            <Collapsible 
              open={expandedSections.unassigned}
              onOpenChange={() => toggleSection('unassigned')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  {expandedSections.unassigned ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center">
                    {filteredUnassigned.length}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Unassigned</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                {filteredUnassigned.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {filteredUnassigned.map(system => (
                      <DraggableSystemCard
                        key={system.id}
                        system={system}
                        compact
                        onClick={() => setSelectedSystem(system)}
                      />
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Add System Button */}
        <div className="p-3 border-t border-border">
          <Button 
            variant="ghost"
            className="w-full gap-1 text-xs border border-dashed border-border/50 hover:border-primary/50" 
            size="sm"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-3 h-3" />
            Add Systems
          </Button>
        </div>
      </div>

      {/* Add System Dialog */}
      <AddSystemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddSystem={onAddSystem}
        onImportSystems={onImportSystems}
        handoverPlanId={handoverPlanId}
        plantCode={plantCode}
        projectCode={projectCode}
        isAdding={isAdding}
        isImporting={isImporting}
      />

      {/* System Detail Overlay */}
      {selectedSystem && (
        <SystemDetailOverlay
          system={selectedSystem}
          open={!!selectedSystem}
          onOpenChange={(open) => !open && setSelectedSystem(null)}
          onUpdateSystem={onUpdateSystem}
          isUpdating={isUpdating}
        />
      )}
    </>
  );
};
