import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDroppable, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, MoreVertical, ClipboardList, ChevronDown, Pencil, FolderPlus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonalBacklog, type BacklogItem, type BacklogStatus } from '@/hooks/usePersonalBacklog';
import { useBacklogGroups, type BacklogGroup } from '@/hooks/useBacklogGroups';
import { useLanguage } from '@/contexts/LanguageContext';

const priorityDot: Record<string, string> = {
  high: 'bg-destructive',
  normal: 'bg-primary',
  low: 'bg-muted-foreground/40',
};

// Rotating palette for group colors
const GROUP_COLORS = [
  { border: 'border-l-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
  { border: 'border-l-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
  { border: 'border-l-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
  { border: 'border-l-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  { border: 'border-l-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
  { border: 'border-l-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400', dot: 'bg-pink-500' },
  { border: 'border-l-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  { border: 'border-l-lime-500', bg: 'bg-lime-500/10', text: 'text-lime-700 dark:text-lime-400', dot: 'bg-lime-500' },
];

const getGroupColor = (groupIndex: number) => GROUP_COLORS[groupIndex % GROUP_COLORS.length];

const COLUMNS: { id: BacklogStatus; label: string; color: string }[] = [
  { id: 'pending', label: 'To Do', color: 'border-t-blue-500' },
  { id: 'in_progress', label: 'Doing', color: 'border-t-amber-500' },
  { id: 'done', label: 'Done', color: 'border-t-emerald-500' },
];

const BacklogPage: React.FC = () => {
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [activeItem, setActiveItem] = useState<BacklogItem | null>(null);
  const { translations: t } = useLanguage();

  const { groups, isLoading: groupsLoading, addGroup, renameGroup, deleteGroup } = useBacklogGroups();
  const { items, isLoading: itemsLoading, addItem, updateStatus, updateDescription, updatePriority, deleteItem } = usePersonalBacklog();

  const isLoading = groupsLoading || itemsLoading;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Build a stable group→index map for colors
  const groupColorMap = useMemo(() => {
    const map = new Map<string, number>();
    groups.forEach((g, i) => map.set(g.id, i));
    return map;
  }, [groups]);

  // Group items by status, then by group within each status
  const columnData = useMemo(() => {
    return COLUMNS.map(col => {
      const colItems = items.filter(i => i.status === col.id);
      const grouped = groups.map((g, i) => ({
        group: g,
        colorIndex: i,
        tasks: colItems.filter(i => i.group_id === g.id),
      })).filter(g => g.tasks.length > 0);
      const ungrouped = colItems.filter(i => !i.group_id);
      return { ...col, grouped, ungrouped, total: colItems.length };
    });
  }, [items, groups]);

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find(i => i.id === event.active.id);
    setActiveItem(item || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id as string;
    const targetStatus = over.id as BacklogStatus;
    const item = items.find(i => i.id === itemId);
    if (!item || item.status === targetStatus) return;

    updateStatus.mutate({ id: itemId, status: targetStatus });
  };

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    addGroup.mutate(name);
    setNewGroupName('');
    setShowNewGroup(false);
  };

  const handleRenameGroup = (id: string) => {
    const name = renameText.trim();
    if (name) renameGroup.mutate({ id, name });
    setRenamingGroupId(null);
  };

  return (
    <div className="h-full flex flex-col px-4 py-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {(t as any).navMyBacklog || 'My Backlog'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.filter(i => i.status === 'pending').length} to do · {items.filter(i => i.status === 'in_progress').length} doing · {items.filter(i => i.status === 'done').length} done
          </p>
        </div>
        <div className="flex gap-2">
          {showNewGroup ? (
            <div className="flex gap-1.5">
              <Input
                autoFocus
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(); if (e.key === 'Escape') setShowNewGroup(false); }}
                placeholder="Group name..."
                className="h-8 w-40 text-sm"
              />
              <Button size="sm" className="h-8" onClick={handleAddGroup} disabled={!newGroupName.trim()}>Add</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowNewGroup(false)}>✕</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-8" onClick={() => setShowNewGroup(true)}>
              <FolderPlus className="h-3.5 w-3.5 mr-1" /> New Group
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4 flex-1">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0">
            {columnData.map(col => (
              <KanbanColumn
                key={col.id}
                columnId={col.id}
                label={col.label}
                colorClass={col.color}
                total={col.total}
                grouped={col.grouped}
                ungrouped={col.ungrouped}
                groups={groups}
                renamingGroupId={renamingGroupId}
                renameText={renameText}
                onStartRename={(id, name) => { setRenamingGroupId(id); setRenameText(name); }}
                onRenameChange={setRenameText}
                onRenameSave={(id) => handleRenameGroup(id)}
                onRenameCancel={() => setRenamingGroupId(null)}
                onDeleteGroup={(id) => deleteGroup.mutate(id)}
                onAddItem={(desc, groupId) => addItem.mutate({ description: desc, group_id: groupId, status: col.id })}
                onUpdateDesc={(id, desc) => updateDescription.mutate({ id, description: desc })}
                onUpdatePriority={(id, p) => updatePriority.mutate({ id, priority: p })}
                onDelete={(id) => deleteItem.mutate(id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeItem && (
              <div className="flex items-center gap-2 p-2 rounded-md border bg-card shadow-xl max-w-xs">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{activeItem.description}</span>
                <div className={cn('h-2 w-2 rounded-full flex-shrink-0', priorityDot[activeItem.priority])} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

/* ─── Kanban Column (Droppable) ─── */

interface KanbanColumnProps {
  columnId: BacklogStatus;
  label: string;
  colorClass: string;
  total: number;
  grouped: { group: BacklogGroup; colorIndex: number; tasks: BacklogItem[] }[];
  ungrouped: BacklogItem[];
  groups: BacklogGroup[];
  renamingGroupId: string | null;
  renameText: string;
  onStartRename: (id: string, name: string) => void;
  onRenameChange: (v: string) => void;
  onRenameSave: (id: string) => void;
  onRenameCancel: () => void;
  onDeleteGroup: (id: string) => void;
  onAddItem: (desc: string, groupId: string | null) => void;
  onUpdateDesc: (id: string, desc: string) => void;
  onUpdatePriority: (id: string, p: string) => void;
  onDelete: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  columnId, label, colorClass, total, grouped, ungrouped, groups,
  renamingGroupId, renameText, onStartRename, onRenameChange, onRenameSave, onRenameCancel,
  onDeleteGroup, onAddItem, onUpdateDesc, onUpdatePriority, onDelete,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [addGroupId, setAddGroupId] = useState<string | null>(null);

  const handleAdd = () => {
    const desc = newTaskDesc.trim();
    if (!desc) return;
    onAddItem(desc, addGroupId);
    setNewTaskDesc('');
    setAddingTask(false);
    setAddGroupId(null);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border border-t-4 bg-muted/30 min-h-0 transition-colors',
        colorClass,
        isOver && 'ring-2 ring-primary/40 bg-primary/5'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{total}</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => { setAddingTask(true); setAddGroupId(null); }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 px-2 pb-2">
        <div className="space-y-2">
          {/* Grouped tasks */}
          {grouped.map(({ group, tasks }) => (
            <GroupedSection
              key={group.id}
              group={group}
              tasks={tasks}
              isRenaming={renamingGroupId === group.id}
              renameText={renameText}
              onStartRename={() => onStartRename(group.id, group.name)}
              onRenameChange={onRenameChange}
              onRenameSave={() => onRenameSave(group.id)}
              onRenameCancel={onRenameCancel}
              onDeleteGroup={() => onDeleteGroup(group.id)}
              onUpdateDesc={onUpdateDesc}
              onUpdatePriority={onUpdatePriority}
              onDelete={onDelete}
            />
          ))}

          {/* Ungrouped tasks */}
          {ungrouped.map(item => (
            <TaskCard
              key={item.id}
              item={item}
              onUpdateDesc={onUpdateDesc}
              onUpdatePriority={onUpdatePriority}
              onDelete={onDelete}
            />
          ))}

          {/* Add task inline */}
          {addingTask && (
            <div className="p-2 rounded-md border bg-card space-y-1.5">
              <Input
                autoFocus
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAddingTask(false); setNewTaskDesc(''); } }}
                placeholder="Task description..."
                className="h-8 text-sm"
              />
              {groups.length > 0 && (
                <select
                  value={addGroupId || ''}
                  onChange={e => setAddGroupId(e.target.value || null)}
                  className="w-full h-7 text-xs rounded border bg-background px-2"
                >
                  <option value="">No group</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAdd} disabled={!newTaskDesc.trim()}>Add</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingTask(false); setNewTaskDesc(''); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

/* ─── Grouped Section (collapsible within a column) ─── */

interface GroupedSectionProps {
  group: BacklogGroup;
  tasks: BacklogItem[];
  isRenaming: boolean;
  renameText: string;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onDeleteGroup: () => void;
  onUpdateDesc: (id: string, desc: string) => void;
  onUpdatePriority: (id: string, p: string) => void;
  onDelete: (id: string) => void;
}

const GroupedSection: React.FC<GroupedSectionProps> = ({
  group, tasks, isRenaming, renameText,
  onStartRename, onRenameChange, onRenameSave, onRenameCancel,
  onDeleteGroup, onUpdateDesc, onUpdatePriority, onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-md border bg-card/50">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0">
            <ChevronDown className={cn("h-3 w-3 transition-transform", !isOpen && "-rotate-90")} />
          </Button>
        </CollapsibleTrigger>

        {isRenaming ? (
          <Input
            autoFocus
            value={renameText}
            onChange={e => onRenameChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onRenameSave(); if (e.key === 'Escape') onRenameCancel(); }}
            onBlur={onRenameSave}
            className="h-6 text-xs flex-1"
          />
        ) : (
          <span className="text-xs font-medium flex-1 text-muted-foreground">{group.name}</span>
        )}

        <Badge variant="outline" className="text-[9px] h-4 px-1">{tasks.length}</Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0">
              <MoreVertical className="h-2.5 w-2.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={onStartRename} className="text-xs">
              <Pencil className="h-3 w-3 mr-1.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteGroup} className="text-xs text-destructive">
              <Trash2 className="h-3 w-3 mr-1.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CollapsibleContent>
        <div className="px-1.5 pb-1.5 space-y-1">
          {tasks.map(item => (
            <TaskCard
              key={item.id}
              item={item}
              onUpdateDesc={onUpdateDesc}
              onUpdatePriority={onUpdatePriority}
              onDelete={onDelete}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/* ─── Draggable Task Card ─── */

interface TaskCardProps {
  item: BacklogItem;
  onUpdateDesc: (id: string, desc: string) => void;
  onUpdatePriority: (id: string, p: string) => void;
  onDelete: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ item, onUpdateDesc, onUpdatePriority, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.description);
  const editRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });

  useEffect(() => { if (isEditing && editRef.current) editRef.current.focus(); }, [isEditing]);

  const handleSave = () => {
    const desc = editText.trim();
    if (desc && desc !== item.description) onUpdateDesc(item.id, desc);
    setIsEditing(false);
  };

  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-1.5 p-2 rounded-md border bg-card transition-all group cursor-default',
        isDragging && 'opacity-30 shadow-lg z-50',
        item.status === 'done' && 'opacity-60'
      )}
    >
      <button {...listeners} {...attributes} className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground">
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            ref={editRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
            onBlur={handleSave}
            className="h-6 text-xs"
          />
        ) : (
          <p
            onClick={() => { setIsEditing(true); setEditText(item.description); }}
            className={cn('text-xs cursor-pointer leading-snug', item.status === 'done' && 'line-through text-muted-foreground')}
          >
            {item.description}
          </p>
        )}
      </div>

      <div className={cn('h-2 w-2 rounded-full flex-shrink-0 mt-1', priorityDot[item.priority])} title={item.priority} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 flex-shrink-0">
            <MoreVertical className="h-2.5 w-2.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem className="text-xs" onClick={() => onUpdatePriority(item.id, 'high')}>🔴 High</DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => onUpdatePriority(item.id, 'normal')}>🔵 Normal</DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onClick={() => onUpdatePriority(item.id, 'low')}>⚪ Low</DropdownMenuItem>
          <DropdownMenuItem className="text-xs text-destructive" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-3 w-3 mr-1.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default BacklogPage;
