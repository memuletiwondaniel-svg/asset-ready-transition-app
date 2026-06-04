import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wrench, Package } from 'lucide-react';
import { CMMSStep } from './CMMSStep';
import { SparesStep } from './SparesStep';

interface CMMSSparesStepProps {
  vcrId: string;
}

/**
 * Merged "CMMS & Spares" step. Internal Tabs preserve each underlying
 * component unchanged — no data-shape or schema changes.
 */
export const CMMSSparesStep: React.FC<CMMSSparesStepProps> = ({ vcrId }) => {
  const [tab, setTab] = useState<'cmms' | 'spares'>('cmms');
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'cmms' | 'spares')} className="space-y-4">
      <TabsList>
        <TabsTrigger value="cmms" className="gap-1.5">
          <Wrench className="w-3.5 h-3.5" /> CMMS
        </TabsTrigger>
        <TabsTrigger value="spares" className="gap-1.5">
          <Package className="w-3.5 h-3.5" /> 2Y Spares
        </TabsTrigger>
      </TabsList>
      <TabsContent value="cmms" className="mt-0">
        <CMMSStep vcrId={vcrId} />
      </TabsContent>
      <TabsContent value="spares" className="mt-0">
        <SparesStep vcrId={vcrId} />
      </TabsContent>
    </Tabs>
  );
};
