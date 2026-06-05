import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  Clock,
  CheckCircle2,
  Users,
  Send,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVCRDisciplineAssurance, DisciplineAssurance, ExpectedDiscipline } from './hooks/useVCRDisciplineAssurance';
import { format } from 'date-fns';

interface VCRAssuranceTabProps {
  handoverPointId: string;
  /** When true (e.g. VCR-01 handed over), render mock interdisciplinary statement & treat all disciplines as submitted. */
  isHandedOver?: boolean;
  /** VCR code used to drive scenario-specific mock data (e.g. VCR-04 for Paul's SoF workflow). */
  vcrCode?: string;
}

const avatarUrlFor = (name: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'user')}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

const AssuranceCard: React.FC<{ assurance: DisciplineAssurance; type: 'discipline' | 'interdisciplinary' }> = ({ assurance, type }) => {
  const fullName = assurance.reviewer?.full_name || 'Unknown reviewer';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';
  const avatarSrc = assurance.reviewer?.avatar_url || avatarUrlFor(fullName);

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">
                  {assurance.discipline_role_name}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Submitted
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {format(new Date(assurance.submitted_at), 'dd MMM yyyy, HH:mm')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {fullName}
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {assurance.assurance_statement}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PendingDisciplineCard: React.FC<{ roleName: string }> = ({ roleName }) => (
  <Card className="border-l-4 border-l-muted border-dashed">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <span className="text-sm font-medium text-foreground">{roleName}</span>
          <p className="text-xs text-muted-foreground">Pending — assurance statement not yet submitted</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

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
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const submittedCount = expectedDisciplines.filter(d => d.submitted).length;
  const totalCount = expectedDisciplines.length;
  const allDisciplinesSubmitted = totalCount > 0 && submittedCount === totalCount;

  // VCR-04 (Compressor C and D) — Paul's SoF workflow scenario
  const isVCR04Mock = vcrCode === 'VCR-04';

  const VCR04_DISCIPLINES: DisciplineAssurance[] = [
    {
      id: 'mock-vcr04-disc-1',
      handover_point_id: handoverPointId,
      discipline_role_id: null,
      discipline_role_name: 'TA2 — Project (Rotating Equipment)',
      reviewer_user_id: null,
      assurance_statement:
        'Compressor C and D mechanical scope has been verified against the project specifications and vendor FAT/SAT reports. All static and rotating equipment punch-list items at category A/B have been closed. The package is mechanically complete and ready for energisation and performance testing.',
      statement_type: 'discipline',
      submitted_at: '2026-05-30T08:42:00Z',
      created_at: '2026-05-30T08:42:00Z',
      updated_at: '2026-05-30T08:42:00Z',
      reviewer: {
        full_name: 'Rajesh Subramanian',
        avatar_url: avatarUrlFor('Rajesh Subramanian Rotating'),
      },
    },
    {
      id: 'mock-vcr04-disc-2',
      handover_point_id: handoverPointId,
      discipline_role_id: null,
      discipline_role_name: 'TA2 — Technical Safety',
      reviewer_user_id: null,
      assurance_statement:
        'F&G detection, ESD logic, PSV sizing and HAZOP/LOPA action closeout for Compressor C and D have been reviewed and accepted. All technical safety qualifications are tracked to closure with no residual high-risk items affecting safe start-up.',
      statement_type: 'discipline',
      submitted_at: '2026-05-31T13:05:00Z',
      created_at: '2026-05-31T13:05:00Z',
      updated_at: '2026-05-31T13:05:00Z',
      reviewer: {
        full_name: 'Fatima Al-Hashimi',
        avatar_url: avatarUrlFor('Fatima Al-Hashimi Tech Safety'),
      },
    },
    {
      id: 'mock-vcr04-disc-3',
      handover_point_id: handoverPointId,
      discipline_role_id: null,
      discipline_role_name: 'ORA Engineer',
      reviewer_user_id: null,
      assurance_statement:
        'Operational readiness deliverables for Compressor C and D (procedures, training, spares, CMMS load and operational registers) have been validated by Operations. The asset is ready for handover with all ORA prerequisites satisfied.',
      statement_type: 'discipline',
      submitted_at: '2026-06-01T10:20:00Z',
      created_at: '2026-06-01T10:20:00Z',
      updated_at: '2026-06-01T10:20:00Z',
      reviewer: {
        full_name: 'Daniel Okafor',
        avatar_url: avatarUrlFor('Daniel Okafor ORA'),
      },
    },
  ];

  const mockInterdisciplinaryVCR04: DisciplineAssurance = {
    id: 'mock-vcr04-inter',
    handover_point_id: handoverPointId,
    discipline_role_id: null,
    discipline_role_name: 'Interdisciplinary Lead (Snr ORA Engr.)',
    reviewer_user_id: null,
    assurance_statement:
      'All three discipline assurance statements (Project/Rotating Equipment, Technical Safety and ORA) for Compressor C and D have been received and reconciled. Cross-discipline interfaces have been verified with no outstanding concerns. The VCR is recommended for SoF approval.',
    statement_type: 'interdisciplinary',
    submitted_at: '2026-06-02T15:30:00Z',
    created_at: '2026-06-02T15:30:00Z',
    updated_at: '2026-06-02T15:30:00Z',
    reviewer: {
      full_name: 'Aarav Krishnan',
      avatar_url: avatarUrlFor('Aarav Krishnan'),
    },
  };

  // Mock interdisciplinary statement when VCR has been handed over (e.g. VCR-01) or VCR-04 scenario
  const mockInterdisciplinary: DisciplineAssurance | null = (isHandedOver || isVCR04Mock) && !interdisciplinaryStatement
    ? (isVCR04Mock ? mockInterdisciplinaryVCR04 : {
        id: 'mock-interdisciplinary',
        handover_point_id: handoverPointId,
        discipline_role_id: null,
        discipline_role_name: 'Interdisciplinary Lead (Snr ORA Engr.)',
        reviewer_user_id: null,
        assurance_statement:
          'All discipline-specific assurance statements have been received, reviewed and accepted. Cross-discipline interface checks (Electrical/Process/Mechanical/Instrumentation/Safety) have been completed with no outstanding concerns. Approved qualifications and MoCs are tracked to closure and do not impact safe operation. The Power & Utilities scope is deemed integrated, operationally ready and recommended for handover to Operations.',
        statement_type: 'interdisciplinary',
        submitted_at: '2026-06-03T09:15:00Z',
        created_at: '2026-06-03T09:15:00Z',
        updated_at: '2026-06-03T09:15:00Z',
        reviewer: {
          full_name: 'Aarav Krishnan',
          avatar_url: avatarUrlFor('Aarav Krishnan'),
        },
      })
    : null;
  const effectiveInterdisciplinary = interdisciplinaryStatement || mockInterdisciplinary;

  // Effective discipline list — synthesize for VCR-04 if hook returned nothing
  const effectiveExpectedDisciplines: ExpectedDiscipline[] = isVCR04Mock && expectedDisciplines.length === 0
    ? VCR04_DISCIPLINES.map((a, i) => ({
        role_id: `mock-vcr04-role-${i}`,
        role_name: a.discipline_role_name,
        submitted: true,
        assurance: a,
      }))
    : expectedDisciplines;

  const effectiveSubmittedCount = effectiveExpectedDisciplines.filter(d => d.submitted).length;
  const effectiveTotalCount = effectiveExpectedDisciplines.length;

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Discipline Assurance Statements</h3>
          <p className="text-xs text-muted-foreground">
            {effectiveSubmittedCount} of {effectiveTotalCount} discipline statements submitted
            {effectiveInterdisciplinary ? ' · Interdisciplinary statement submitted' : ' · Interdisciplinary statement pending'}
          </p>
        </div>
      </div>

      {/* Interdisciplinary Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Interdisciplinary Assurance Statement</h4>
        </div>
        {effectiveInterdisciplinary ? (
          <AssuranceCard assurance={effectiveInterdisciplinary} type="interdisciplinary" />

        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4">
              {showInterForm ? (
                <div className="space-y-3">
                  <Textarea
                    value={interStatement}
                    onChange={e => setInterStatement(e.target.value)}
                    placeholder="Enter the interdisciplinary assurance statement confirming overall readiness for handover/start-up..."
                    className="min-h-[100px] text-sm"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowInterForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmitInterdisciplinary}
                      disabled={!interStatement.trim() || isSubmitting}
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Submit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Not yet submitted</p>
                      <p className="text-xs text-muted-foreground">
                        {allDisciplinesSubmitted
                          ? 'All discipline statements received. The VCR Lead can now provide the interdisciplinary statement.'
                          : `Waiting for ${totalCount - submittedCount} of ${totalCount} discipline statement${totalCount - submittedCount === 1 ? '' : 's'} before this can be submitted.`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInterForm(true)}
                    disabled={!allDisciplinesSubmitted}
                    title={!allDisciplinesSubmitted ? 'All discipline statements must be submitted first' : undefined}
                  >
                    Add Statement
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Discipline Statements Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Discipline Statements</h4>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {effectiveSubmittedCount}/{effectiveTotalCount}
          </Badge>
        </div>

        {effectiveExpectedDisciplines.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No delivering disciplines assigned to VCR items yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {effectiveExpectedDisciplines
              .filter(disc => disc.submitted && disc.assurance)
              .map(disc => (
                <AssuranceCard key={disc.role_id} assurance={disc.assurance!} type="discipline" />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
