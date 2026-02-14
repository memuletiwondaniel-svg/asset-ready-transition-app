import React, { createContext, useContext, useMemo } from 'react';
import { P2ASystem } from '../hooks/useP2ASystems';

interface VCRSystemsContextValue {
  /** Get systems assigned to a specific VCR (by handover point ID) */
  getSystemsForVCR: (handoverPointId: string) => P2ASystem[];
}

const VCRSystemsContext = createContext<VCRSystemsContextValue>({
  getSystemsForVCR: () => [],
});

export const useVCRSystems = () => useContext(VCRSystemsContext);

interface VCRSystemsProviderProps {
  systems: P2ASystem[];
  children: React.ReactNode;
}

export const VCRSystemsProvider: React.FC<VCRSystemsProviderProps> = ({ systems, children }) => {
  const systemsByVCR = useMemo(() => {
    const map = new Map<string, P2ASystem[]>();
    for (const sys of systems) {
      if (sys.assigned_handover_point_id) {
        const existing = map.get(sys.assigned_handover_point_id) || [];
        existing.push(sys);
        map.set(sys.assigned_handover_point_id, existing);
      }
    }
    return map;
  }, [systems]);

  const value = useMemo(() => ({
    getSystemsForVCR: (id: string) => systemsByVCR.get(id) || [],
  }), [systemsByVCR]);

  return (
    <VCRSystemsContext.Provider value={value}>
      {children}
    </VCRSystemsContext.Provider>
  );
};
