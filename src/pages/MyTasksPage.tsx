import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, Plus, Search, CheckCircle2 } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { UnifiedTaskList } from '@/components/tasks/UnifiedTaskList';
import { RecentlyCompletedTasks } from '@/components/tasks/RecentlyCompletedTasks';
import { DirectorSoFView } from '@/components/tasks/DirectorSoFView';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { useUserIsDirector } from '@/hooks/useUserIsDirector';
import { Skeleton } from '@/components/ui/skeleton';

const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { updateLastLogin } = useUserLastLogin();
  const { data: isDirector, isLoading: isDirectorLoading } = useUserIsDirector();
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setCreateTaskModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* Unified task list */}
        <UnifiedTaskList
          searchQuery={searchQuery}
          userId={user.id}
        />

        {/* Recently completed */}
        <div className="mt-8">
          <RecentlyCompletedTasks searchQuery={searchQuery} />
        </div>
      </div>

      <NewTaskModal
        open={createTaskModalOpen}
        onOpenChange={setCreateTaskModalOpen}
      />
    </div>
  );
};

export default MyTasksPage;
