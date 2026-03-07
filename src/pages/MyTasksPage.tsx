import React, { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Search, LayoutList, Kanban, FolderOpen, Layers } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { UnifiedTaskList } from '@/components/tasks/UnifiedTaskList';
import { TaskKanbanBoard } from '@/components/tasks/TaskKanbanBoard';
import { RecentlyCompletedTasks } from '@/components/tasks/RecentlyCompletedTasks';
import { DirectorSoFView } from '@/components/tasks/DirectorSoFView';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { useUserIsDirector } from '@/hooks/useUserIsDirector';
import { useUnifiedTasks } from '@/components/tasks/useUnifiedTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'kanban';
type GroupBy = 'none' | 'project' | 'category';

const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { updateLastLogin } = useUserLastLogin();
  const { data: isDirector, isLoading: isDirectorLoading } = useUserIsDirector();
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  useEffect(() => {
    const timer = setTimeout(() => {
      updateLastLogin();
    }, 5000);
    return () => clearTimeout(timer);
  }, [updateLastLogin]);

  if (!user) return null;

  if (isDirectorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (isDirector) {
    const userName = user.user_metadata?.full_name || user.user_metadata?.first_name || user.email;
    return (
      <div className="min-h-screen">
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
          <BreadcrumbNavigation currentPageLabel="My Tasks" />
          <div className="flex items-center gap-3 mt-4">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
              <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
              <p className="text-sm text-muted-foreground mt-1">Your pending work across all modules</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <DirectorSoFView userName={userName} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
        <BreadcrumbNavigation currentPageLabel="My Tasks" />
        <div className="flex items-center gap-3 mt-4">
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
            <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">Your pending work across all modules</p>
          </div>
        </div>
      </div>

      <div className={cn("mx-auto px-3 sm:px-6 py-4 sm:py-6", viewMode === 'kanban' ? 'max-w-[1400px]' : 'max-w-4xl')}>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 sm:h-10 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            {/* Group by dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  {groupBy === 'project' ? <FolderOpen className="h-3.5 w-3.5" /> : groupBy === 'category' ? <Layers className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                  {groupBy === 'none' ? 'Group' : groupBy === 'project' ? 'By Project' : 'By Category'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setGroupBy('none')}>
                  No Grouping
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('project')}>
                  <FolderOpen className="h-3.5 w-3.5 mr-2" />
                  By Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('category')}>
                  <Layers className="h-3.5 w-3.5 mr-2" />
                  By Category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View toggle */}
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} size="sm">
              <ToggleGroupItem value="list" aria-label="List view" className="px-2">
                <LayoutList className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="kanban" aria-label="Board view" className="px-2">
                <Kanban className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              size="sm"
              onClick={() => setCreateTaskModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          <>
            <UnifiedTaskList
              searchQuery={searchQuery}
              userId={user.id}
              groupBy={groupBy}
            />
            <div className="mt-8">
              <RecentlyCompletedTasks searchQuery={searchQuery} />
            </div>
          </>
        ) : (
          <KanbanView userId={user.id} searchQuery={searchQuery} groupBy={groupBy} />
        )}
      </div>

      <NewTaskModal
        open={createTaskModalOpen}
        onOpenChange={setCreateTaskModalOpen}
      />
    </div>
  );
};

// Separate component to use hooks properly
const KanbanView: React.FC<{ userId: string; searchQuery: string; groupBy: GroupBy }> = ({ userId, searchQuery, groupBy }) => {
  const { allTasks, isLoading, updateTaskStatus } = useUnifiedTasks(userId);

  const filteredTasks = React.useMemo(() => {
    if (!searchQuery.trim()) return allTasks;
    const q = searchQuery.toLowerCase();
    return allTasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.subtitle?.toLowerCase().includes(q) ||
      t.project?.toLowerCase().includes(q) ||
      t.categoryLabel.toLowerCase().includes(q)
    );
  }, [allTasks, searchQuery]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <TaskKanbanBoard
      tasks={filteredTasks}
      activeFilter="all"
      groupBy={groupBy}
      onUpdateTaskStatus={updateTaskStatus}
    />
  );
};

export default MyTasksPage;
