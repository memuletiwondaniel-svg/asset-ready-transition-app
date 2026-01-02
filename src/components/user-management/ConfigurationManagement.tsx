import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderTree, Users, Building2 } from 'lucide-react';
import FunctionsManagement from './FunctionsManagement';
import RolesManagement from './RolesManagement';
import CommissionsManagement from './CommissionsManagement';

export const ConfigurationManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('functions');

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="functions" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Functions
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Commissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="functions" className="mt-6">
          <FunctionsManagement />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesManagement />
        </TabsContent>

        <TabsContent value="commissions" className="mt-6">
          <CommissionsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfigurationManagement;
