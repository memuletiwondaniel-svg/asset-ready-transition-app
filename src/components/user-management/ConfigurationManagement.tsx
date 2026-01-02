import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users } from 'lucide-react';
import FunctionsManagement from './FunctionsManagement';
import RolesManagement from './RolesManagement';

export const ConfigurationManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('functions');

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="functions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Functions
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="functions" className="mt-6">
          <FunctionsManagement />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfigurationManagement;
