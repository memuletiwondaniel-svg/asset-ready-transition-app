import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, List, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import PACCertificateEditor from './PACCertificateEditor';
import PACPrerequisitesList from './PACPrerequisitesList';
import PACTemplatesList from './PACTemplatesList';

const getTabIconColor = (tabValue: string, isActive: boolean) => {
  if (!isActive) return 'text-muted-foreground/50';
  
  switch (tabValue) {
    case 'certificate':
      return 'text-blue-500 dark:text-blue-400';
    case 'prerequisites':
      return 'text-amber-500 dark:text-amber-400';
    case 'templates':
      return 'text-purple-500 dark:text-purple-400';
    default:
      return 'text-foreground';
  }
};

const PACManagementTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('certificate');

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="h-10">
          <TabsTrigger 
            value="certificate" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'certificate' && "text-muted-foreground/60"
            )}
          >
            <FileText className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('certificate', activeSubTab === 'certificate'))} />
            PAC
          </TabsTrigger>
          <TabsTrigger 
            value="prerequisites" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'prerequisites' && "text-muted-foreground/60"
            )}
          >
            <List className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('prerequisites', activeSubTab === 'prerequisites'))} />
            Prerequisites
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'templates' && "text-muted-foreground/60"
            )}
          >
            <LayoutTemplate className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('templates', activeSubTab === 'templates'))} />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="certificate" className="mt-6">
          <PACCertificateEditor />
        </TabsContent>

        <TabsContent value="prerequisites" className="mt-6">
          <PACPrerequisitesList />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <PACTemplatesList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PACManagementTab;
