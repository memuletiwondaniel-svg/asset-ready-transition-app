import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, List } from 'lucide-react';
import FACCertificate from './FACCertificate';
import FACPrerequisitesList from './FACPrerequisitesList';

const FACManagementTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('certificate');

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="h-10">
          <TabsTrigger value="certificate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            FAC
          </TabsTrigger>
          <TabsTrigger value="prerequisites" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Prerequisites (VCR-02)
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
