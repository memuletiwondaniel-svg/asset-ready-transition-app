import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { BookOpen, Clock, CheckCircle2, FileText, Loader2 } from 'lucide-react';

interface SessionsHistoryPanelProps {
  sessions: any[];
  isLoading: boolean;
  agentName?: string;
}

const SessionsHistoryPanel: React.FC<SessionsHistoryPanelProps> = ({
  sessions,
  isLoading,
  agentName,
}) => {
  const completedSessions = sessions.filter((s: any) => s.status === 'completed');
  const inProgressSessions = sessions.filter((s: any) => s.status !== 'completed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <BookOpen className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No training sessions yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Start a training session with {agentName || 'this agent'} to build knowledge
        </p>
      </div>
    );
  }

  const renderSession = (session: any) => {
    const isCompleted = session.status === 'completed';
    const date = session.completed_at || session.created_at;
    const keyLearnings = session.key_learnings;
    const tags = session.extracted_tags || session.tags || [];
    const messageCount = session.message_count || 0;
    const docName = session.document_name;

    return (
      <div
        key={session.id}
        className={cn(
          "px-4 py-3.5 border-b border-border/10",
          "transition-all duration-200 ease-out",
          "hover:bg-gradient-to-r hover:from-muted/60 hover:to-transparent",
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
            isCompleted
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-amber-100 dark:bg-amber-900/30"
          )}>
            {isCompleted
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              : <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {docName || 'Training Session'}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1.5 py-0 h-4 font-normal border-transparent shrink-0",
                  isCompleted
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}
              >
                {isCompleted ? 'Completed' : 'In Progress'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
              <span>{formatDistanceToNow(new Date(date), { addSuffix: true })}</span>
              {messageCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <FileText className="h-2.5 w-2.5" />
                  {messageCount} messages
                </span>
              )}
            </div>

            {keyLearnings && (
              <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">
                {keyLearnings}
              </p>
            )}

            {tags.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {tags.slice(0, 4).map((tag: string, i: number) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0 h-4 bg-muted/50 text-muted-foreground font-normal"
                  >
                    {tag}
                  </Badge>
                ))}
                {tags.length > 4 && (
                  <span className="text-[9px] text-muted-foreground/40">+{tags.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* Stats bar */}
      <div className="px-4 py-3 border-b border-border/30 bg-muted/10">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {completedSessions.length} completed
          </span>
          {inProgressSessions.length > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              {inProgressSessions.length} in progress
            </span>
          )}
        </div>
      </div>

      {sessions.map(renderSession)}
    </div>
  );
};

export default SessionsHistoryPanel;
