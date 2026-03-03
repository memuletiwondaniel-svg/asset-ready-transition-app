import React, { useState, useRef, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, useDroppable, type DragOverEvent } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Mic, MicOff, Plus, Trash2, MoreVertical, ClipboardList, ChevronDown, Pencil, FolderPlus, GripVertical, CheckCircle2, Circle, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonalBacklog, type BacklogItem } from '@/hooks/usePersonalBacklog';
import { useBacklogGroups, type BacklogGroup } from '@/hooks/useBacklogGroups';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';

const priorityColors: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  normal: 'bg-primary/10 text-primary border-primary/30',
  low: 'bg-muted text-muted-foreground border-border',
};

type FilterType = 'all' | 'pending' | 'done';

const BacklogPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [activeItem, setActiveItem] = useState<BacklogItem | null>(null);
  const { translations: t } = useLanguage();

  const { groups, isLoading: groupsLoading, addGroup, renameGroup, deleteGroup } = useBacklogGroups();
  const { items, isLoading: itemsLoading, addItem, toggleStatus, updateDescription, updatePriority, deleteItem, moveToGroup } = usePersonalBacklog(filter);

  const isLoading = groupsLoading || itemsLoading;

  const groupedItems = groups.map(g => ({
    group: g,
    tasks: items.filter(i => i.group_id === g.id),
  }));
  const ungroupedItems = items.filter(i => !i.group_id);

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find(i => i.id === event.active.id);
    setActiveItem(item || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id as string;
    const targetGroupId = over.id as string;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // "ungrouped" is our sentinel for null group_id
    const newGroupId = targetGroupId === 'ungrouped' ? null : targetGroupId;
    if (item.group_id === newGroupId) return;

    moveToGroup.mutate({ id: itemId, group_id: newGroupId });
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

  const handleMoveToGroup = (itemId: string, groupId: string | null) => {
    moveToGroup.mutate({ id: itemId, group_id: groupId });
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'done', label: 'Done' },
  ];

  // Build move targets: all groups + ungrouped
  const moveTargets: { id: string | null; name: string }[] = [
    ...groups.map(g => ({ id: g.id as string | null, name: g.name })),
    { id: null, name: 'Ungrouped' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          {(t as any).navMyBacklog || 'My Backlog'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pendingCount} pending · {doneCount} done
        </p>
      </div>

      {/* Top actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-2">
          {filters.map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.key)}
              className="rounded-full"
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={() => setShowNewGroup(true)}>
            <FolderPlus className="h-4 w-4 mr-1" /> New Group
          </Button>
        </div>
      </div>

      {/* New group input */}
      {showNewGroup && (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(); if (e.key === 'Escape') setShowNewGroup(false); }}
            placeholder="Group name..."
            className="flex-1"
          />
          <Button size="sm" onClick={handleAddGroup} disabled={!newGroupName.trim()}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewGroup(false)}>Cancel</Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="space-y-4">
            {groupedItems.map(({ group, tasks }) => (
              <TaskGroupSection
                key={group.id}
                groupId={group.id}
                groupName={group.name}
                tasks={tasks}
                allGroups={moveTargets}
                isRenaming={renamingGroupId === group.id}
                renameText={renameText}
                onStartRename={() => { setRenamingGroupId(group.id); setRenameText(group.name); }}
                onRenameChange={setRenameText}
                onRenameSave={() => handleRenameGroup(group.id)}
                onRenameCancel={() => setRenamingGroupId(null)}
                onDeleteGroup={() => deleteGroup.mutate(group.id)}
                onAddItem={(desc) => addItem.mutate({ description: desc, group_id: group.id })}
                onToggle={(id, status) => toggleStatus.mutate({ id, currentStatus: status })}
                onUpdateDesc={(id, desc) => updateDescription.mutate({ id, description: desc })}
                onUpdatePriority={(id, p) => updatePriority.mutate({ id, priority: p })}
                onDelete={(id) => deleteItem.mutate(id)}
                onMoveToGroup={handleMoveToGroup}
              />
            ))}

            {(ungroupedItems.length > 0 || groupedItems.length === 0) && (
              <TaskGroupSection
                groupId={null}
                groupName="Ungrouped"
                tasks={ungroupedItems}
                allGroups={moveTargets}
                isRenaming={false}
                renameText=""
                onStartRename={() => {}}
                onRenameChange={() => {}}
                onRenameSave={() => {}}
                onRenameCancel={() => {}}
                onDeleteGroup={undefined}
                onAddItem={(desc) => addItem.mutate({ description: desc, group_id: null })}
                onToggle={(id, status) => toggleStatus.mutate({ id, currentStatus: status })}
                onUpdateDesc={(id, desc) => updateDescription.mutate({ id, description: desc })}
                onUpdatePriority={(id, p) => updatePriority.mutate({ id, priority: p })}
                onDelete={(id) => deleteItem.mutate(id)}
                onMoveToGroup={handleMoveToGroup}
              />
            )}
          </div>

          <DragOverlay>
            {activeItem && (
              <div className="flex items-center gap-2 p-2 rounded-md border bg-card shadow-lg opacity-90">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm truncate">{activeItem.description}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

/* ─── Task Group Section (Droppable) ─── */

interface TaskGroupSectionProps {
  groupId: string | null;
  groupName: string;
  tasks: BacklogItem[];
  allGroups: { id: string | null; name: string }[];
  isRenaming: boolean;
  renameText: string;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onDeleteGroup?: () => void;
  onAddItem: (desc: string) => void;
  onToggle: (id: string, status: string) => void;
  onUpdateDesc: (id: string, desc: string) => void;
  onUpdatePriority: (id: string, p: string) => void;
  onDelete: (id: string) => void;
  onMoveToGroup: (itemId: string, groupId: string | null) => void;
}

const TaskGroupSection: React.FC<TaskGroupSectionProps> = ({
  groupId, groupName, tasks, allGroups, isRenaming, renameText,
  onStartRename, onRenameChange, onRenameSave, onRenameCancel,
  onDeleteGroup, onAddItem, onToggle, onUpdateDesc, onUpdatePriority, onDelete, onMoveToGroup,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [newTask, setNewTask] = useState('');
  const { isListening, startListening, stopListening, isSupported } = useVoiceInput();

  const droppableId = groupId || 'ungrouped';
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const handleAdd = () => {
    const desc = newTask.trim();
    if (!desc) return;
    onAddItem(desc);
    setNewTask('');
  };

  const handleVoice = () => {
    if (isListening) stopListening();
    else startListening((transcript) => setNewTask(prev => (prev ? prev + ' ' : '') + transcript));
  };

  // Filter out current group from move targets
  const otherGroups = allGroups.filter(g => g.id !== groupId);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        ref={setNodeRef}
        className={cn(
          "border rounded-lg bg-card transition-colors",
          isOver && "ring-2 ring-primary/50 bg-primary/5"
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <ChevronDown className={cn("h-4 w-4 transition-transform", !isOpen && "-rotate-90")} />
            </Button>
          </CollapsibleTrigger>

          {isRenaming ? (
            <Input
              autoFocus
              value={renameText}
              onChange={e => onRenameChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onRenameSave(); if (e.key === 'Escape') onRenameCancel(); }}
              onBlur={onRenameSave}
              className="h-7 text-sm flex-1"
            />
          ) : (
            <span className="text-sm font-medium flex-1">{groupName}</span>
          )}

          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>

          {groupId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={onStartRename}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                </DropdownMenuItem>
                {onDeleteGroup && (
                  <DropdownMenuItem onClick={onDeleteGroup} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Group
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-1.5">
            {tasks.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">No tasks in this group</p>
            )}
            {tasks.map(item => (
              <DraggableBacklogItem
                key={item.id}
                item={item}
                otherGroups={otherGroups}
                onToggle={() => onToggle(item.id, item.status)}
                onUpdateDesc={(desc) => onUpdateDesc(item.id, desc)}
                onPriorityChange={(p) => onUpdatePriority(item.id, p)}
                onDelete={() => onDelete(item.id)}
                onMoveToGroup={(gId) => onMoveToGroup(item.id, gId)}
              />
            ))}

            {/* Inline add */}
            <div className="flex gap-1.5 pt-1">
              <div className="relative flex-1">
                <Input
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Add a task..."
                  className="h-8 text-sm pr-8"
                />
                {isSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleVoice}
                    className={cn('absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7', isListening && 'text-destructive animate-pulse')}
                  >
                    {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
              <Button size="icon" className="h-8 w-8" onClick={handleAdd} disabled={!newTask.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

/* ─── Draggable Item Row ─── */

interface DraggableBacklogItemProps {
  item: BacklogItem;
  otherGroups: { id: string | null; name: string }[];
  onToggle: () => void;
  onUpdateDesc: (desc: string) => void;
  onPriorityChange: (p: string) => void;
  onDelete: () => void;
  onMoveToGroup: (groupId: string | null) => void;
}

const DraggableBacklogItem: React.FC<DraggableBacklogItemProps> = ({
  item, otherGroups, onToggle, onUpdateDesc, onPriorityChange, onDelete, onMoveToGroup,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.description);
  const editRef = useRef<HTMLInputElement>(null);
  const isDone = item.status === 'done';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });

  useEffect(() => { if (isEditing && editRef.current) editRef.current.focus(); }, [isEditing]);

  const handleSave = () => {
    const desc = editText.trim();
    if (desc && desc !== item.description) onUpdateDesc(desc);
    setIsEditing(false);
  };

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md border bg-background transition-colors group',
        isDone && 'opacity-60',
        isDragging && 'opacity-40 shadow-lg z-50'
      )}
    >
      {/* Drag handle */}
      <button {...listeners} {...attributes} className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground">
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <Checkbox checked={isDone} onCheckedChange={onToggle} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            ref={editRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
            onBlur={handleSave}
            className="h-7 text-sm"
          />
        ) : (
          <p
            onClick={() => { setIsEditing(true); setEditText(item.description); }}
            className={cn('text-sm cursor-pointer truncate', isDone && 'line-through text-muted-foreground')}
          >
            {item.description}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
      </div>
      <Badge variant="outline" className={cn('text-[10px] flex-shrink-0', priorityColors[item.priority])}>{item.priority}</Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onToggle}>
            {isDone ? <Circle className="h-3.5 w-3.5 mr-2" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
            {isDone ? 'Mark Pending' : 'Mark Complete'}
          </DropdownMenuItem>
          {otherGroups.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Move to…
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {otherGroups.map(g => (
                  <DropdownMenuItem key={g.id ?? 'ungrouped'} onClick={() => onMoveToGroup(g.id)}>
                    {g.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem onClick={() => onPriorityChange('high')}>🔴 High</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPriorityChange('normal')}>🔵 Normal</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPriorityChange('low')}>⚪ Low</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default BacklogPage;
