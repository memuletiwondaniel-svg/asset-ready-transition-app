import React, { useState } from 'react';
import { ArrowLeft, FileCheck2, ClipboardList, Award, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useLanguage } from '@/contexts/LanguageContext';
import PACManagementTab from './PACManagementTab';
import FACManagementTab from './FACManagementTab';
import SOFCertificateManagement from './SOFCertificateManagement';
import OWLManagementTab from './OWLManagementTab';

interface ManageHandoverProps {
  onBack: () => void;
}

export const ManageHandover: React.FC<ManageHandoverProps> = ({ onBack }) => {
  const { translations: t } = useLanguage();
  const [activeTab, setActiveTab] = useState('pac');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <BreadcrumbNavigation currentPageLabel="Manage Handover" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
              <FileCheck2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {t.manageHandover || 'Manage Handover'}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t.manageHandoverDesc || 'Configure PAC, FAC, SoF certificates and OWL tracking'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex h-12 w-auto">
            <TabsTrigger value="pac" className="flex items-center gap-2 px-4">
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Provisional Handover (PAC)</span>
              <span className="sm:hidden">PAC</span>
            </TabsTrigger>
            <TabsTrigger value="fac" className="flex items-center gap-2 px-4">
              <Award className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Final Handover (FAC)</span>
              <span className="sm:hidden">FAC</span>
            </TabsTrigger>
            <TabsTrigger value="sof" className="flex items-center gap-2 px-4">
              <FileCheck2 className="h-4 w-4 shrink-0" />
              <span>SoF</span>
            </TabsTrigger>
            <TabsTrigger value="owl" className="flex items-center gap-2 px-4">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>OWL</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pac" className="mt-6">
            <PACManagementTab />
          </TabsContent>

          <TabsContent value="fac" className="mt-6">
            <FACManagementTab />
          </TabsContent>

          <TabsContent value="sof" className="mt-6">
            <SOFCertificateManagement />
          </TabsContent>

          <TabsContent value="owl" className="mt-6">
            <OWLManagementTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManageHandover;
