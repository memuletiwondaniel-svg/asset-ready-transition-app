import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Milestone, Settings2 } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { ORAActivityCatalog } from './ORAActivityCatalog';
import { ProjectMilestonesManagementTab } from '@/components/project/ProjectMilestonesManagementTab';

interface ORAConfigurationManagementProps {
  onBack: () => void;
}

export const ORAConfigurationManagement: React.FC<ORAConfigurationManagementProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('activity-catalog');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <BreadcrumbNavigation currentPageLabel="ORA Configuration" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
              <Settings2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Manage ORA Plans
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure ORA activities, deliverables, and milestone types
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
              <TabsTrigger value="activity-catalog" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Activity Catalog
              </TabsTrigger>
              <TabsTrigger value="milestones" className="flex items-center gap-2">
                <Milestone className="h-4 w-4" />
                Milestone Types
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity-catalog" className="mt-0">
              <ORAActivityCatalog />
            </TabsContent>

            <TabsContent value="milestones" className="mt-0">
              <ProjectMilestonesManagementTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
