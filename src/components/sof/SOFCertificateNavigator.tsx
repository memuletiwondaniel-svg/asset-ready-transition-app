import React, { useState } from 'react';
import { FileText, MessageSquare, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOFCertificate } from './SOFCertificate';
import { SOFCommentsPanel } from './SOFCommentsPanel';


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
}

type TabId = 'sof' | 'comments' | 'checklists';

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { id: 'sof', label: 'SoF Certificate', icon: <FileText className="h-4 w-4" /> },
  { id: 'comments', label: 'Comments', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'checklists', label: 'Checklists', icon: <ClipboardList className="h-4 w-4" /> },
];

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
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('sof');

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
          />
        );
      case 'comments':
        return (
          <SOFCommentsPanel pssrId={pssrId} />
        );
      case 'checklists':
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-[600px]">
      {/* Left Sidebar Navigation */}
      <div className="w-48 flex-shrink-0 border-r border-border bg-muted/30">
        <div className="p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Navigate
          </h3>
          <nav className="space-y-1">
            {tabs.map((tab) => (
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
              </button>
            ))}
          </nav>
        </div>

        {/* Info Panel */}
        <div className="p-3 mt-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Certificate</p>
            <p className="truncate">{certificateNumber}</p>
            <p className="font-medium text-foreground mt-3">Reason</p>
            <p className="line-clamp-2">{pssrReason}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default SOFCertificateNavigator;
