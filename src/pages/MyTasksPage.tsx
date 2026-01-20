import React, { useEffect } from 'react';
import { ListChecks } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbList, 
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';
import { PSSRReviewsPanel } from '@/components/tasks/PSSRReviewsPanel';
import { HandoverReviewsPanel } from '@/components/tasks/HandoverReviewsPanel';
import { ORPActivitiesPanel } from '@/components/tasks/ORPActivitiesPanel';
import { OWLPanel } from '@/components/tasks/OWLPanel';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';

const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { updateLastLogin } = useUserLastLogin();

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
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="space-y-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-muted-foreground">My Tasks</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
                <p className="text-sm text-muted-foreground">
                  Your pending work across all modules
                </p>
              </div>
            </div>
          </div>
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
    </div>
  );
};

export default MyTasksPage;
