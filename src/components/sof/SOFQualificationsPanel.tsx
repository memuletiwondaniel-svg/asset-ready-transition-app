import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileWarning, Clock, ChevronRight } from 'lucide-react';
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
    title: 'Waukesha Engine Maintenance Training',
    description: 'Maintenance technicians require specialized training on Waukesha gas engine overhaul procedures before performing independent maintenance. Training scheduled with vendor for Feb 25th 2026.',
    severity: 'low',
    status: 'approved',
    approvedBy: 'Lyle Koch',
    approverRole: 'CS Deputy Dir.',
    approvedAt: '2026-01-29',
    mitigationMeasures: 'Vendor technical support available on-call until training complete. All Waukesha engine maintenance to be performed under supervision of certified personnel.',
    expiryDate: '2026-03-15',
    riskDescription: 'Improper maintenance procedures could lead to engine failure or safety incidents',
    riskRating: 'Low',
    actionOwner: 'Mohamed Ali',
    actionOwnerRole: 'ORA Engr.',
    attachments: [
      { name: 'Waukesha_Training_Schedule.pdf', type: 'PDF' },
      { name: 'Vendor_Confirmation_Letter.pdf', type: 'PDF' },
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
  {
    id: '4',
    qualificationId: 'Q-2026-0045',
    category: 'Spares',
    title: 'Ariel Compressor & Heat Exchanger Spares Pending',
    description: 'Critical spares for Ariel compressor and Heat Exchanger are yet to be delivered.',
    severity: 'medium',
    status: 'approved',
    approvedBy: 'Dean Nye',
    approverRole: 'Central MTCE Lead',
    secondApprover: 'Lyle Koch',
    secondApproverRole: 'CS Deputy Dir.',
    approvedAt: '2026-01-30',
    mitigationMeasures: 'Vendor emergency support agreement in place. Nearest available spares identified at sister facility for emergency transfer if required.',
    expiryDate: '2026-11-30',
    riskDescription: 'Extended downtime if critical failure occurs before spares delivery',
    riskRating: 'Medium',
    actionOwner: 'Alex Burulin',
    actionOwnerRole: 'CMMS Lead',
    attachments: [
      { name: 'BOM_MinMax_Approval.pdf', type: 'PDF' },
      { name: 'PO_904413676_Confirmation.pdf', type: 'PDF' },
    ],
    poNumber: 'P# 904413676',
    poDeliveryDate: 'Nov 2026',
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
        {mockDeviations.map((deviation) => {
          const formatDate = (dateStr: string) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          };
          
          return (
            <Card 
              key={deviation.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
              onClick={() => handleQualificationClick(deviation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-muted-foreground/30">
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
                    
                    {/* Approver and Valid Until info */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span>Approved by <span className="text-foreground">{deviation.approvedBy}</span>{deviation.approverRole && <span className="text-muted-foreground"> - {deviation.approverRole}</span>}</span>
                      <span>•</span>
                      <span>Valid until <span className="text-foreground">{formatDate(deviation.expiryDate)}</span></span>
                    </div>
                </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
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
