import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  Flame,
  Wrench,
  Gauge,
  Zap,
  Users,
  Send,
  HardHat,
  Heart,
  Settings,
  ClipboardCheck,
  Clock,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useVCRDisciplineAssurance,
  DisciplineAssurance,
  ExpectedDiscipline,
} from './hooks/useVCRDisciplineAssurance';
import { format } from 'date-fns';
import { DisciplineItemsDrawerAdapter } from './DisciplineItemsDrawerAdapter';
import { InterdisciplinarySummaryModal } from './InterdisciplinarySummaryModal';
import { ScheduleSofMeetingModal } from './ScheduleSofMeetingModal';
import { useProjectRoleHolders } from '@/hooks/useProjectRoleHolders';

interface VCRAssuranceTabProps {
  handoverPointId: string;
  isHandedOver?: boolean;
  vcrCode?: string;
}


const resolveAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

// Map a discipline role name (e.g. "Elect TA2 - Project", "Tech Safety TA2", "Civil TA2")
// to a short display label + icon + tinted color tokens.
interface DisciplineMeta {
  short: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const disciplineMeta = (roleName: string): DisciplineMeta => {
  const n = roleName.toLowerCase();
  if (n.includes('tech safety')) return { short: 'Tech Safety', Icon: Shield, iconBg: 'bg-rose-100 dark:bg-rose-500/15', iconColor: 'text-rose-600 dark:text-rose-400' };
  if (n.includes('process')) return { short: 'Process', Icon: Flame, iconBg: 'bg-emerald-100 dark:bg-emerald-500/15', iconColor: 'text-emerald-600 dark:text-emerald-400' };
  if (n.includes('paco')) return { short: 'PACO', Icon: Wrench, iconBg: 'bg-sky-100 dark:bg-sky-500/15', iconColor: 'text-sky-600 dark:text-sky-400' };
  if (n.includes('static')) return { short: 'Static', Icon: Gauge, iconBg: 'bg-violet-100 dark:bg-violet-500/15', iconColor: 'text-violet-600 dark:text-violet-400' };
  if (n.includes('rotating')) return { short: 'Rotating', Icon: Settings, iconBg: 'bg-amber-100 dark:bg-amber-500/15', iconColor: 'text-amber-600 dark:text-amber-400' };
  if (n.includes('elect')) return { short: 'Electrical', Icon: Zap, iconBg: 'bg-yellow-100 dark:bg-yellow-500/15', iconColor: 'text-yellow-600 dark:text-yellow-400' };
  if (n.includes('civil')) return { short: 'Civil', Icon: HardHat, iconBg: 'bg-orange-100 dark:bg-orange-500/15', iconColor: 'text-orange-600 dark:text-orange-400' };
  if (n.includes('hse')) return { short: 'HSE', Icon: Heart, iconBg: 'bg-pink-100 dark:bg-pink-500/15', iconColor: 'text-pink-600 dark:text-pink-400' };
  if (n.includes('operations') || n.includes('ops')) return { short: 'Operations', Icon: Users, iconBg: 'bg-teal-100 dark:bg-teal-500/15', iconColor: 'text-teal-600 dark:text-teal-400' };
  if (n.includes('ora')) return { short: 'ORA', Icon: ClipboardCheck, iconBg: 'bg-indigo-100 dark:bg-indigo-500/15', iconColor: 'text-indigo-600 dark:text-indigo-400' };
  return { short: roleName.split(' ')[0], Icon: Shield, iconBg: 'bg-muted', iconColor: 'text-muted-foreground' };
};

// Tiled discipline summary card (mirrors SOF Discipline Comments Summary layout)
const DisciplineTile: React.FC<{
  assurance: DisciplineAssurance;
  profileAvatars: Map<string, string>;
  onClick?: () => void;
}> = ({ assurance, profileAvatars, onClick }) => {
  const meta = disciplineMeta(assurance.discipline_role_name);
  const fullName = assurance.reviewer?.full_name || 'Unknown reviewer';
  const realAvatar = resolveAvatarUrl(assurance.reviewer?.avatar_url) || profileAvatars.get(fullName.toLowerCase()) || null;
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-3 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background shadow-sm">
            {realAvatar && <AvatarImage src={realAvatar} alt={fullName} />}
            <AvatarFallback className={cn('text-[11px] font-medium', meta.iconBg, meta.iconColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{assurance.discipline_role_name}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 shrink-0">
          Complete
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
        {assurance.assurance_statement}
      </p>
      <div className="flex items-center justify-end pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
        <span className="shrink-0">{format(new Date(assurance.submitted_at), 'dd MMM yyyy')}</span>
      </div>
    </button>
  );
};

// Pending tile — greyed variant when no statement yet for expected discipline
const PendingDisciplineTile: React.FC<{
  roleName: string;
  holderName: string | null;
  avatarUrl: string | null;
  onClick?: () => void;
}> = ({ roleName, holderName, avatarUrl, onClick }) => {
  const meta = disciplineMeta(roleName);
  const displayName = holderName || 'Unassigned';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '·';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 flex flex-col gap-3 transition-colors hover:border-primary/30 hover:bg-muted/50 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-10 w-10 shrink-0 opacity-70">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className={cn('text-[11px] font-medium', meta.iconBg, meta.iconColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold truncate leading-tight', !holderName ? 'italic text-muted-foreground' : 'text-foreground/80')}>
              {displayName}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{roleName}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-muted text-muted-foreground border-border">
          Pending
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground italic">Statement not yet submitted.</p>
    </button>
  );
};

// Hero interdisciplinary summary card (mirrors SOF Interdisciplinary Summary layout)
const InterdisciplinaryHero: React.FC<{ assurance: DisciplineAssurance; profileAvatars: Map<string, string> }> = ({ assurance, profileAvatars }) => {
  const fullName = assurance.reviewer?.full_name || 'Interdisciplinary Lead';
  const realAvatar = resolveAvatarUrl(assurance.reviewer?.avatar_url) || profileAvatars.get(fullName.toLowerCase()) || null;
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">Interdisciplinary Summary</h4>
              <p className="text-xs text-muted-foreground">Cross-functional review summary</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
          </Badge>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">
          {assurance.assurance_statement}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6">
              {realAvatar && <AvatarImage src={realAvatar} />}
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate font-medium">{assurance.discipline_role_name} · {fullName}</span>
          </div>
          <span className="shrink-0 ml-2">{format(new Date(assurance.submitted_at), 'dd MMM yyyy, HH:mm')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export const VCRAssuranceTab: React.FC<VCRAssuranceTabProps> = ({ handoverPointId, isHandedOver = false, vcrCode }) => {
  const { toast } = useToast();
  const {
    interdisciplinaryStatement,
    disciplineStatements,
    expectedDisciplines,
    isLoading,
    submitAssurance,
    isSubmitting,
  } = useVCRDisciplineAssurance(handoverPointId);

  const [interStatement, setInterStatement] = useState('');
  const [showInterForm, setShowInterForm] = useState(false);
  const [interModalOpen, setInterModalOpen] = useState(false);
  const [sofModalOpen, setSofModalOpen] = useState(false);
  const [drawerFor, setDrawerFor] = useState<{
    assurance: DisciplineAssurance | null;
    roleName: string;
    roleId: string | null;
    fallbackHolderName: string | null;
    fallbackAvatarUrl: string | null;
  } | null>(null);

  // Resolve VCR-level metadata (project id, prefix, hydrocarbon flag)
  const { data: vcrMeta } = useQuery({
    queryKey: ['vcr-assurance-meta', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async () => {
      const { data: hp } = await (supabase as any)
        .from('p2a_handover_points')
        .select('id, name, vcr_code, handover_plan_id')
        .eq('id', handoverPointId)
        .single();
      let projectId: string | null = null;
      let projectPrefix: string | null = null;
      if (hp?.handover_plan_id) {
        const { data: pl } = await (supabase as any)
          .from('p2a_handover_plans')
          .select('project_id, project_code')
          .eq('id', hp.handover_plan_id)
          .single();
        projectId = pl?.project_id || null;
        projectPrefix = pl?.project_code || null;
      }
      const { data: sysLinks } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('system_id')
        .eq('handover_point_id', handoverPointId);
      let isHydrocarbon = false;
      const sysIds = (sysLinks || []).map((s: any) => s.system_id);
      if (sysIds.length > 0) {
        const { data: systems } = await (supabase as any)
          .from('p2a_systems')
          .select('is_hydrocarbon')
          .in('id', sysIds);
        isHydrocarbon = (systems || []).some((s: any) => s.is_hydrocarbon);
      }
      return {
        projectId,
        projectPrefix,
        isHydrocarbon,
        vcrCode: hp?.vcr_code as string | undefined,
        vcrName: hp?.name as string | undefined,
      };
    },
  });

  // Collect all reviewer names currently rendered so we can look up real profile avatars.
  const reviewerNames = useMemo(() => {
    const names = new Set<string>();
    disciplineStatements.forEach(s => s.reviewer?.full_name && names.add(s.reviewer.full_name));
    if (interdisciplinaryStatement?.reviewer?.full_name) names.add(interdisciplinaryStatement.reviewer.full_name);
    // Include known mock names so VCR-04 mock data also resolves real avatars
    ['Tim Brown', 'Antoine Segret', 'Daniel Memuletiwon', 'Chan Chew Ping', 'Kersha Andrews', 'Stuart Lugo', 'Ghassan Maidalani', 'Satva Borra']
      .forEach(n => names.add(n));
    return Array.from(names);
  }, [disciplineStatements, interdisciplinaryStatement]);

  const { data: profileAvatars = new Map<string, string>() } = useQuery({
    queryKey: ['vcr-reviewer-avatars', reviewerNames.sort().join('|')],
    enabled: reviewerNames.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .in('full_name', reviewerNames)
        .not('avatar_url', 'is', null);
      const map = new Map<string, string>();
      (data || []).forEach((p: any) => {
        const url = resolveAvatarUrl(p.avatar_url);
        if (p.full_name && url) map.set(p.full_name.toLowerCase(), url);
      });
      return map;
    },
  });

  // Hoisted above the isLoading early return to keep hook order stable across renders.
  // (Previously these two hooks were declared after `if (isLoading) return ...`, causing
  // React error #310 "Rendered more hooks than during the previous render" when the
  // Comments tab flipped from loading -> loaded.)
  const isVCR04MockForHooks = vcrCode === 'VCR-04';
  const pendingRoleLabels = useMemo(() => {
    if (isVCR04MockForHooks && expectedDisciplines.length === 0) return [];
    const pending = expectedDisciplines.filter(d => !d.submitted).map(d => d.role_name);
    return Array.from(new Set(pending));
  }, [expectedDisciplines, isVCR04MockForHooks]);
  const { data: pendingHolders = {} } = useProjectRoleHolders(vcrMeta?.projectId ?? undefined, pendingRoleLabels);

  const handleSubmitInterdisciplinary = async () => {
    if (!interStatement.trim()) return;
    try {
      await submitAssurance({
        handoverPointId,
        disciplineRoleName: 'Interdisciplinary',
        assuranceStatement: interStatement.trim(),
        statementType: 'interdisciplinary',
      });
      setInterStatement('');
      setShowInterForm(false);
      toast({ title: 'Submitted', description: 'Interdisciplinary assurance statement recorded.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to submit statement.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const isVCR04Mock = vcrCode === 'VCR-04';

  // VCR-04 mock discipline statements (preserved from previous implementation)
  const VCR04_DISCIPLINES: DisciplineAssurance[] = [
    {
      id: 'mock-vcr04-disc-1',
      handover_point_id: handoverPointId,
      discipline_role_id: null,
      discipline_role_name: 'Rotating TA2 - Project',
      reviewer_user_id: null,
      assurance_statement:
        'Compressor C and D mechanical scope verified against project specifications and vendor FAT/SAT reports. All static and rotating equipment punch-list items at category A/B closed. Package is mechanically complete and ready for energisation and performance testing.',
      statement_type: 'discipline',
      submitted_at: '2026-05-30T08:42:00Z',
      created_at: '2026-05-30T08:42:00Z',
      updated_at: '2026-05-30T08:42:00Z',
      reviewer: { full_name: 'Tim Brown', avatar_url: null },
    },
    {
      id: 'mock-vcr04-disc-2',
      handover_point_id: handoverPointId,
      discipline_role_id: null,
      discipline_role_name: 'Tech Safety TA2',
      reviewer_user_id: null,
      assurance_statement:
        'F&G detection, ESD logic, PSV sizing and HAZOP/LOPA action closeout for Compressor C and D reviewed and accepted. Technical safety qualifications tracked to closure with no residual high-risk items affecting safe start-up.',
      statement_type: 'discipline',
      submitted_at: '2026-05-31T13:05:00Z',
      created_at: '2026-05-31T13:05:00Z',
      updated_at: '2026-05-31T13:05:00Z',
      reviewer: { full_name: 'Antoine Segret', avatar_url: null },
    },
    {
      id: 'mock-vcr04-disc-3',
      handover_point_id: handoverPointId,
      discipline_role_id: null,
      discipline_role_name: 'ORA Engineer',
      reviewer_user_id: null,
      assurance_statement:
        'Operational readiness deliverables for Compressor C and D (procedures, training, spares, CMMS load and operational registers) validated by Operations. Asset is ready for handover with all ORA prerequisites satisfied.',
      statement_type: 'discipline',
      submitted_at: '2026-06-01T10:20:00Z',
      created_at: '2026-06-01T10:20:00Z',
      updated_at: '2026-06-01T10:20:00Z',
      reviewer: { full_name: 'Daniel Memuletiwon', avatar_url: null },
    },
  ];

  const mockInterdisciplinaryVCR04: DisciplineAssurance = {
    id: 'mock-vcr04-inter',
    handover_point_id: handoverPointId,
    discipline_role_id: null,
    discipline_role_name: 'Interdisciplinary Lead (Snr ORA Engr.)',
    reviewer_user_id: null,
    assurance_statement:
      'All discipline assurance statements for Compressor C and D have been received and reconciled. Cross-discipline interfaces have been verified with no outstanding concerns. The VCR is recommended for SoF approval.',
    statement_type: 'interdisciplinary',
    submitted_at: '2026-06-02T15:30:00Z',
    created_at: '2026-06-02T15:30:00Z',
    updated_at: '2026-06-02T15:30:00Z',
    reviewer: { full_name: 'Daniel Memuletiwon', avatar_url: null },
  };

  const mockInterdisciplinary: DisciplineAssurance | null =
    (isHandedOver || isVCR04Mock) && !interdisciplinaryStatement
      ? isVCR04Mock
        ? mockInterdisciplinaryVCR04
        : {
            id: 'mock-interdisciplinary',
            handover_point_id: handoverPointId,
            discipline_role_id: null,
            discipline_role_name: 'Interdisciplinary Lead (Snr ORA Engr.)',
            reviewer_user_id: null,
            assurance_statement:
              'All discipline-specific assurance statements have been received, reviewed and accepted. Cross-discipline interface checks (Electrical/Process/Mechanical/Instrumentation/Safety) completed with no outstanding concerns. Approved qualifications and MoCs are tracked to closure and do not impact safe operation. The Power & Utilities scope is deemed integrated, operationally ready and recommended for handover to Operations.',
            statement_type: 'interdisciplinary',
            submitted_at: '2026-06-03T09:15:00Z',
            created_at: '2026-06-03T09:15:00Z',
            updated_at: '2026-06-03T09:15:00Z',
            reviewer: { full_name: 'Daniel Memuletiwon', avatar_url: null },
          }
      : null;

  const effectiveInterdisciplinary = interdisciplinaryStatement || mockInterdisciplinary;

  const effectiveExpectedDisciplines: ExpectedDiscipline[] =
    isVCR04Mock && expectedDisciplines.length === 0
      ? VCR04_DISCIPLINES.map((a, i) => ({
          role_id: `mock-vcr04-role-${i}`,
          role_name: a.discipline_role_name,
          submitted: true,
          assurance: a,
        }))
      : expectedDisciplines;

  const submittedDisciplines = effectiveExpectedDisciplines.filter(d => d.submitted && d.assurance);
  const pendingDisciplines = effectiveExpectedDisciplines.filter(d => !d.submitted);
  const effectiveSubmittedCount = submittedDisciplines.length;
  const effectiveTotalCount = effectiveExpectedDisciplines.length;
  const allDisciplinesSubmitted = effectiveTotalCount > 0 && effectiveSubmittedCount === effectiveTotalCount;

  // pendingRoleLabels + pendingHolders are hoisted above the isLoading early return.


  const vcrLabel = `${vcrMeta?.vcrCode || vcrCode || 'VCR'}${vcrMeta?.vcrName ? ` (${vcrMeta.vcrName})` : ''}`;
  const isHydrocarbon = !!vcrMeta?.isHydrocarbon;

  const disciplineChips = effectiveExpectedDisciplines.map(d => ({
    name: d.role_name,
    complete: d.submitted,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Discipline Comments Summary</h3>
      </div>

      {/* Interdisciplinary Hero */}
      {effectiveInterdisciplinary ? (
        <InterdisciplinaryHero assurance={effectiveInterdisciplinary} profileAvatars={profileAvatars} />
      ) : (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Interdisciplinary Summary — pending</p>
                  <p className="text-xs text-muted-foreground">
                    {allDisciplinesSubmitted
                      ? 'All discipline statements received. The Snr ORA Engr can now provide the interdisciplinary statement.'
                      : `Waiting for ${effectiveTotalCount - effectiveSubmittedCount} of ${effectiveTotalCount} discipline statement${effectiveTotalCount - effectiveSubmittedCount === 1 ? '' : 's'}.`}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setInterModalOpen(true)} disabled={!allDisciplinesSubmitted}>
                Add Statement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discipline Comments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground">
            Discipline Comments <span className="text-muted-foreground font-normal ml-1">{effectiveSubmittedCount}</span>
          </h4>
          <Badge variant="secondary" className="text-[10px]">{effectiveSubmittedCount}/{effectiveTotalCount}</Badge>
        </div>

        {submittedDisciplines.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No delivering disciplines assigned to VCR items yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {submittedDisciplines.map(disc => (
              <DisciplineTile
                key={disc.role_id}
                assurance={disc.assurance!}
                profileAvatars={profileAvatars}
                onClick={() =>
                  setDrawerFor({
                    assurance: disc.assurance!,
                    roleName: disc.role_name,
                    roleId: disc.role_id,
                    fallbackHolderName: null,
                    fallbackAvatarUrl: null,
                  })
                }
              />
            ))}
          </div>
        )}

        {/* PENDING section */}
        {pendingDisciplines.length > 0 && (
          <Collapsible className="mt-4">
            <CollapsibleTrigger className="w-full flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground py-2 group">
              <span>Pending ({pendingDisciplines.length})</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {pendingDisciplines.map(d => {
                  const holder = (pendingHolders[d.role_name] || [])[0];
                  return (
                    <PendingDisciplineTile
                      key={d.role_id}
                      roleName={d.role_name}
                      holderName={holder?.full_name || null}
                      avatarUrl={holder?.avatar_url || null}
                      onClick={() =>
                        setDrawerFor({
                          assurance: null,
                          roleName: d.role_name,
                          roleId: d.role_id,
                          fallbackHolderName: holder?.full_name || null,
                          fallbackAvatarUrl: holder?.avatar_url || null,
                        })
                      }
                    />
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Drawer — full alignment with Parties tab */}
      <DisciplineItemsDrawerAdapter
        open={!!drawerFor}
        onOpenChange={(o) => { if (!o) setDrawerFor(null); }}
        assurance={drawerFor?.assurance ?? null}
        handoverPointId={handoverPointId}
        projectId={vcrMeta?.projectId ?? undefined}
        vcrCode={vcrMeta?.vcrCode || vcrCode}
        vcrName={vcrMeta?.vcrName}
        roleName={drawerFor?.roleName}
        roleId={drawerFor?.roleId ?? null}
        fallbackHolderName={drawerFor?.fallbackHolderName ?? null}
        fallbackAvatarUrl={drawerFor?.fallbackAvatarUrl ?? null}
      />

      {/* Interdisciplinary summary modal */}
      <InterdisciplinarySummaryModal
        open={interModalOpen}
        onOpenChange={setInterModalOpen}
        vcrLabel={vcrLabel}
        disciplineChips={disciplineChips}
        isHydrocarbon={isHydrocarbon}
        isSubmitting={isSubmitting}
        onConfirm={async (summary) => {
          try {
            await submitAssurance({
              handoverPointId,
              disciplineRoleName: 'Interdisciplinary',
              assuranceStatement: summary,
              statementType: 'interdisciplinary',
            });
            toast({ title: 'Submitted', description: 'Interdisciplinary summary recorded.' });
          } catch {
            toast({ title: 'Error', description: 'Failed to submit statement.', variant: 'destructive' });
          }
        }}
        onScheduleSofMeeting={() => setSofModalOpen(true)}
      />

      {/* Schedule SoF meeting modal */}
      <ScheduleSofMeetingModal
        open={sofModalOpen}
        onOpenChange={setSofModalOpen}
        handoverPointId={handoverPointId}
        projectId={vcrMeta?.projectId ?? undefined}
        vcrCode={vcrMeta?.vcrCode || vcrCode}
        vcrName={vcrMeta?.vcrName}
        projectPrefix={vcrMeta?.projectPrefix ?? undefined}
      />
    </div>
  );
};
