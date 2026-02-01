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
    qualificationId: 'Q-DP300-EQP-001',
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
    qualificationId: 'Q-DP300-TRN-002',
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
    qualificationId: 'Q-DP300-DOC-003',
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
    qualificationId: 'Q-DP300-SPR-004',
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

// DP385-specific qualifications
const dp385Deviations: QualificationDetail[] = [
  {
    id: 'dp385-1',
    qualificationId: 'Q-DP385-ESD-001',
    category: 'Safety Systems',
    title: 'Temporary Override on ESD Valve at OT2 and OT3',
    description: 'ESD valve logic override required at OT2 and OT3 as stations cannot be shut down to implement logic changes until Feb 17th 2026. Temporary override in place.',
    severity: 'high',
    status: 'approved',
    approvedBy: 'Antoine Segret',
    approverRole: 'Tech Safety TA2',
    secondApprover: 'Bart Den Hond',
    secondApproverRole: 'PACO TA2 (Asset)',
    approvedAt: '2026-01-29',
    mitigationMeasures: 'Independent safeguard installed at the inlet to CS6/7 on the other end of the piping is fully functional and appropriately sized to protect against overpressurization of the downstream facility. Daily verification checks in place.',
    expiryDate: '2026-02-17',
    punchlistRef: 'PL-2026-0412',
    riskDescription: 'Potential overpressure scenario at downstream facility if ESD valve fails to actuate during process upset',
    riskRating: 'High',
    actionOwner: 'Rashid Al-Mansour',
    actionOwnerRole: 'I&C Lead Engineer',
    attachments: [
      { name: 'ESD_Override_Risk_Assessment.pdf', type: 'PDF' },
      { name: 'CS6_7_Safeguard_Verification.pdf', type: 'PDF' },
      { name: 'Daily_Check_Procedure.docx', type: 'Word' },
    ],
  },
  {
    id: 'dp385-2',
    qualificationId: 'Q-DP385-SYS-002',
    category: 'Control Systems',
    title: 'CS6/7 Control System Software Backups and Licence',
    description: 'Software backups and licence documentation for the CS6/7 control system are yet to be received from vendor.',
    severity: 'medium',
    status: 'approved',
    approvedBy: 'Ahmed Khalil',
    approverRole: 'I&C TA2',
    approvedAt: '2026-01-28',
    mitigationMeasures: 'Vendor support agreement in place for emergency recovery. Temporary licence issued pending formal transfer. Backup scheduled for completion by Feb 28th.',
    expiryDate: '2026-02-28',
    riskDescription: 'Risk of extended downtime in case of control system failure requiring software restoration',
    riskRating: 'Medium',
    actionOwner: 'Fatima Al-Rashid',
    actionOwnerRole: 'Control Systems Engineer',
    attachments: [
      { name: 'Vendor_Support_Agreement.pdf', type: 'PDF' },
      { name: 'Temp_Licence_Confirmation.pdf', type: 'PDF' },
    ],
  },
  {
    id: 'dp385-3',
    qualificationId: 'Q-DP385-MNT-003',
    category: 'Maintenance',
    title: 'CS7 Preventive Maintenance Plans Not Yet Activated',
    description: 'Preventive Maintenance (PM) work orders for CS7 equipment have not yet been activated in SAP. PM strategy approved but awaiting system configuration.',
    severity: 'low',
    status: 'approved',
    approvedBy: 'Dean Nye',
    approverRole: 'Central MTCE Lead',
    approvedAt: '2026-01-30',
    mitigationMeasures: 'Manual PM tracking in place via spreadsheet. Critical equipment identified for priority activation. SAP configuration scheduled for completion by Mar 15th.',
    expiryDate: '2026-03-15',
    riskDescription: 'Potential for missed preventive maintenance activities leading to unplanned equipment failures',
    riskRating: 'Low',
    actionOwner: 'Hassan Ibrahim',
    actionOwnerRole: 'SAP Maintenance Planner',
    attachments: [
      { name: 'CS7_PM_Strategy_Approved.pdf', type: 'PDF' },
      { name: 'Manual_PM_Tracker.xlsx', type: 'Excel' },
    ],
  },
  {
    id: 'dp385-4',
    qualificationId: 'Q-DP385-DOC-004',
    category: 'Documentation',
    title: 'BGC-WQ1FOD Interface Document and Custody Transfer Pending',
    description: 'The BGC-WQ1FOD Interface document is yet to be updated. Transfer of custody, care and control of BGC-installed facilities within the WQ1FOD fence is still pending formal handover.',
    severity: 'medium',
    status: 'approved',
    approvedBy: 'Ali Danbous',
    approverRole: 'Operations Manager',
    secondApprover: 'Lyle Koch',
    secondApproverRole: 'CS Deputy Dir.',
    approvedAt: '2026-01-27',
    mitigationMeasures: 'Interim operating agreement in place between BGC and WQ1FOD. Weekly coordination meetings established. Draft interface document under review.',
    expiryDate: '2026-03-31',
    riskDescription: 'Potential for no maintenance activity being executed on BGC-installed facilities due to unclear custody and responsibility',
    riskRating: 'Medium',
    actionOwner: 'Khalid Rahman',
    actionOwnerRole: 'Project Interface Manager',
    attachments: [
      { name: 'Interim_Operating_Agreement.pdf', type: 'PDF' },
      { name: 'Draft_Interface_Document_v2.pdf', type: 'PDF' },
      { name: 'Coordination_Meeting_Minutes.pdf', type: 'PDF' },
    ],
  },
];

export const SOFQualificationsPanel: React.FC<SOFQualificationsPanelProps> = ({ pssrId }) => {
  const isDP385 = pssrId === 'mock-pssr-dp385';
  const deviations = isDP385 ? dp385Deviations : mockDeviations;
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
              {deviations.length} Approved Deviation{deviations.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              The following qualifications against VCR or PSSR items have been reviewed, risk-assessed and approved with appropriate mitigations in place
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {deviations.map((deviation) => {
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
