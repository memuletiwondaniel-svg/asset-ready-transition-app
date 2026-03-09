import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface CompletedTask {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  updated_at: string;
  created_at: string;
}

export const RecentlyCompletedTasks: React.FC<{ searchQuery?: string }> = ({ searchQuery = '' }) => {
  const { user } = useAuth();
  const { translations: t } = useLanguage();
  const [expanded, setExpanded] = React.useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['completed-tasks', user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('user_tasks')
        .select('id, title, description, type, priority, status, updated_at, created_at, metadata')
        .eq('user_id', user!.id)
        .in('status', ['completed', 'cancelled'])
        .gte('updated_at', sevenDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      // Filter out auto-completed tasks (completed by someone else)
      return ((data || []) as any[]).filter(t => {
        const meta = t.metadata as Record<string, any> | null;
        return !meta?.auto_completed;
      }) as CompletedTask[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const filtered = tasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
  });

  if (isLoading || filtered.length === 0) return null;

  const displayTasks = expanded ? filtered : filtered.slice(0, 3);

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'review':
        return <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600">Review</Badge>;
      case 'approval':
        return <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600">Approval</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{type}</Badge>;
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Activities
          </h3>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {filtered.length}
          </Badge>
        </div>
        {filtered.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7 gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show all <ChevronDown className="h-3 w-3" /></>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {displayTasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border bg-card/30",
              "opacity-70 hover:opacity-100 transition-opacity"
            )}
          >
            {getStatusIcon(task.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {getTypeBadge(task.type)}
                <span className="text-sm text-foreground truncate">
                  {task.title}
                </span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
