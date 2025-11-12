import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useORMReports } from '@/hooks/useORMReports';
import { FileText, Plus, Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ORMDailyReportsViewProps {
  planId: string;
  reports: any[];
}

export const ORMDailyReportsView: React.FC<ORMDailyReportsViewProps> = ({
  planId,
  reports: initialReports
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState('');
  const [workCompleted, setWorkCompleted] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  const [progressPercentage, setProgressPercentage] = useState('');

  const { submitReport, isSubmitting } = useORMReports();

  const handleSubmit = () => {
    if (!selectedDeliverable || !workCompleted || !hoursWorked) return;

    submitReport({
      deliverable_id: selectedDeliverable,
      work_completed: workCompleted,
      hours_worked: parseFloat(hoursWorked),
      challenges: challenges || undefined,
      next_day_plan: nextDayPlan || undefined,
      progress_percentage: progressPercentage ? parseInt(progressPercentage) : undefined
    });

    // Reset form
    setWorkCompleted('');
    setHoursWorked('');
    setChallenges('');
    setNextDayPlan('');
    setProgressPercentage('');
    setSelectedDeliverable('');
    setShowSubmitModal(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Daily Reports
              </CardTitle>
              <CardDescription>View and submit daily progress reports</CardDescription>
            </div>
            <Button onClick={() => setShowSubmitModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Submit Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {initialReports.length > 0 ? (
                initialReports.map((report: any) => (
                  <Card key={report.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={report.user?.avatar_url} />
                        <AvatarFallback>
                          {report.user?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{report.user?.full_name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(report.report_date), 'MMM dd, yyyy')}</span>
                              <Clock className="w-3 h-3 ml-2" />
                              <span>{report.hours_worked} hrs</span>
                            </div>
                          </div>
                          {report.progress_percentage !== null && (
                            <Badge variant="secondary">{report.progress_percentage}% Complete</Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <div className="font-medium text-xs text-muted-foreground mb-1">Work Completed:</div>
                            <p className="whitespace-pre-wrap">{report.work_completed}</p>
                          </div>

                          {report.challenges && (
                            <div>
                              <div className="font-medium text-xs text-muted-foreground mb-1">Challenges:</div>
                              <p className="whitespace-pre-wrap text-orange-600">{report.challenges}</p>
                            </div>
                          )}

                          {report.next_day_plan && (
                            <div>
                              <div className="font-medium text-xs text-muted-foreground mb-1">Next Day Plan:</div>
                              <p className="whitespace-pre-wrap">{report.next_day_plan}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No reports submitted yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Daily Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Deliverable *</Label>
              <Input
                placeholder="Select deliverable"
                value={selectedDeliverable}
                onChange={(e) => setSelectedDeliverable(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Work Completed Today *</Label>
              <Textarea
                placeholder="Describe what you accomplished..."
                value={workCompleted}
                onChange={(e) => setWorkCompleted(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hours Worked *</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="8"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Progress %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0-100"
                  value={progressPercentage}
                  onChange={(e) => setProgressPercentage(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label>Challenges (Optional)</Label>
              <Textarea
                placeholder="Any blockers or issues faced..."
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label>Plan for Tomorrow (Optional)</Label>
              <Textarea
                placeholder="What you plan to work on next..."
                value={nextDayPlan}
                onChange={(e) => setNextDayPlan(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedDeliverable || !workCompleted || !hoursWorked || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
