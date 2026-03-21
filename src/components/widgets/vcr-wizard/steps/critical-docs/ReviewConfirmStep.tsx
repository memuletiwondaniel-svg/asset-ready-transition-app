import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, X, Layers, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SystemDocSelections } from './DocumentSelectionStep';

interface ReviewConfirmStepProps {
  selections: SystemDocSelections;
  onSelectionsChange: (selections: SystemDocSelections) => void;
  vcrId: string;
}

export const ReviewConfirmStep: React.FC<ReviewConfirmStepProps> = ({
  selections, onSelectionsChange, vcrId,
}) => {
  // Fetch systems
  const { data: systems = [] } = useQuery({
    queryKey: ['vcr-systems', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('system_id, p2a_systems(id, name, system_id)')
        .eq('handover_point_id', vcrId);
      if (error) throw error;
      return (data || []).map((r: any) => r.p2a_systems).filter(Boolean);
    },
  });

  // Fetch all doc types for display
  const { data: docTypes = [] } = useQuery({
    queryKey: ['dms-document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_document_types')
        .select('id, code, document_name, tier, discipline_code')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const docMap = useMemo(() => {
    const map = new Map<string, any>();
    docTypes.forEach(d => map.set(d.id, d));
    return map;
  }, [docTypes]);

  const removeDoc = (systemId: string, docId: string) => {
    const current = selections[systemId] || [];
    const next = current.filter(id => id !== docId);
    const updated = { ...selections };
    if (next.length === 0) {
      delete updated[systemId];
    } else {
      updated[systemId] = next;
    }
    onSelectionsChange(updated);
  };

  const totalDocs = Object.values(selections).reduce((sum, ids) => sum + ids.length, 0);
  const allDocIds = new Set(Object.values(selections).flat());
  const tier1Count = [...allDocIds].filter(id => docMap.get(id)?.tier === 'Tier 1').length;
  const tier2Count = [...allDocIds].filter(id => docMap.get(id)?.tier === 'Tier 2').length;

  const groupEntries = Object.entries(selections).filter(([, ids]) => ids.length > 0);

  if (totalDocs === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No Documents Selected</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Go back to Step 2 to select documents for your systems.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Summary Banner */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {totalDocs} document{totalDocs !== 1 ? 's' : ''} identified across {groupEntries.length} group{groupEntries.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-3 mt-1">
            {tier1Count > 0 && (
              <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">
                {tier1Count} Tier 1
              </Badge>
            )}
            {tier2Count > 0 && (
              <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">
                {tier2Count} Tier 2
              </Badge>
            )}
            {totalDocs - tier1Count - tier2Count > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {totalDocs - tier1Count - tier2Count} Other
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Grouped by system */}
      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-4">
          {groupEntries.map(([systemId, docIds]) => {
            const systemName = systemId === '__all__'
              ? 'All Systems'
              : systems.find((s: any) => s.id === systemId)?.name || systemId;

            return (
              <Card key={systemId}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {systemId === '__all__' && <Layers className="w-4 h-4 text-muted-foreground" />}
                    <h4 className="text-sm font-semibold text-foreground">{systemName}</h4>
                    <Badge variant="secondary" className="text-[10px] px-1.5">{docIds.length}</Badge>
                  </div>

                  <div className="space-y-1">
                    {docIds.map(docId => {
                      const doc = docMap.get(docId);
                      if (!doc) return null;
                      return (
                        <div
                          key={docId}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40 group hover:bg-muted/60 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-[10px] text-muted-foreground shrink-0">{doc.code}</span>
                            <span className="text-sm truncate">{doc.document_name}</span>
                            {doc.tier && (
                              <Badge variant="outline" className={cn(
                                'text-[9px] shrink-0',
                                doc.tier === 'Tier 1' ? 'border-orange-300 text-orange-600' : 'border-blue-300 text-blue-600'
                              )}>
                                {doc.tier}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                            onClick={() => removeDoc(systemId, docId)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
