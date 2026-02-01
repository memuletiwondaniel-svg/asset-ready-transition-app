import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileWarning, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SOFQualificationsPanelProps {
  pssrId: string;
}

// Mock deviation/qualification data - items that couldn't be fully met but were reviewed and approved
const mockDeviations = [
  {
    id: '1',
    category: 'Equipment',
    title: 'Temporary Bypass on PSV-1234',
    description: 'Pressure Safety Valve PSV-1234 bypass installed pending replacement valve delivery. Manual monitoring procedure in place.',
    severity: 'medium',
    status: 'approved',
    approvedBy: 'Ali Danbous',
    approvedAt: '2026-01-28',
    mitigationMeasures: 'Continuous operator monitoring every 2 hours. Backup manual relief procedure documented.',
    expiryDate: '2026-02-15',
  },
  {
    id: '2',
    category: 'Training',
    title: 'Deferred Operator Certification',
    description: '2 operators pending final certification for new compressor unit. Supervised operation only until certification complete.',
    severity: 'low',
    status: 'approved',
    approvedBy: 'Ali Danbous',
    approvedAt: '2026-01-29',
    mitigationMeasures: 'Senior operator supervision required at all times. Training scheduled for completion by Feb 10.',
    expiryDate: '2026-02-10',
  },
  {
    id: '3',
    category: 'Documentation',
    title: 'P&ID Update Pending',
    description: 'As-built P&IDs not yet updated to reflect field changes. Marked-up copies available at control room.',
    severity: 'low',
    status: 'approved',
    approvedBy: 'Ali Danbous',
    approvedAt: '2026-01-27',
    mitigationMeasures: 'Marked-up drawings available. Final P&IDs due within 30 days of startup.',
    expiryDate: '2026-03-01',
  },
];

export const SOFQualificationsPanel: React.FC<SOFQualificationsPanelProps> = ({ pssrId }) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
            <FileWarning className="h-3 w-3 mr-1" />
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Low
          </Badge>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return (
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Qualifications</h2>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {mockDeviations.length} Approved Deviation{mockDeviations.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              The following qualifications against VCR or PSSR items have been reviewed, risk-assessed and approved with appropriate mitigations in place
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {mockDeviations.map((deviation) => (
          <Card key={deviation.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-normal">
                      {deviation.category}
                    </Badge>
                    {getSeverityBadge(deviation.severity)}
                    {getStatusBadge(deviation.status)}
                  </div>
                  <CardTitle className="text-base mt-2">{deviation.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{deviation.description}</p>
              </div>

              <div className={cn(
                "p-3 rounded-lg border bg-muted/30",
                deviation.severity === 'medium' && "border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/20"
              )}>
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  Mitigation Measures
                </p>
                <p className="text-sm">{deviation.mitigationMeasures}</p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div>
                  <span className="font-medium">Approved by:</span>{' '}
                  <span className="text-foreground">{deviation.approvedBy}</span>
                </div>
                <div>
                  <span className="font-medium">Approved on:</span>{' '}
                  <span className="text-foreground">{formatDate(deviation.approvedAt)}</span>
                </div>
                <div>
                  <span className="font-medium">Valid until:</span>{' '}
                  <span className="text-foreground">{formatDate(deviation.expiryDate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        All deviations must be closed or re-approved before their expiry date
      </p>
    </div>
  );
};

export default SOFQualificationsPanel;
