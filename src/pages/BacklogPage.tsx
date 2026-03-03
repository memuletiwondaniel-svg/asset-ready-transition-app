import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Mic, MicOff, Plus, Trash2, MoreVertical, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonalBacklog, type BacklogItem } from '@/hooks/usePersonalBacklog';
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
  const [newTask, setNewTask] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const { translations: t } = useLanguage();

  const { items, isLoading, addItem, toggleStatus, updateDescription, updatePriority, deleteItem } = usePersonalBacklog(filter);
  const { isListening, startListening, stopListening, isSupported } = useVoiceInput();

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const handleAdd = () => {
    const desc = newTask.trim();
    if (!desc) return;
    addItem.mutate({ description: desc });
    setNewTask('');
    inputRef.current?.focus();
  };

  const handleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((transcript) => setNewTask((prev) => (prev ? prev + ' ' : '') + transcript));
    }
  };

  const handleEditSave = (id: string) => {
    const desc = editText.trim();
    if (desc && desc !== items.find((i) => i.id === id)?.description) {
      updateDescription.mutate({ id, description: desc });
    }
    setEditingId(null);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'done', label: 'Done' },
  ];

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const doneCount = items.filter((i) => i.status === 'done').length;

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

      {/* Add input with voice */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add a task... type or dictate"
            className="pr-10"
          />
          {isSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVoice}
              className={cn(
                'absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8',
                isListening && 'text-destructive animate-pulse'
              )}
              title={isListening ? 'Stop listening' : 'Dictate'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <Button onClick={handleAdd} disabled={!newTask.trim() || addItem.isPending} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
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

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No items yet. Add your first task above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <BacklogItemRow
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              editText={editText}
              editRef={editRef}
              onToggle={() => toggleStatus.mutate({ id: item.id, currentStatus: item.status })}
              onStartEdit={() => {
                setEditingId(item.id);
                setEditText(item.description);
              }}
              onEditChange={setEditText}
              onEditSave={() => handleEditSave(item.id)}
              onEditCancel={() => setEditingId(null)}
              onPriorityChange={(p) => updatePriority.mutate({ id: item.id, priority: p })}
              onDelete={() => deleteItem.mutate(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface BacklogItemRowProps {
  item: BacklogItem;
  isEditing: boolean;
  editText: string;
  editRef: React.RefObject<HTMLInputElement>;
  onToggle: () => void;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onPriorityChange: (p: string) => void;
  onDelete: () => void;
}

const BacklogItemRow: React.FC<BacklogItemRowProps> = ({
  item, isEditing, editText, editRef,
  onToggle, onStartEdit, onEditChange, onEditSave, onEditCancel,
  onPriorityChange, onDelete,
}) => {
  const isDone = item.status === 'done';

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors group',
      isDone && 'opacity-60'
    )}>
      <Checkbox
        checked={isDone}
        onCheckedChange={onToggle}
        className="flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            ref={editRef}
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditSave();
              if (e.key === 'Escape') onEditCancel();
            }}
            onBlur={onEditSave}
            className="h-8 text-sm"
          />
        ) : (
          <p
            onClick={onStartEdit}
            className={cn(
              'text-sm cursor-pointer truncate',
              isDone && 'line-through text-muted-foreground'
            )}
          >
            {item.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </p>
      </div>

      <Badge variant="outline" className={cn('text-[10px] flex-shrink-0', priorityColors[item.priority])}>
        {item.priority}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
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
