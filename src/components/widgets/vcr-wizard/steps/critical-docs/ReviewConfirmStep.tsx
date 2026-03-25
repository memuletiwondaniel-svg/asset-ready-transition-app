import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, X, CheckCircle2, Package, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SystemDocSelections } from './DocumentSelectionStep';

interface ReviewConfirmStepProps {
  selections: SystemDocSelections;
  onSelectionsChange: (selections: SystemDocSelections) => void;
  vcrId: string;
  projectCode?: string;
  plantCode?: string;
  dmsPlatforms?: string[];
}

interface DocTypeRow {
  id: string;
  code: string;
  document_name: string;
  tier: string | null;
  discipline_code: string | null;
  discipline_name: string | null;
  document_scope: string | null;
  is_mdr: boolean | null;
  is_vendor_document: boolean | null;
  package_tag: string | null;
}

const isScopeDoc = (doc: DocTypeRow): boolean => {
  const name = (doc.document_name || '').toLowerCase();
  return name.includes('basis of design') || name.includes('bdep') || name.includes('feed') || doc.code?.toUpperCase().includes('BOD');
};

const DISCIPLINE_NAMES: Record<string, string> = {
  PX: 'Process', EA: 'Electrical', EX: 'Electrical', IN: 'Instrumentation',
  MS: 'Mechanical - Static', MR: 'Rotating Equipment', CV: 'Civil',
  CS: 'Structural', DC: 'Documentation', GN: 'General', ZV: 'Vendor',
};

export const ReviewConfirmStep: React.FC<ReviewConfirmStepProps> = ({
  selections, onSelectionsChange, vcrId, projectCode, plantCode, dmsPlatforms,
}) => {
  const selectedIds = selections['__all__'] || [];

  // Fetch doc types
  const { data: docTypes = [] } = useQuery({
    queryKey: ['dms-document-types-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_document_types')
        .select('id, code, document_name, tier, discipline_code, discipline_name, document_scope, is_mdr, is_vendor_document, package_tag')
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as DocTypeRow[];
    },
  });

  // Fetch packages for display
  const { data: packages = [] } = useQuery({
    queryKey: ['document-packages'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('document_packages')
        .select('id, package_name, package_tag, po_number, vendor_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch VCR info
  const { data: vcrInfo } = useQuery({
    queryKey: ['vcr-info-review', vcrId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('p2a_handover_points')
        .select('code, title, handover_plan_id')
        .eq('id', vcrId)
        .maybeSingle();
      return data;
    },
  });

  const docMap = useMemo(() => {
    const map = new Map<string, DocTypeRow>();
    docTypes.forEach(d => map.set(d.id, d));
    return map;
  }, [docTypes]);

  const selectedDocs = useMemo(() =>
    selectedIds.map(id => docMap.get(id)).filter(Boolean) as DocTypeRow[],
    [selectedIds, docMap]
  );

  // Group by sections
  const projectWideDocs = selectedDocs.filter(d => d.document_scope === 'project');
  const disciplineDocs = selectedDocs.filter(d => d.document_scope !== 'project' && !d.package_tag);
  const packageDocs = selectedDocs.filter(d => !!d.package_tag);

  // Group discipline docs by discipline_code
  const disciplineGroups = useMemo(() => {
    const groups = new Map<string, DocTypeRow[]>();
    disciplineDocs.forEach(d => {
      const key = d.discipline_code || 'Other';
      const existing = groups.get(key) || [];
      existing.push(d);
      groups.set(key, existing);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [disciplineDocs]);

  // Group package docs by package_tag
  const packageGroups = useMemo(() => {
    const groups = new Map<string, DocTypeRow[]>();
    packageDocs.forEach(d => {
      const key = d.package_tag || 'Unknown';
      const existing = groups.get(key) || [];
      existing.push(d);
      groups.set(key, existing);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [packageDocs]);

  const removeDoc = (docId: string) => {
    const next = selectedIds.filter(id => id !== docId);
    onSelectionsChange({ '__all__': next });
  };

  const totalDocs = selectedIds.length;
  const tier1Count = selectedDocs.filter(d => d.tier === 'Tier 1').length;
  const tier2Count = selectedDocs.filter(d => d.tier === 'Tier 2').length;

  if (totalDocs === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No Documents Selected</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Go back to Step 2 to select documents.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary Bar */}
      <div className="px-5 py-3 border-b bg-emerald-50/50 dark:bg-emerald-950/10 space-y-2">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {totalDocs} document{totalDocs !== 1 ? 's' : ''} selected
            </p>
            <p className="text-[10px] text-muted-foreground">
              {projectWideDocs.length} project-wide · {disciplineDocs.length} by discipline · {packageDocs.length} by package
            </p>
          </div>
          <div className="flex gap-1.5">
            {tier1Count > 0 && (
              <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-900/20">
                {tier1Count} T1
              </Badge>
            )}
            {tier2Count > 0 && (
              <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-900/20">
                {tier2Count} T2
              </Badge>
            )}
          </div>
        </div>
        {/* Context line */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          {vcrInfo?.code && <span>VCR: <strong className="text-foreground">{vcrInfo.code}</strong></span>}
          {projectCode && <span>Project: <strong className="text-foreground">{projectCode}</strong></span>}
          {plantCode && <span>Plant: <strong className="text-foreground">{plantCode}</strong></span>}
          {dmsPlatforms && dmsPlatforms.length > 0 && (
            <span>DMS: <strong className="text-foreground">{dmsPlatforms.join(', ')}</strong></span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 py-4 space-y-5">
          {/* Section 1: Project-Wide */}
          {projectWideDocs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Project-Wide Documents</h4>
                <Badge variant="secondary" className="text-[9px] px-1.5 h-4">{projectWideDocs.length}</Badge>
              </div>
              <div className="space-y-0.5">
                {projectWideDocs.map(doc => (
                  <ReviewDocRow key={doc.id} doc={doc} onRemove={() => removeDoc(doc.id)} showBadges />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: By Discipline */}
          {disciplineGroups.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Documents by Discipline</h4>
                <Badge variant="secondary" className="text-[9px] px-1.5 h-4">{disciplineDocs.length}</Badge>
              </div>
              <div className="space-y-3">
                {disciplineGroups.map(([code, docs]) => (
                  <div key={code}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-medium text-foreground">
                        {DISCIPLINE_NAMES[code] || code}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">({code})</span>
                      <Badge variant="outline" className="text-[9px] px-1 h-3.5">{docs.length}</Badge>
                    </div>
                    <div className="space-y-0.5 ml-2">
                      {docs.map(doc => (
                        <ReviewDocRow key={doc.id} doc={doc} onRemove={() => removeDoc(doc.id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: By Package */}
          {packageGroups.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Documents by Package</h4>
                <Badge variant="secondary" className="text-[9px] px-1.5 h-4">{packageDocs.length}</Badge>
              </div>
              <div className="space-y-3">
                {packageGroups.map(([tag, docs]) => {
                  const pkg = packages.find((p: any) => p.package_tag === tag);
                  return (
                    <div key={tag}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-medium text-foreground">
                          {pkg?.package_name || tag}
                        </span>
                        {pkg?.po_number && (
                          <span className="text-[10px] text-muted-foreground font-mono">PO: {pkg.po_number}</span>
                        )}
                        <Badge variant="outline" className="text-[9px] px-1 h-3.5">{docs.length}</Badge>
                      </div>
                      <div className="space-y-0.5 ml-2">
                        {docs.map(doc => (
                          <ReviewDocRow key={doc.id} doc={doc} onRemove={() => removeDoc(doc.id)} showVendor />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// ─── Review Doc Row ──────────────────────────────────────────────────────────

const ReviewDocRow: React.FC<{
  doc: DocTypeRow;
  onRemove: () => void;
  showBadges?: boolean;
  showVendor?: boolean;
}> = ({ doc, onRemove, showBadges, showVendor }) => {
  const isMdr = doc.is_mdr;
  const isScope = isScopeDoc(doc);
  const isVendor = doc.is_vendor_document;

  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-[6px] rounded-md bg-muted/30 group hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-[52px]">{doc.code}</span>
        <span className="text-xs truncate">{doc.document_name}</span>
        {doc.tier && (
          <span className={cn(
            'inline-flex items-center justify-center w-[26px] h-[16px] rounded-[3px] text-[10px] font-medium shrink-0',
            doc.tier === 'Tier 1'
              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          )}>
            {doc.tier === 'Tier 1' ? 'T1' : 'T2'}
          </span>
        )}
        {showBadges && isMdr && (
          <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/20 shrink-0">
            MDR
          </Badge>
        )}
        {showBadges && isScope && (
          <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-900/20 shrink-0">
            Scope
          </Badge>
        )}
        {showVendor && isVendor && (
          <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-border text-muted-foreground shrink-0">
            Vendor
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 shrink-0"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};
