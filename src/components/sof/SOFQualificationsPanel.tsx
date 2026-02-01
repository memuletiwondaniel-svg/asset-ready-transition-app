import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileWarning, Clock, ChevronRight, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SOFQualificationDetailDialog, QualificationDetail } from './SOFQualificationDetailDialog';

interface SOFQualificationsPanelProps {
  pssrId: string;
}

// Mock deviation/qualification data - items that couldn't be fully met but were reviewed and approved
const mockDeviations: QualificationDetail[] = [
  {
    id: '1',
    qualificationId: 'Q-2026-0042',
    category: 'Equipment',
    title: 'Temporary Bypass on PSV-1234',
    description: 'Pressure Safety Valve PSV-1234 bypass installed pending replacement valve delivery. Manual monitoring procedure in place.',
    severity: 'medium',
    status: 'approved',
    approvedBy: 'Stuart Lugo',
    approverRole: 'Static TA2 (P&E)',
    approvedAt: '2026-01-28',
    mitigationMeasures: 'Continuous operator monitoring every 2 hours. Backup manual relief procedure documented.',
    expiryDate: '2026-02-15',
    punchlistRef: 'PL-2026-0187',
    riskDescription: 'Potential over-pressure condition if bypass left open during process upset',
    riskRating: 'Medium',
    actionOwner: 'Victor Liew',
    actionOwnerRole: 'Project Hub Lead Zubair',
    attachments: [
      { name: 'PSV-1234_Bypass_Procedure.pdf', type: 'PDF' },
      { name: 'Risk_Assessment_Form.xlsx', type: 'Excel' },
    ],
  },
  {
    id: '2',
    qualificationId: 'Q-2026-0043',
    category: 'Training',
    title: 'Deferred Operator Certification',
    description: '2 operators pending final certification for new compressor unit. Supervised operation only until certification complete.',
    severity: 'low',
    status: 'approved',
    approvedBy: 'Ali Danbous',
    approverRole: 'Operations Manager',
    approvedAt: '2026-01-29',
    mitigationMeasures: 'Senior operator supervision required at all times. Training scheduled for completion by Feb 10.',
    expiryDate: '2026-02-10',
    riskDescription: 'Operators may not respond optimally to abnormal situations',
    riskRating: 'Low',
    actionOwner: 'Ahmed Hassan',
    actionOwnerRole: 'Training Coordinator',
    attachments: [
      { name: 'Training_Schedule.pdf', type: 'PDF' },
    ],
  },
  {
    id: '3',
    qualificationId: 'Q-2026-0044',
    category: 'Documentation',
    title: 'P&ID Update Pending',
    description: 'As-built P&IDs not yet updated to reflect field changes. Marked-up copies available at control room.',
    severity: 'low',
    status: 'approved',
    approvedBy: 'Ali Danbous',
    approverRole: 'Operations Manager',
    approvedAt: '2026-01-27',
    mitigationMeasures: 'Marked-up drawings available. Final P&IDs due within 30 days of startup.',
    expiryDate: '2026-03-01',
    riskDescription: 'Potential confusion during emergency response if drawings not accurate',
    riskRating: 'Low',
    actionOwner: 'Sarah Chen',
    actionOwnerRole: 'Document Control Lead',
    attachments: [],
  },
];

export const SOFQualificationsPanel: React.FC<SOFQualificationsPanelProps> = ({ pssrId }) => {
  const [selectedQualification, setSelectedQualification] = useState<QualificationDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleQualificationClick = (qualification: QualificationDetail) => {
    setSelectedQualification(qualification);
    setDialogOpen(true);
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
              Click on a qualification to view full details including risk assessment and attachments
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {mockDeviations.map((deviation) => (
          <Card 
            key={deviation.id}
            className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
            onClick={() => handleQualificationClick(deviation)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant="outline" className="text-xs font-normal">
                      {deviation.category}
                    </Badge>
                    {getSeverityBadge(deviation.severity)}
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  </div>
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                    {deviation.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {deviation.description}
                  </p>
                  
                  {/* Subtle punchlist reference for hardware items */}
                  {deviation.punchlistRef && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/70">
                      <Hash className="h-3 w-3" />
                      <span>Punchlist: {deviation.punchlistRef}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        All deviations must be closed or re-approved before their expiry date
      </p>

      <SOFQualificationDetailDialog
        qualification={selectedQualification}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default SOFQualificationsPanel;
