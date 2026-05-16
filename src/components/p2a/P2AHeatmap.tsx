import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { P2ADeliverableCellSheet } from './P2ADeliverableCellSheet';
import type { Project } from '@/hooks/useProjects';

interface Category { id: string; name: string; display_order: number; }
interface Deliverable {
  id: string;
  handover_id: string;
  category_id: string;
  status: string;
  deliverable_name: string;
  delivering_party?: string;
  completion_date?: string;
  comments?: string;
}

// project_id -> category_id -> list of deliverables
type Matrix = Record<string, Record<string, Deliverable[]>>;

interface Props {
  projects: Project[];
  onProjectClick?: (projectId: string) => void;
}

function statusBuckets(items: Deliverable[]) {
  return items.reduce(
    (acc, d) => {
      acc.total++;
      if (d.status === 'COMPLETED') acc.completed++;
      else if (d.status === 'IN_PROGRESS') acc.inProgress++;
      else if (d.status === 'BEHIND_SCHEDULE' || d.status === 'OVERDUE') acc.behind++;
      else if (d.status === 'NOT_APPLICABLE') acc.notApplicable++;
      else acc.notStarted++;
      return acc;
    },
    { total: 0, completed: 0, inProgress: 0, behind: 0, notStarted: 0, notApplicable: 0 }
  );
}

function cellTone(pct: number, total: number) {
  if (total === 0) return 'bg-muted/20 text-muted-foreground/60 border-dashed';
  if (pct >= 75) return 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  if (pct >= 25) return 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/30';
  if (pct > 0) return 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/30';
  return 'bg-muted/40 hover:bg-muted/60 text-muted-foreground border-border/60';
}

export function P2AHeatmap({ projects, onProjectClick }: Props) {
  const [openCell, setOpenCell] = useState<{ project: Project; category: Category; items: Deliverable[] } | null>(null);

  const projectIds = useMemo(() => projects.map(p => p.id), [projects]);

  const { data, isLoading } = useQuery({
    queryKey: ['p2a-heatmap-matrix', projectIds.sort().join(',')],
    enabled: projectIds.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<{ matrix: Matrix; categories: Category[] }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const [{ data: cats }, { data: plans }] = await Promise.all([
        client
          .from('p2a_deliverable_categories')
          .select('id, name, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        client
          .from('p2a_handover_plans')
          .select('id, project_id')
          .in('project_id', projectIds),
      ]);

      const categories: Category[] = cats || [];
      const planToProject = new Map<string, string>((plans || []).map((p: any) => [p.id, p.project_id]));
      const planIds = (plans || []).map((p: any) => p.id);

      let deliverables: any[] = [];
      if (planIds.length) {
        const { data: dels } = await client
          .from('p2a_handover_deliverables')
          .select('id, handover_id, category_id, status, deliverable_name, delivering_party, completion_date, comments')
          .in('handover_id', planIds);
        deliverables = dels || [];
      }

      const matrix: Matrix = {};
      deliverables.forEach((d) => {
        const projectId = planToProject.get(d.handover_id);
        if (!projectId) return;
        matrix[projectId] = matrix[projectId] || {};
        matrix[projectId][d.category_id] = matrix[projectId][d.category_id] || [];
        matrix[projectId][d.category_id].push(d);
      });

      return { matrix, categories };
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
      </div>
    );
  }

  const categories = data?.categories ?? [];
  const matrix = data?.matrix ?? {};

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card p-12 text-center text-sm text-muted-foreground">
        No deliverable categories configured.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 backdrop-blur text-left text-[11px] font-medium text-muted-foreground uppercase tracking-[0.08em] px-4 py-3 border-b border-border/60 min-w-[220px]">
                  Project
                </th>
                {categories.map((c) => (
                  <th
                    key={c.id}
                    className="text-center text-[11px] font-medium text-muted-foreground uppercase tracking-[0.06em] px-2 py-3 border-b border-border/60 min-w-[110px]"
                  >
                    <span className="block truncate" title={c.name}>{c.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const row = matrix[project.id] || {};
                return (
                  <tr key={project.id} className="group hover:bg-muted/20 transition-colors">
                    <td
                      className="sticky left-0 z-10 bg-card group-hover:bg-muted/20 transition-colors px-4 py-2.5 border-b border-border/40 cursor-pointer"
                      onClick={() => onProjectClick?.(project.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {project.project_id_prefix}-{project.project_id_number}
                        </Badge>
                        <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {project.project_title}
                        </span>
                      </div>
                    </td>
                    {categories.map((c) => {
                      const items = row[c.id] || [];
                      const b = statusBuckets(items);
                      const pct = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
                      const tone = cellTone(pct, b.total);
                      return (
                        <td key={c.id} className="px-1.5 py-1.5 border-b border-border/40">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                disabled={b.total === 0}
                                onClick={() => b.total > 0 && setOpenCell({ project, category: c, items })}
                                className={cn(
                                  'w-full min-h-[44px] rounded-md border text-xs font-medium tabular-nums transition-all duration-150',
                                  tone,
                                  b.total > 0 && 'cursor-pointer hover:scale-[1.03] hover:shadow-sm',
                                  b.total === 0 && 'cursor-default'
                                )}
                              >
                                {b.total === 0 ? (
                                  <span className="text-[10px]">—</span>
                                ) : (
                                  <span>{b.completed}/{b.total}</span>
                                )}
                              </button>
                            </TooltipTrigger>
                            {b.total > 0 && (
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-semibold text-xs mb-1">{c.name}</p>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {b.completed} of {b.total} delivered ({pct}%).
                                  {b.inProgress > 0 && ` ${b.inProgress} in progress.`}
                                  {b.behind > 0 && ` ${b.behind} behind schedule.`}
                                  {b.notStarted > 0 && b.inProgress === 0 && b.behind === 0 && ` ${b.notStarted} not started.`}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {b.completed > 0 && <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">{b.completed} done</Badge>}
                                  {b.inProgress > 0 && <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-600 dark:text-blue-400">{b.inProgress} active</Badge>}
                                  {b.behind > 0 && <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-600 dark:text-rose-400">{b.behind} behind</Badge>}
                                  {b.notStarted > 0 && <Badge variant="outline" className="text-[10px]">{b.notStarted} pending</Badge>}
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <P2ADeliverableCellSheet
        open={!!openCell}
        onOpenChange={(o) => !o && setOpenCell(null)}
        project={openCell?.project ?? null}
        categoryName={openCell?.category.name ?? ''}
        items={openCell?.items ?? []}
      />
    </TooltipProvider>
  );
}
