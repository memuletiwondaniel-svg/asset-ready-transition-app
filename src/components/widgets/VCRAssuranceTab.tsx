import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useVCRDisciplineAssurance,
  DisciplineAssurance,
  ExpectedDiscipline,
} from './hooks/useVCRDisciplineAssurance';
import { format } from 'date-fns';

interface VCRAssuranceTabProps {
  handoverPointId: string;
  isHandedOver?: boolean;
  vcrCode?: string;
}

const avatarUrlFor = (name: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'user')}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

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
const DisciplineTile: React.FC<{ assurance: DisciplineAssurance }> = ({ assurance }) => {
  const meta = disciplineMeta(assurance.discipline_role_name);
  const fullName = assurance.reviewer?.full_name || 'Unknown reviewer';
  const avatarSrc = assurance.reviewer?.avatar_url || avatarUrlFor(fullName);
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-3 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={avatarSrc} alt={fullName} />
            <AvatarFallback className={cn('text-[11px] font-medium', meta.iconBg, meta.iconColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{meta.short}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 shrink-0">
          Complete
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
        {assurance.assurance_statement}
      </p>
      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
        <span className="truncate font-medium">{assurance.discipline_role_name}</span>
        <span className="shrink-0 ml-2">{format(new Date(assurance.submitted_at), 'dd MMM yyyy')}</span>
      </div>
    </div>
  );
};

// Hero interdisciplinary summary card (mirrors SOF Interdisciplinary Summary layout)
const InterdisciplinaryHero: React.FC<{ assurance: DisciplineAssurance }> = ({ assurance }) => {
  const fullName = assurance.reviewer?.full_name || 'Interdisciplinary Lead';
  const avatarSrc = assurance.reviewer?.avatar_url || avatarUrlFor(fullName);
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
              <AvatarImage src={avatarSrc} />
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
      reviewer: { full_name: 'Tim Brown', avatar_url: avatarUrlFor('Tim Brown') },
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
      reviewer: { full_name: 'Antoine Segret', avatar_url: avatarUrlFor('Antoine Segret') },
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
      reviewer: { full_name: 'Daniel Memuletiwon', avatar_url: avatarUrlFor('Daniel Memuletiwon') },
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
    reviewer: { full_name: 'Daniel Memuletiwon', avatar_url: avatarUrlFor('Daniel Memuletiwon') },
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
            reviewer: { full_name: 'Daniel Memuletiwon', avatar_url: avatarUrlFor('Daniel Memuletiwon') },
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
  const effectiveSubmittedCount = submittedDisciplines.length;
  const effectiveTotalCount = effectiveExpectedDisciplines.length;
  const allDisciplinesSubmitted = effectiveTotalCount > 0 && effectiveSubmittedCount === effectiveTotalCount;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Discipline Comments Summary</h3>
      </div>

      {/* Interdisciplinary Hero */}
      {effectiveInterdisciplinary ? (
        <InterdisciplinaryHero assurance={effectiveInterdisciplinary} />
      ) : (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            {showInterForm ? (
              <div className="space-y-3">
                <Textarea
                  value={interStatement}
                  onChange={e => setInterStatement(e.target.value)}
                  placeholder="Enter the interdisciplinary assurance statement confirming overall readiness for handover/start-up..."
                  className="min-h-[100px] text-sm"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowInterForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSubmitInterdisciplinary} disabled={!interStatement.trim() || isSubmitting}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Submit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Interdisciplinary Summary — pending</p>
                    <p className="text-xs text-muted-foreground">
                      {allDisciplinesSubmitted
                        ? 'All discipline statements received. The VCR Lead can now provide the interdisciplinary statement.'
                        : `Waiting for ${effectiveTotalCount - effectiveSubmittedCount} of ${effectiveTotalCount} discipline statement${effectiveTotalCount - effectiveSubmittedCount === 1 ? '' : 's'}.`}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowInterForm(true)} disabled={!allDisciplinesSubmitted}>
                  Add Statement
                </Button>
              </div>
            )}
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
              <DisciplineTile key={disc.role_id} assurance={disc.assurance!} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
