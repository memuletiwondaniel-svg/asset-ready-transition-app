import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Layers,
  Filter,
  PanelRightClose,
  PanelRightOpen
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<P2ASystem | null>(null);
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

  if (isCollapsed) {
    return (
      <div className="w-12 h-full border-l border-border bg-card flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <PanelRightOpen className="w-4 h-4" />
        </Button>
        <div className="writing-mode-vertical text-xs text-muted-foreground font-medium">
          Systems ({systems.length})
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-48 h-full border-l border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Systems</h3>
              <Badge variant="secondary" className="text-xs">
                {systems.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onToggleCollapse}
              >
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search systems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Systems List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {/* Assigned Systems Section */}
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
                  <span className="text-xs text-muted-foreground">Assigned</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {filteredAssigned.length}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                {filteredAssigned.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    {searchQuery ? 'No matching systems' : 'No assigned systems'}
                  </div>
                ) : (
                  filteredAssigned.map(system => (
                    <DraggableSystemCard
                      key={system.id}
                      system={system}
                      compact
                      onClick={() => setSelectedSystem(system)}
                    />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

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
                  <span className="text-xs text-muted-foreground">Unassigned</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {filteredUnassigned.length}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                {filteredUnassigned.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    {searchQuery ? 'No matching systems' : 'No unassigned systems'}
                  </div>
                ) : (
                  filteredUnassigned.map(system => (
                    <DraggableSystemCard
                      key={system.id}
                      system={system}
                      compact
                      onClick={() => setSelectedSystem(system)}
                    />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* Add System Button */}
        <div className="p-3 border-t border-border">
          <Button 
            className="w-full gap-2" 
            size="sm"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4" />
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
