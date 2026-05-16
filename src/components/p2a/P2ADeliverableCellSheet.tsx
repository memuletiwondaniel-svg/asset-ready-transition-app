import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, Circle, MinusCircle, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Project } from '@/hooks/useProjects';

interface Deliverable {
  id: string;
  deliverable_name: string;
  delivering_party?: string;
  status: string;
  completion_date?: string;
  comments?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project: Project | null;
  categoryName: string;
  items: Deliverable[];
}

const statusInfo = (s: string) => {
  switch (s) {
    case 'COMPLETED': return { icon: CheckCircle2, label: 'Completed', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
    case 'IN_PROGRESS': return { icon: Clock, label: 'In progress', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' };
    case 'BEHIND_SCHEDULE':
    case 'OVERDUE': return { icon: AlertTriangle, label: 'Behind schedule', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };
    case 'NOT_APPLICABLE': return { icon: MinusCircle, label: 'N/A', dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' };
    default: return { icon: Circle, label: 'Not started', dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' };
  }
};

export function P2ADeliverableCellSheet({ open, onOpenChange, project, categoryName, items }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <Badge variant="outline" className="self-start text-[10px]">{items.length} deliverables</Badge>
          <SheetTitle className="text-lg leading-tight">{categoryName}</SheetTitle>
          {project && (
            <SheetDescription className="text-xs">
              {project.project_id_prefix}-{project.project_id_number} · {project.project_title}
            </SheetDescription>
          )}
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <ul className="space-y-2">
            {items.map((d) => {
              const meta = statusInfo(d.status);
              const Icon = meta.icon;
              return (
                <li key={d.id} className="p-3.5 rounded-xl border border-border/60 bg-card">
                  <div className="flex items-start gap-2.5">
                    <span className={cn('mt-1 h-2 w-2 rounded-full shrink-0', meta.dot)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug">{d.deliverable_name}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 font-medium', meta.text)}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        {d.delivering_party && (
                          <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{d.delivering_party}</span>
                        )}
                        {d.completion_date && (
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(d.completion_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                      {d.comments && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{d.comments}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
