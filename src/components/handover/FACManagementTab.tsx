import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import FACCertificate from './FACCertificate';
import FACPrerequisitesList from './FACPrerequisitesList';

const getTabIconColor = (tabValue: string, isActive: boolean) => {
  if (!isActive) return 'text-muted-foreground/50';
  
  switch (tabValue) {
    case 'certificate':
      return 'text-teal-500 dark:text-teal-400';
    case 'prerequisites':
      return 'text-amber-500 dark:text-amber-400';
    default:
      return 'text-foreground';
  }
};

const FACManagementTab: React.FC = () => {
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
            FAC
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
        </TabsList>

        <TabsContent value="certificate" className="mt-6">
          <FACCertificate />
        </TabsContent>

        <TabsContent value="prerequisites" className="mt-6">
          <FACPrerequisitesList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FACManagementTab;
