import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronRight, AlertTriangle, CheckCircle2, Clock, XCircle, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectQualificationsById, type ProjectQualification } from '@/hooks/useProjectQualificationsById';
import { QualificationDetailSheet } from '@/components/p2a-workspace/handover-points/QualificationDetailSheet';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectTitle?: string;
}

const statusMeta = (s: ProjectQualification['status']) => {
  switch (s) {
    case 'APPROVED': return { label: 'Approved', icon: CheckCircle2, dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
    case 'REJECTED': return { label: 'Rejected', icon: XCircle, dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };
    default: return { label: 'Pending', icon: Clock, dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
  }
};

export function ProjectQualificationsSheet({ open, onOpenChange, projectId, projectTitle }: Props) {
  const { data: quals = [], isLoading } = useProjectQualificationsById(open ? projectId : null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProjectQualification | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return quals;
    const q = query.toLowerCase();
    return quals.filter(qq =>
      qq.reason?.toLowerCase().includes(q) ||
      qq.mitigation?.toLowerCase().includes(q) ||
      qq.follow_up_action?.toLowerCase().includes(q) ||
      qq.action_owner_name?.toLowerCase().includes(q) ||
      qq.prerequisite?.summary?.toLowerCase().includes(q) ||
      qq.handover_point?.vcr_code?.toLowerCase().includes(q) ||
      qq.handover_point?.name?.toLowerCase().includes(q)
    );
  }, [quals, query]);

  const counts = useMemo(() => ({
    pending: quals.filter(q => q.status === 'PENDING').length,
    approved: quals.filter(q => q.status === 'APPROVED').length,
    rejected: quals.filter(q => q.status === 'REJECTED').length,
  }), [quals]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <Badge variant="outline" className="text-xs">{quals.length} total</Badge>
            </div>
            <SheetTitle className="text-lg leading-tight">Qualifications</SheetTitle>
            {projectTitle && (
              <SheetDescription className="text-xs">{projectTitle}</SheetDescription>
            )}
            <div className="flex items-center gap-3 pt-2 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> {counts.pending} Pending</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {counts.approved} Approved</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> {counts.rejected} Rejected</span>
            </div>
            <div className="relative pt-3">
              <Search className="absolute left-3 top-[1.125rem] h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search reason, mitigation, owner, VCR..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {query ? 'No matches' : 'No qualifications yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {query
                    ? 'Try a different search term.'
                    : 'Qualifications raised against VCR prerequisites will appear here.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((q) => {
                  const meta = statusMeta(q.status);
                  const Icon = meta.icon;
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(q)}
                        className="group w-full text-left p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <span className={cn('mt-0.5 h-2 w-2 rounded-full shrink-0', meta.dot)} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide', meta.text)}>
                                  <Icon className="h-3 w-3" />
                                  {meta.label}
                                </span>
                                {q.handover_point?.vcr_code && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                                    {q.handover_point.vcr_code}
                                  </Badge>
                                )}
                              </div>
                              {q.prerequisite?.summary && (
                                <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                                  {q.prerequisite.summary}
                                </p>
                              )}
                              <p className="text-sm text-foreground line-clamp-2 leading-snug">
                                {q.reason}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                                {q.action_owner_name && (
                                  <span className="flex items-center gap-1 truncate max-w-[160px]">
                                    <User className="h-3 w-3" />
                                    {q.action_owner_name}
                                  </span>
                                )}
                                {q.target_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(q.target_date), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <QualificationDetailSheet
        qualification={selected as any}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </>
  );
}
