import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, ListChecks, ChevronDown, ChevronRight } from 'lucide-react';
import { WizardActivity, catalogToWizardActivity } from './types';
import { useORAActivityCatalog } from '@/hooks/useORAActivityCatalog';
import { AddFromCatalogDialog } from './AddFromCatalogDialog';
import { AddCustomActivityDialog } from './AddCustomActivityDialog';
import { cn } from '@/lib/utils';

interface Props {
  activities: WizardActivity[];
  phase: string;
  onActivitiesChange: (activities: WizardActivity[]) => void;
}

export const StepActivities: React.FC<Props> = ({ activities, phase, onActivitiesChange }) => {
  const [search, setSearch] = useState('');
  const [showAddFromCatalog, setShowAddFromCatalog] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedCount = activities.filter(a => a.selected).length;
  const mandatoryCount = activities.filter(a => a.requirementLevel === 'mandatory').length;

  const filteredActivities = activities.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (id: string) => {
    onActivitiesChange(
      activities.map(a => a.id === id ? { ...a, selected: !a.selected } : a)
    );
  };

  const handleSelectAll = () => {
    const allSelected = activities.every(a => a.selected);
    onActivitiesChange(activities.map(a => ({ ...a, selected: !allSelected })));
  };

  return (
    <div className="space-y-3 p-1">
      {/* Header */}
      <div className="text-center space-y-1.5 pb-1">
        <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ListChecks className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Select Activities & Deliverables</h3>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>{activities.length} total</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="text-primary font-medium">{selectedCount} selected</span>
          {mandatoryCount > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span>{mandatoryCount} required</span>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter activities..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs px-2 text-muted-foreground" onClick={handleSelectAll}>
          {activities.every(a => a.selected) ? 'Deselect All' : 'Select All'}
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAddFromCatalog(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Catalog
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAddCustom(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Custom
        </Button>
      </div>

      {/* Activity List */}
      <ScrollArea className="h-[320px]">
        <div className="space-y-1 pr-2">
          {filteredActivities.map((activity, idx) => (
            <div
              key={activity.id}
              className={cn(
                "rounded-md border transition-all",
                activity.selected
                  ? "bg-primary/[0.03] border-primary/20"
                  : "bg-muted/10 border-transparent opacity-50"
              )}
            >
              {/* Main row */}
              <div
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer group"
                onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
              >
                <Checkbox
                  checked={activity.selected}
                  onCheckedChange={(e) => {
                    e; // consume
                    handleToggle(activity.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                />
                <span className="text-[11px] font-mono text-muted-foreground w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{activity.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {activity.requirementLevel === 'mandatory' && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">Required</Badge>
                  )}
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 capitalize">
                    {activity.entryType}
                  </Badge>
                  {activity.description ? (
                    expandedId === activity.id
                      ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  ) : null}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === activity.id && (
                <div className="px-3 pb-2.5 pt-0 ml-[3.25rem] border-t border-border/40 mt-0">
                  {activity.description && (
                    <p className="text-xs text-muted-foreground pt-2 leading-relaxed">{activity.description}</p>
                  )}
                  <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                    {activity.area && (
                      <span className="bg-muted/40 px-1.5 py-0.5 rounded">{activity.area}</span>
                    )}
                    {activity.discipline && (
                      <span className="bg-muted/40 px-1.5 py-0.5 rounded">{activity.discipline}</span>
                    )}
                    {activity.estimatedManhours && (
                      <span className="bg-muted/40 px-1.5 py-0.5 rounded">{activity.estimatedManhours}h est.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredActivities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No activities match your search
            </div>
          )}
        </div>
      </ScrollArea>

      <AddFromCatalogDialog
        open={showAddFromCatalog}
        onOpenChange={setShowAddFromCatalog}
        existingIds={activities.map(a => a.id)}
        onAdd={(newActivities) => {
          onActivitiesChange([...activities, ...newActivities]);
          setShowAddFromCatalog(false);
        }}
      />

      <AddCustomActivityDialog
        open={showAddCustom}
        onOpenChange={setShowAddCustom}
        phase={phase}
        onAdd={(activity) => {
          onActivitiesChange([...activities, activity]);
          setShowAddCustom(false);
        }}
      />
    </div>
  );
};
