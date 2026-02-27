import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, ListChecks, ChevronDown, ChevronRight } from 'lucide-react';
import { WizardActivity } from './types';
import { AddFromCatalogDialog } from './AddFromCatalogDialog';
import { AddCustomActivityDialog } from './AddCustomActivityDialog';
import { cn } from '@/lib/utils';

interface Props {
  activities: WizardActivity[];
  phase: string;
  onActivitiesChange: (activities: WizardActivity[]) => void;
}

// Phase-based badge colors matching ORAActivityCatalog styling
const PHASE_BADGE_COLORS: Record<string, string> = {
  IDN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ASS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  SEL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  DEF: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  EXE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  OPR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

function getCodeBadgeColor(code: string): string {
  const prefix = code.split('-')[0];
  return PHASE_BADGE_COLORS[prefix] || 'bg-muted text-muted-foreground';
}

interface TreeNode {
  activity: WizardActivity;
  children: TreeNode[];
  depth: number;
}

function buildTree(activities: WizardActivity[]): TreeNode[] {
  const activityMap = new Map<string, WizardActivity>();
  activities.forEach(a => activityMap.set(a.id, a));

  const childrenMap = new Map<string | null, WizardActivity[]>();
  activities.forEach(a => {
    const parentId = a.parentActivityId || null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(a);
  });

  const result: TreeNode[] = [];

  function walk(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) || [];
    children.sort((a, b) => a.activityCode.localeCompare(b.activityCode));
    for (const child of children) {
      const childChildren = childrenMap.get(child.id) || [];
      const node: TreeNode = { activity: child, children: [], depth };
      result.push(node);
      if (childChildren.length > 0) {
        walk(child.id, depth + 1);
      }
    }
  }

  walk(null, 0);
  return result;
}

export const StepActivities: React.FC<Props> = ({ activities, phase, onActivitiesChange }) => {
  const [search, setSearch] = useState('');
  const [showAddFromCatalog, setShowAddFromCatalog] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const selectedCount = activities.filter(a => a.selected).length;

  // Build tree structure
  const treeNodes = useMemo(() => buildTree(activities), [activities]);

  // Get parent IDs that have children
  const parentIds = useMemo(() => {
    const ids = new Set<string>();
    activities.forEach(a => {
      if (a.parentActivityId) ids.add(a.parentActivityId);
    });
    return ids;
  }, [activities]);

  // Filter logic - show matching items and their parents
  const filteredNodes = useMemo(() => {
    if (!search.trim()) return treeNodes;
    const query = search.toLowerCase();
    const matchingIds = new Set<string>();
    
    // Find all matching activities
    activities.forEach(a => {
      if (a.activity.toLowerCase().includes(query) || 
          a.description?.toLowerCase().includes(query) ||
          a.activityCode.toLowerCase().includes(query)) {
        matchingIds.add(a.id);
        // Also include parents
        if (a.parentActivityId) matchingIds.add(a.parentActivityId);
      }
    });

    return treeNodes.filter(n => matchingIds.has(n.activity.id));
  }, [treeNodes, activities, search]);

  const handleToggle = (id: string) => {
    onActivitiesChange(
      activities.map(a => a.id === id ? { ...a, selected: !a.selected } : a)
    );
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allSelected = activities.every(a => a.selected);
    onActivitiesChange(activities.map(a => ({ ...a, selected: !allSelected })));
  };

  // Determine visibility: a node is visible if it's a root or its parent is expanded
  const isNodeVisible = (node: TreeNode): boolean => {
    if (node.depth === 0) return true;
    // Check if parent is expanded
    const parent = activities.find(a => {
      const children = activities.filter(c => c.parentActivityId === a.id);
      return children.some(c => c.id === node.activity.id);
    });
    if (!parent) return true;
    return expandedIds.has(parent.id);
  };

  return (
    <div className="space-y-3 p-1">
      <div className="text-center space-y-1.5 pb-1">
        <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ListChecks className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Select Activities & Deliverables</h3>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>{activities.length} total</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="text-primary font-medium">{selectedCount} selected</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter activities..." className="pl-8 h-8 text-xs" />
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

      <ScrollArea className="h-[320px]">
        <div className="space-y-0.5 pr-2">
          {filteredNodes.map((node) => {
            const activity = node.activity;
            const hasChildren = parentIds.has(activity.id);
            const isExpanded = expandedIds.has(activity.id);
            const isChild = node.depth > 0;

            // Skip children of collapsed parents
            if (!isNodeVisible(node)) return null;

            return (
              <div
                key={activity.id}
                className={cn(
                  "rounded-md border transition-all",
                  activity.selected ? "bg-primary/[0.03] border-primary/20" : "bg-muted/10 border-transparent opacity-60"
                )}
                style={{ marginLeft: node.depth * 20 }}
              >
                <div className="flex items-center gap-2 px-3 py-2 group">
                  {/* Expand/collapse for parents */}
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(activity.id)}
                      className="shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </button>
                  ) : (
                    <span className="w-[18px] shrink-0" />
                  )}

                  <Checkbox
                    checked={activity.selected}
                    onCheckedChange={() => handleToggle(activity.id)}
                    className="shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-sm truncate block",
                      isChild ? "font-normal" : "font-medium"
                    )}>
                      {activity.activity}
                    </span>
                    {activity.description && isExpanded && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-4 font-mono border-0 whitespace-nowrap",
                        getCodeBadgeColor(activity.activityCode)
                      )}
                    >
                      {activity.activityCode}
                    </Badge>
                    {activity.durationDays && (
                      <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                        {activity.durationDays}d
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredNodes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No activities match your search</div>
          )}
        </div>
      </ScrollArea>

      <AddFromCatalogDialog open={showAddFromCatalog} onOpenChange={setShowAddFromCatalog} existingIds={activities.map(a => a.id)} onAdd={(newActivities) => { onActivitiesChange([...activities, ...newActivities]); setShowAddFromCatalog(false); }} />
      <AddCustomActivityDialog open={showAddCustom} onOpenChange={setShowAddCustom} phase={phase} onAdd={(activity) => { onActivitiesChange([...activities, activity]); setShowAddCustom(false); }} />
    </div>
  );
};
