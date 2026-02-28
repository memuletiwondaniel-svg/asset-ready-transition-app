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
import { useVCRDisciplineAssurance, DisciplineAssurance } from './hooks/useVCRDisciplineAssurance';
import { format } from 'date-fns';

interface VCRAssuranceTabProps {
  handoverPointId: string;
}

const AssuranceCard: React.FC<{ assurance: DisciplineAssurance; type: 'discipline' | 'interdisciplinary' }> = ({ assurance, type }) => {
  const initials = assurance.reviewer?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
            {assurance.reviewer?.avatar_url && (
              <AvatarImage src={assurance.reviewer.avatar_url} />
            )}
            <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
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
              {assurance.reviewer?.full_name || 'Unknown reviewer'}
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

export const VCRAssuranceTab: React.FC<VCRAssuranceTabProps> = ({ handoverPointId }) => {
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
            {submittedCount} of {totalCount} discipline statements submitted
            {interdisciplinaryStatement ? ' · Interdisciplinary statement submitted' : ' · Interdisciplinary statement pending'}
          </p>
        </div>
      </div>

      {/* Interdisciplinary Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Interdisciplinary Assurance Statement</h4>
        </div>
        {interdisciplinaryStatement ? (
          <AssuranceCard assurance={interdisciplinaryStatement} type="interdisciplinary" />
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
                      <p className="text-xs text-muted-foreground">The VCR Lead provides this statement after all disciplines are reviewed.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowInterForm(true)}>
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
            {submittedCount}/{totalCount}
          </Badge>
        </div>

        {expectedDisciplines.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No delivering disciplines assigned to VCR items yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {expectedDisciplines.map(disc => (
              disc.submitted && disc.assurance ? (
                <AssuranceCard key={disc.role_id} assurance={disc.assurance} type="discipline" />
              ) : (
                <PendingDisciplineCard key={disc.role_id} roleName={disc.role_name} />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
