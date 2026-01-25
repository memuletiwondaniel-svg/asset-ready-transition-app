import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck, List, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import VCRTemplatesList from './VCRTemplatesList';
import DefaultApproversConfig from './DefaultApproversConfig';

const getTabIconColor = (tabValue: string, isActive: boolean) => {
  if (!isActive) return 'text-muted-foreground/50';
  
  switch (tabValue) {
    case 'templates':
      return 'text-cyan-500 dark:text-cyan-400';
    case 'approvers':
      return 'text-green-500 dark:text-green-400';
    default:
      return 'text-foreground';
  }
};

const VCRManagementTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('templates');

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="h-10">
          <TabsTrigger 
            value="templates" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'templates' && "text-muted-foreground/60"
            )}
          >
            <List className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('templates', activeSubTab === 'templates'))} />
            VCR Templates
          </TabsTrigger>
          <TabsTrigger 
            value="approvers" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'approvers' && "text-muted-foreground/60"
            )}
          >
            <Users className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('approvers', activeSubTab === 'approvers'))} />
            Approvers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <VCRTemplatesList />
        </TabsContent>

        <TabsContent value="approvers" className="mt-6">
          <DefaultApproversConfig certificateType="VCR" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VCRManagementTab;
