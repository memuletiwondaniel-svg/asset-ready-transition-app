import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, MessageSquare, PartyPopper } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { usePSSRItemApprovals } from '@/hooks/usePSSRItemApprovals';
import { PSSRPriorityAction } from '@/hooks/usePSSRPriorityActions';
import { useNavigate } from 'react-router-dom';

interface DisciplineCompletionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  approverRole: string;
  stats: {
    total: number;
    pending: number;
    readyForReview: number;
    approved: number;
    rejected: number;
  };
  priorityActions: PSSRPriorityAction[];
}

const DisciplineCompletionPanel: React.FC<DisciplineCompletionPanelProps> = ({
  open,
  onOpenChange,
  pssrId,
  approverRole,
  stats,
  priorityActions,
}) => {
  const [disciplineComment, setDisciplineComment] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const navigate = useNavigate();

  const { completeDisciplineReview } = usePSSRItemApprovals(pssrId, approverRole);

  const priorityACount = priorityActions.filter(a => a.priority === 'A').length;
  const priorityBCount = priorityActions.filter(a => a.priority === 'B').length;

  const handleComplete = async () => {
    await completeDisciplineReview.mutateAsync({
      disciplineComment: disciplineComment || undefined,
    });
    setIsCompleted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    if (isCompleted) {
      navigate('/pssr/approver-dashboard');
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg">
        {!isCompleted ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Complete Discipline Review
              </SheetTitle>
              <SheetDescription>
                Review your summary and add any final discipline comments
              </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
              {/* Review Summary */}
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-medium mb-4">Review Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                      <p className="text-xs text-muted-foreground">Items Approved</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                      <p className="text-xs text-muted-foreground">Items Rejected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Actions Summary */}
              {(priorityACount > 0 || priorityBCount > 0) && (
                <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="pt-6">
                    <h4 className="font-medium mb-4 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5" />
                      Priority Actions Created
                    </h4>
                    <div className="space-y-3">
                      {priorityACount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-950/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">A</Badge>
                            <span className="text-sm font-medium">{priorityACount} Priority A Action{priorityACount > 1 ? 's' : ''}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Must close before startup</span>
                        </div>
                      )}
                      {priorityBCount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-950/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-500">B</Badge>
                            <span className="text-sm font-medium">{priorityBCount} Priority B Action{priorityBCount > 1 ? 's' : ''}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Can close after startup</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Discipline Comment */}
              <div className="space-y-3">
                <Label htmlFor="discipline-comment" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Discipline Comment (Optional)
                </Label>
                <Textarea
                  id="discipline-comment"
                  placeholder="Add any overall comments about your discipline review..."
                  value={disciplineComment}
                  onChange={(e) => setDisciplineComment(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This comment will be included in the PSSR record and visible to the coordinator and other reviewers.
                </p>
              </div>
            </div>

            <SheetFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Continue Reviewing
              </Button>
              <Button 
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700"
                disabled={completeDisciplineReview.isPending}
              >
                {completeDisciplineReview.isPending ? 'Completing...' : 'Complete Review'}
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader className="pt-12">
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-green-100 dark:bg-green-950">
                  <PartyPopper className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <SheetTitle className="text-center text-2xl">Review Complete!</SheetTitle>
              <SheetDescription className="text-center">
                You have successfully completed your discipline review for this PSSR.
              </SheetDescription>
            </SheetHeader>

            <div className="py-8 space-y-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    The PSSR coordinator has been notified that your review is complete.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-lg px-4 py-1">{approverRole}</Badge>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <SheetFooter>
              <Button 
                onClick={handleClose}
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DisciplineCompletionPanel;
