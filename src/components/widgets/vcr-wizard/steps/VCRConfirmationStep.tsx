import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Box,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  ClipboardCheck,
  Wrench,
  Package,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
  ScrollText,
  Layers,
  UserCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VCRConfirmationStepProps {
  vcrId: string;
  vcrName?: string;
  vcrCode?: string;
}

interface StepStat {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  iconClass: string;
}

interface ResolvedApprover {
  role: string;
  user_name?: string;
  user_avatar?: string;
  user_id?: string;
}

const resolveAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const VCRConfirmationStep: React.FC<VCRConfirmationStepProps> = ({
  vcrId,
  vcrName,
  vcrCode,
}) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['vcr-confirmation-stats', vcrId],
    queryFn: async () => {
      const client = supabase as any;
      const [systems, training, procedures, criticalDocs, registers, logsheets, cmms, spares] =
        await Promise.all([
          client.from('p2a_handover_point_systems').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
          client.from('p2a_vcr_training').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
          client.from('p2a_vcr_procedures').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
          client.from('p2a_vcr_critical_docs').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
          client.from('p2a_vcr_register_selections').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
          client.from('p2a_vcr_logsheets').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
          client.from('p2a_vcr_cmms').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
          client.from('p2a_vcr_spares').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcrId),
        ]);
      return {
        systems: systems.count || 0,
        training: training.count || 0,
        procedures: procedures.count || 0,
        criticalDocs: criticalDocs.count || 0,
        registers: registers.count || 0,
        logsheets: logsheets.count || 0,
        cmms: cmms.count || 0,
        spares: spares.count || 0,
      };
    },
  });

  // Pull the same approver state used by ApproversStep (read-only here)
  const { data: approvers } = useQuery<ResolvedApprover[]>({
    queryKey: ['vcr-approvers-summary', vcrId],
    queryFn: async () => {
      // Local state lives in ApproversStep; for the summary we re-derive
      // the canonical default labels and resolved users via the same RPC
      // path so the review reflects the canonical 5.
      // (When persistence lands in Phase C, switch to reading the stored
      // approver rows.)
      const client = supabase as any;
      const { data: hp } = await client
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcrId)
        .maybeSingle();
      if (!hp?.handover_plan_id) return [];
      const { data: plan } = await client
        .from('p2a_handover_plans')
        .select('project_id')
        .eq('id', hp.handover_plan_id)
        .maybeSingle();
      const projectId = plan?.project_id;
      if (!projectId) return [];

      const labels = ['ORA Lead', 'Construction Lead', 'Commissioning Lead', 'Project Hub Lead'];
      const resolved: ResolvedApprover[] = [];
      for (const label of labels) {
        const { data: userId } = await client.rpc('resolve_project_role_user', {
          p_project_id: projectId,
          p_role_label: label,
        });
        if (!userId) {
          resolved.push({ role: label });
          continue;
        }
        const { data: prof } = await client.rpc('get_safe_profile_data', { target_user_id: userId });
        const row = Array.isArray(prof) ? prof[0] : prof;
        resolved.push({
          role: label,
          user_id: userId,
          user_name: row?.full_name,
          user_avatar: row?.avatar_url ?? undefined,
        });
      }

      // Deputy Plant Director
      const { data: project } = await client
        .from('projects')
        .select('plant_id')
        .eq('id', projectId)
        .maybeSingle();
      let plantName: string | null = null;
      if (project?.plant_id) {
        const { data: plant } = await client.from('plant').select('name').eq('id', project.plant_id).maybeSingle();
        plantName = plant?.name || null;
      }
      if (plantName) {
        const { data: deputies } = await client.rpc('find_deputy_plant_director', { plant_name_param: plantName });
        const d = deputies?.[0];
        resolved.push({
          role: 'Dep. Plant Director',
          user_id: d?.user_id,
          user_name: d?.full_name,
          user_avatar: d?.avatar_url ?? undefined,
        });
      } else {
        resolved.push({ role: 'Dep. Plant Director' });
      }

      return resolved;
    },
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  const tiles: StepStat[] = [
    { key: 'systems',     label: 'Systems',            icon: Layers,         count: stats.systems,                      iconClass: 'text-orange-500' },
    { key: 'training',    label: 'Training',           icon: GraduationCap,  count: stats.training,                     iconClass: 'text-blue-500' },
    { key: 'procedures',  label: 'Procedures',         icon: BookOpen,       count: stats.procedures,                   iconClass: 'text-emerald-500' },
    { key: 'docs',        label: 'Critical Docs',      icon: FileText,       count: stats.criticalDocs,                 iconClass: 'text-amber-500' },
    { key: 'reglog',      label: 'Reg. & Logsheets',   icon: ClipboardList,  count: stats.registers + stats.logsheets,  iconClass: 'text-cyan-500' },
    { key: 'cmms',        label: 'CMMS',               icon: Wrench,         count: stats.cmms,                         iconClass: 'text-amber-500' },
    { key: 'spares',      label: '2Y Spares',          icon: Package,        count: stats.spares,                       iconClass: 'text-teal-500' },
  ];

  const issues: string[] = [];
  if (stats.systems === 0) issues.push('No systems mapped');
  if (stats.training === 0) issues.push('No training items');
  if (stats.procedures === 0) issues.push('No procedures');
  if (stats.criticalDocs === 0) issues.push('No critical documents');
  if (stats.registers + stats.logsheets === 0) issues.push('No registers or logsheets');
  if (stats.cmms === 0) issues.push('No CMMS items');
  if (stats.spares === 0) issues.push('No 2Y spares');

  const hasIssues = issues.length > 0;
  const unresolvedApprovers = (approvers || []).filter(a => !a.user_id).length;
  if (unresolvedApprovers > 0) issues.push(`${unresolvedApprovers} approver${unresolvedApprovers === 1 ? '' : 's'} unresolved`);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Review &amp; Confirm</h3>
          <p className="text-xs text-muted-foreground">
            {vcrCode ? `${vcrCode} · ` : ''}{vcrName || 'VCR Execution Plan'}
          </p>
        </div>
        <Badge
          variant={hasIssues ? 'destructive' : 'default'}
          className={cn(!hasIssues && 'bg-emerald-500')}
        >
          {hasIssues ? `${issues.length} issue${issues.length === 1 ? '' : 's'}` : 'Ready'}
        </Badge>
      </div>

      {hasIssues && (
        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-700 dark:text-amber-400">
              <ul className="space-y-0.5 list-disc list-inside">
                {issues.map((issue, i) => <li key={i}>{issue}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step count tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <div key={t.key} className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('h-4 w-4', t.iconClass)} />
                <span className="text-xs font-medium">{t.label}</span>
              </div>
              <div className="text-xl font-bold">{t.count}</div>
            </div>
          );
        })}
      </div>

      {/* Approvers */}
      {approvers && approvers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            <UserCheck className="h-3.5 w-3.5" />
            Approvers
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-1">
            {approvers.map((a, i) => {
              const hasUser = !!a.user_id;
              const badgeClass = !hasUser ? 'bg-muted-foreground' : 'bg-amber-500';
              const BadgeIcon = !hasUser ? AlertCircle : Clock;
              return (
                <div key={`${a.role}-${i}`} className="flex items-center gap-2.5 py-2">
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={resolveAvatarUrl(a.user_avatar)} />
                      <AvatarFallback className="text-[9px] bg-muted font-medium">
                        {getInitials(a.user_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-background flex items-center justify-center',
                      badgeClass
                    )}>
                      <BadgeIcon className="h-2 w-2 text-white" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    {hasUser ? (
                      <>
                        <p className="text-xs font-medium truncate">{a.user_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.role}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-muted-foreground truncate">{a.role}</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">Unassigned</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
