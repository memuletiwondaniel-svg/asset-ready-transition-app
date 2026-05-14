import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardList, ScrollText } from 'lucide-react';
import { OperationalRegistersStep } from './OperationalRegistersStep';
import { LogsheetsStep } from './LogsheetsStep';

interface RegistersLogsheetsStepProps {
  vcrId: string;
}

export const RegistersLogsheetsStep: React.FC<RegistersLogsheetsStepProps> = ({ vcrId }) => {
  const [tab, setTab] = useState<'registers' | 'logsheets'>('registers');
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
      <TabsList>
        <TabsTrigger value="registers" className="gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" /> Op. Registers
        </TabsTrigger>
        <TabsTrigger value="logsheets" className="gap-1.5">
          <ScrollText className="w-3.5 h-3.5" /> Logsheets
        </TabsTrigger>
      </TabsList>
      <TabsContent value="registers" className="mt-0">
        <OperationalRegistersStep vcrId={vcrId} />
      </TabsContent>
      <TabsContent value="logsheets" className="mt-0">
        <LogsheetsStep vcrId={vcrId} />
      </TabsContent>
    </Tabs>
  );
};
