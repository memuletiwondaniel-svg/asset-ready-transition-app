import React, { useEffect, useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { PSSRReviewsPanel } from '@/components/tasks/PSSRReviewsPanel';
import { HandoverReviewsPanel } from '@/components/tasks/HandoverReviewsPanel';
import { ORPActivitiesPanel } from '@/components/tasks/ORPActivitiesPanel';
import { OWLPanel } from '@/components/tasks/OWLPanel';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';

const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { updateLastLogin } = useUserLastLogin();
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateLastLogin();
    }, 5000);
    return () => clearTimeout(timer);
  }, [updateLastLogin]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl p-4 md:p-6">
        <BreadcrumbNavigation currentPageLabel="My Tasks" />
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
              <ListChecks className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your pending work across all modules
              </p>
            </div>
          </div>
          
          <Button
            size="sm"
            onClick={() => setCreateTaskModalOpen(true)}
            className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PSSRReviewsPanel userId={user.id} />
          <HandoverReviewsPanel />
          <ORPActivitiesPanel />
          <OWLPanel />
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
