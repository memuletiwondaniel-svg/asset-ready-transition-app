import React, { useState } from 'react';
import { ArrowLeft, Key, ClipboardList, Award, AlertTriangle, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import PACManagementTab from './PACManagementTab';
import FACManagementTab from './FACManagementTab';
import SOFCertificateManagement from './SOFCertificateManagement';
import OWLManagementTab from './OWLManagementTab';

interface ManageHandoverProps {
  onBack: () => void;
}

const getParentTabIconColor = (tabValue: string, isActive: boolean) => {
  if (!isActive) return 'text-muted-foreground/50';
  
  switch (tabValue) {
    case 'pac':
      return 'text-teal-500 dark:text-teal-400';
    case 'fac':
      return 'text-emerald-500 dark:text-emerald-400';
    case 'sof':
      return 'text-blue-500 dark:text-blue-400';
    case 'owl':
      return 'text-amber-500 dark:text-amber-400';
    default:
      return 'text-foreground';
  }
};

export const ManageHandover: React.FC<ManageHandoverProps> = ({ onBack }) => {
  const { translations: t } = useLanguage();
  const [activeTab, setActiveTab] = useState('pac');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl px-6 py-4 sticky top-0 z-10">
        <BreadcrumbNavigation 
          currentPageLabel="P2A Handover" 
          customBreadcrumbs={[
            { label: 'Home', path: '/', onClick: () => window.location.href = '/' },
            { label: 'Administration', path: '/admin-tools', onClick: () => window.location.href = '/admin-tools' }
          ]}
        />
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {t.p2aHandover || 'P2A Handover'}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t.p2aHandoverDesc || 'Configure PAC, FAC, SoF certificates and OWL tracking'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex h-12 w-auto">
            <TabsTrigger 
              value="pac" 
              className={cn(
                "flex items-center gap-2 px-4 transition-colors duration-200",
                activeTab !== 'pac' && "text-muted-foreground/60"
              )}
            >
              <ClipboardList className={cn("h-4 w-4 shrink-0 transition-colors duration-200", getParentTabIconColor('pac', activeTab === 'pac'))} />
              <span className="hidden sm:inline whitespace-nowrap">Provisional Handover (PAC)</span>
              <span className="sm:hidden">PAC</span>
            </TabsTrigger>
            <TabsTrigger 
              value="fac" 
              className={cn(
                "flex items-center gap-2 px-4 transition-colors duration-200",
                activeTab !== 'fac' && "text-muted-foreground/60"
              )}
            >
              <Award className={cn("h-4 w-4 shrink-0 transition-colors duration-200", getParentTabIconColor('fac', activeTab === 'fac'))} />
              <span className="hidden sm:inline whitespace-nowrap">Final Handover (FAC)</span>
              <span className="sm:hidden">FAC</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sof" 
              className={cn(
                "flex items-center gap-2 px-4 transition-colors duration-200",
                activeTab !== 'sof' && "text-muted-foreground/60"
              )}
            >
              <FileCheck2 className={cn("h-4 w-4 shrink-0 transition-colors duration-200", getParentTabIconColor('sof', activeTab === 'sof'))} />
              <span>SoF</span>
            </TabsTrigger>
            <TabsTrigger 
              value="owl" 
              className={cn(
                "flex items-center gap-2 px-4 transition-colors duration-200",
                activeTab !== 'owl' && "text-muted-foreground/60"
              )}
            >
              <AlertTriangle className={cn("h-4 w-4 shrink-0 transition-colors duration-200", getParentTabIconColor('owl', activeTab === 'owl'))} />
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
