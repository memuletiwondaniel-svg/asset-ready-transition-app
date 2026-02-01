import React from 'react';
import { Award, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SOFQualificationsPanelProps {
  pssrId: string;
}

// Mock qualification data - would be fetched from database in production
const mockQualifications = [
  {
    id: '1',
    approver_name: 'Paul Van Den Hemel',
    approver_role: 'P&M Director',
    qualifications: [
      { name: 'NEBOSH International General Certificate', status: 'valid', expiry: '2027-06-15' },
      { name: 'Authorized Gas Tester (AGT)', status: 'valid', expiry: '2026-12-01' },
      { name: 'Process Safety Management', status: 'valid', expiry: '2026-08-20' },
    ],
  },
  {
    id: '2',
    approver_name: 'John Smith',
    approver_role: 'HSSE Director',
    qualifications: [
      { name: 'IOSH Managing Safely', status: 'valid', expiry: '2027-03-10' },
      { name: 'Lead Auditor ISO 45001', status: 'valid', expiry: '2026-11-25' },
      { name: 'Environmental Management Certificate', status: 'expiring', expiry: '2026-03-01' },
    ],
  },
  {
    id: '3',
    approver_name: 'Sarah Johnson',
    approver_role: 'P&E Director',
    qualifications: [
      { name: 'Chartered Engineer (CEng)', status: 'valid', expiry: null },
      { name: 'Project Management Professional (PMP)', status: 'valid', expiry: '2027-09-30' },
      { name: 'Functional Safety Engineer (TÜV)', status: 'valid', expiry: '2026-07-15' },
    ],
  },
];

export const SOFQualificationsPanel: React.FC<SOFQualificationsPanelProps> = ({ pssrId }) => {
  const getStatusBadge = (status: string, expiry: string | null) => {
    if (status === 'expired') {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    if (status === 'expiring') {
      return (
        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Expiring Soon
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Valid
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No Expiry';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Award className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Approver Qualifications</h2>
          <p className="text-sm text-muted-foreground">
            Certification and competency records for SoF signatories
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {mockQualifications.map((approver) => (
          <Card key={approver.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{approver.approver_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{approver.approver_role}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {approver.qualifications.length} Qualifications
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approver.qualifications.map((qual, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border bg-muted/30",
                      qual.status === 'expired' && "border-destructive/30 bg-destructive/5",
                      qual.status === 'expiring' && "border-amber-300/30 bg-amber-50/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{qual.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {qual.expiry ? `Expires: ${formatDate(qual.expiry)}` : 'No Expiry Date'}
                      </p>
                    </div>
                    {getStatusBadge(qual.status, qual.expiry)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Qualification records are maintained by the Competency Assurance team
      </p>
    </div>
  );
};

export default SOFQualificationsPanel;
