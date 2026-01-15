import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, List, LayoutTemplate } from 'lucide-react';
import PACCertificateEditor from './PACCertificateEditor';
import PACPrerequisitesList from './PACPrerequisitesList';
import PACTemplatesList from './PACTemplatesList';

const PACManagementTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('certificate');

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="h-10">
          <TabsTrigger value="certificate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PAC
          </TabsTrigger>
          <TabsTrigger value="prerequisites" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Prerequisites
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
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
