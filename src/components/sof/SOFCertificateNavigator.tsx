import React, { useState } from 'react';
import { FileText, MessageSquare, ClipboardList, ShieldAlert, CheckCircle2, LogOut, ExternalLink, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOFCertificate } from './SOFCertificate';
import { SOFCommentsPanel } from './SOFCommentsPanel';
import { SOFQualificationsPanel } from './SOFQualificationsPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


interface SOFApprover {
  id: string;
  approver_name: string;
  approver_role: string;
  approver_level: number;
  status: string;
  comments?: string;
  approved_at?: string;
  signature_data?: string;
}

interface SOFCertificateNavigatorProps {
  pssrId: string;
  certificateNumber: string;
  pssrReason: string;
  plantName?: string;
  facilityName?: string;
  projectName?: string;
  approvers: SOFApprover[];
  issuedAt?: string;
  status: string;
  onClose?: () => void;
  onExit?: () => void;
  isViewOnly?: boolean;
}

type TabId = 'sof' | 'comments' | 'qualifications' | 'checklists';

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

const getTabsForPssr = (pssrId: string): TabItem[] => {
  const isDP385 = pssrId === 'mock-pssr-dp385';
  return [
    { id: 'sof', label: 'SoF Certificate', icon: <FileText className="h-4 w-4" /> },
    { id: 'comments', label: 'Comments', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'qualifications', label: 'Qualifications', icon: <ShieldAlert className="h-4 w-4" />, count: isDP385 ? 5 : 4 },
    { id: 'checklists', label: 'Checklists', icon: <ClipboardList className="h-4 w-4" /> },
  ];
};

export const SOFCertificateNavigator: React.FC<SOFCertificateNavigatorProps> = ({
  pssrId,
  certificateNumber,
  pssrReason,
  plantName,
  facilityName,
  projectName,
  approvers,
  issuedAt,
  status,
  onClose,
  onExit,
  isViewOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('sof');
  const [confirmationState, setConfirmationState] = useState<'approved' | 'rejected' | null>(null);

  const handleSignComplete = () => {
    setConfirmationState('approved');
  };

  const handleRejectComplete = () => {
    setConfirmationState('rejected');
  };

  // Show confirmation page after signing or rejecting
  if (confirmationState) {
    const isApproved = confirmationState === 'approved';
    
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className={cn(
          "w-full max-w-lg text-center",
          isApproved 
            ? "border-green-500/30 bg-green-50/5" 
            : "border-red-500/30 bg-red-50/5"
        )}>
          <CardContent className="pt-10 pb-8">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
              isApproved ? "bg-green-500/10" : "bg-red-500/10"
            )}>
              {isApproved ? (
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              ) : (
                <XCircle className="h-10 w-10 text-red-500" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isApproved ? 'Statement of Fitness Signed' : 'Statement of Fitness Rejected'}
            </h1>
            <p className="text-muted-foreground mb-2">
              {isApproved 
                ? 'Your signature has been recorded successfully.'
                : 'A Priority 1 action has been created.'}
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              {isApproved 
                ? 'The PSSR Lead has been notified and the next approver can now proceed.'
                : 'The PSSR Lead has been notified. This item must be resolved before re-review.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={onClose}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={onExit}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'sof':
        return (
          <SOFCertificate
            certificateNumber={certificateNumber}
            pssrReason={pssrReason}
            plantName={plantName}
            facilityName={facilityName}
            projectName={projectName}
            approvers={approvers}
            issuedAt={issuedAt}
            status={status}
            onSignComplete={handleSignComplete}
            onRejectComplete={handleRejectComplete}
            isViewOnly={isViewOnly}
            pssrId={pssrId}
          />
        );
      case 'comments':
        return (
          <SOFCommentsPanel pssrId={pssrId} />
        );
      case 'qualifications':
        return (
          <SOFQualificationsPanel pssrId={pssrId} />
        );
      case 'checklists':
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Left Sidebar Navigation */}
      <div className="w-48 flex-shrink-0 border-r border-border bg-muted/30 overflow-y-auto">
        <div className="p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Navigate
          </h3>
          <nav className="space-y-1">
            {getTabsForPssr(pssrId).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                  "hover:bg-accent/50",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
                {tab.count && (
                  <span className={cn(
                    "ml-auto text-xs px-1.5 py-0.5 rounded-full",
                    activeTab === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Info Panel */}
        <div className="p-3 mt-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Certificate</p>
            <p className="truncate">{certificateNumber}</p>
          </div>
          <div className="text-xs text-muted-foreground space-y-2 mt-6">
            <p className="font-medium text-foreground">Reason</p>
            <p className="line-clamp-2">{pssrReason}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default SOFCertificateNavigator;
