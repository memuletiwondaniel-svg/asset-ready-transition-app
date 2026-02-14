import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, ClipboardList, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import PSSRConfigurationMatrix from '@/components/pssr/PSSRConfigurationMatrix';
import ChecklistItemsLibrary from '@/components/pssr/ChecklistItemsLibrary';
import ItemCategoriesTab from '@/components/pssr/ItemCategoriesTab';

const getTabIconColor = (tabValue: string, isActive: boolean) => {
  if (!isActive) return 'text-muted-foreground/50';
  
  switch (tabValue) {
    case 'categories':
      return 'text-violet-500 dark:text-violet-400';
    case 'checklist-items':
      return 'text-blue-500 dark:text-blue-400';
    case 'templates':
      return 'text-amber-500 dark:text-amber-400';
    default:
      return 'text-foreground';
  }
};

const PSSRManagementTab: React.FC = () => {
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
            <Settings className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('templates', activeSubTab === 'templates'))} />
            Templates
          </TabsTrigger>
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
            value="checklist-items" 
            className={cn(
              "flex items-center gap-2 transition-colors duration-200",
              activeSubTab !== 'checklist-items' && "text-muted-foreground/60"
            )}
          >
            <ClipboardList className={cn("h-4 w-4 transition-colors duration-200", getTabIconColor('checklist-items', activeSubTab === 'checklist-items'))} />
            Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <PSSRConfigurationMatrix />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <ItemCategoriesTab />
        </TabsContent>

        <TabsContent value="checklist-items" className="mt-6">
          <ChecklistItemsLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PSSRManagementTab;
