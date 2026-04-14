import React, { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Search, Kanban, FolderOpen, Layers, BookOpen, PenLine, TableProperties } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddActivityDialog } from '@/components/tasks/AddActivityDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { TaskTableView } from '@/components/tasks/TaskTableView';
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

type ViewMode = 'kanban' | 'table';
type GroupBy = 'none' | 'project' | 'category';

const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { updateLastLogin } = useUserLastLogin();
  const { data: isDirector, isLoading: isDirectorLoading } = useUserIsDirector();
  const { translations: t } = useLanguage();
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [addActivityMode, setAddActivityMode] = useState<'catalog' | 'custom'>('catalog');
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

  if (isDirector && !isDirectorLoading) {
    const userName = user.user_metadata?.full_name || user.user_metadata?.first_name || user.email;
    return (
      <div className="min-h-screen">
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
          <BreadcrumbNavigation currentPageLabel={t.myTasksPageTitle || 'My Tasks'} />
          <div className="flex items-center gap-3 mt-4">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80">
              <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold text-foreground">{t.myTasksPageTitle || 'My Tasks'}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t.myTasksPageSubtitle || 'Your pending work across all modules'}</p>
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
        <div className="border-b border-border/50 bg-card/60 backdrop-blur-xl p-3 sm:p-4 md:p-6">
        <BreadcrumbNavigation currentPageLabel={t.myTasksPageTitle || 'My Tasks'} />
        <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
           <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shrink-0">
            <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl xl:text-3xl font-bold text-foreground truncate">{t.myTasksPageTitle || 'My Tasks'}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">{t.myTasksPageSubtitle || 'Your pending work across all modules'}</p>
          </div>
        </div>
      </div>

      <div className={cn("mx-auto px-3 sm:px-6 py-4 sm:py-6", viewMode === 'kanban' ? 'max-w-[1400px]' : viewMode === 'table' ? 'max-w-6xl' : 'max-w-4xl')}>
        {/* Toolbar - hidden for table view since it has its own filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.searchTasksPlaceholder || 'Search tasks...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 sm:h-10 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            {/* Group by dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  {groupBy === 'project' ? <FolderOpen className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setGroupBy('none')}>
                  {t.noGrouping || 'No Grouping'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('project')}>
                  <FolderOpen className="h-3.5 w-3.5 mr-2" />
                  {t.groupByProject || 'By Project'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy('category')}>
                  <Layers className="h-3.5 w-3.5 mr-2" />
                  {t.groupByCategory || 'By Category'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View toggle */}
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} size="sm">
              <ToggleGroupItem value="kanban" aria-label={t.boardView || 'Board view'} className="px-2">
                <Kanban className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view" className="px-2">
                <TableProperties className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Spacer */}
            <div className="w-4" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> {t.addActivity || 'Add Activity'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setAddActivityMode('catalog'); setAddActivityOpen(true); }}>
                  <BookOpen className="h-4 w-4 mr-2" /> {t.fromCatalog || 'From Catalog'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setAddActivityMode('custom'); setAddActivityOpen(true); }}>
                  <PenLine className="h-4 w-4 mr-2" /> {t.customActivity || 'Custom Activity'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'table' ? (
          <TaskTableView
            searchQuery={searchQuery}
            userId={user.id}
            groupBy={groupBy}
          />
        ) : (
          <KanbanView userId={user.id} searchQuery={searchQuery} groupBy={groupBy} />
        )}
      </div>

      <AddActivityDialog
        open={addActivityOpen}
        onOpenChange={setAddActivityOpen}
        mode={addActivityMode}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-48 sm:h-64 w-full rounded-xl" />
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
