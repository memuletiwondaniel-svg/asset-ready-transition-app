import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck, List, Users, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import VCRTemplatesList from './VCRTemplatesList';
import DefaultApproversConfig from './DefaultApproversConfig';
import VCRItemCategoryTab from './VCRItemCategoryTab';

const getTabIconColor = (tabValue: string, isActive: boolean) => {
  if (!isActive) return 'text-muted-foreground/50';
  
  switch (tabValue) {
    case 'categories':
      return 'text-violet-500 dark:text-violet-400';
    case 'templates':
      return 'text-cyan-500 dark:text-cyan-400';
    case 'approvers':
      return 'text-green-500 dark:text-green-400';
    default:
      return 'text-foreground';
  }
};

const VCRManagementTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('categories');

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Verification Certificate of Readiness (VCR)</h2>
      </div>
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="h-10">
          <TabsTrigger 
            value="categories" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'categories' && "text-muted-foreground/60"
            )}
          >
            <Layers className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('categories', activeSubTab === 'categories'))} />
            Categories
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'templates' && "text-muted-foreground/60"
            )}
          >
            <List className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('templates', activeSubTab === 'templates'))} />
            Items
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

        <TabsContent value="categories" className="mt-6">
          <VCRItemCategoryTab />
        </TabsContent>

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
