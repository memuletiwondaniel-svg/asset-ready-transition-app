import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, Layers, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import VCRTemplatesList from './VCRTemplatesList';
import VCRItemCategoryTab from './VCRItemCategoryTab';
import VCRItemsTab from './VCRItemsTab';

const getTabIconColor = (tabValue: string, isActive: boolean) => {
  if (!isActive) return 'text-muted-foreground/50';
  
  switch (tabValue) {
    case 'categories':
      return 'text-violet-500 dark:text-violet-400';
    case 'items':
      return 'text-blue-500 dark:text-blue-400';
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
            value="items" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'items' && "text-muted-foreground/60"
            )}
          >
            <ClipboardList className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('items', activeSubTab === 'items'))} />
            Items
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'templates' && "text-muted-foreground/60"
            )}
          >
            <List className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('templates', activeSubTab === 'templates'))} />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <VCRItemCategoryTab />
        </TabsContent>

        <TabsContent value="items" className="mt-6">
          <VCRItemsTab />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <VCRTemplatesList />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default VCRManagementTab;
