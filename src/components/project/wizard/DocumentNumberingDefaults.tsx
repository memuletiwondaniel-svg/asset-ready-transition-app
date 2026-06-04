import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Per-project DMS catalog defaults used by the document-numbering function
 * (assign_procedure_document_number and future doc-producing wizards).
 *
 * Segments live as text codes on `projects.default_{plant|site|unit}_code`.
 * NULL is rendered as the literal `TBD` placeholder by the assignment
 * function, so admins can leave any field blank until they have the answer.
 */
export interface NumberingDefaults {
  default_plant_code: string | null;
  default_site_code: string | null;
  default_unit_code: string | null;
}

interface Props {
  /** Current operational project key, used to mine existing documents for suggestions. */
  projectKey?: string; // e.g. "DP-300"
  value: NumberingDefaults;
  onChange: (next: NumberingDefaults) => void;
}

const useCatalog = (table: 'dms_plants' | 'dms_sites' | 'dms_units', nameCol: string) =>
  useQuery({
    queryKey: ['dms-catalog', table],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select(`code, ${nameCol}, is_active`)
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        value: r.code,
        label: `${r.code} — ${r[nameCol] ?? ''}`.trim(),
      }));
    },
  });

export const DocumentNumberingDefaults: React.FC<Props> = ({ projectKey, value, onChange }) => {
  const plants = useCatalog('dms_plants', 'plant_name');
  const sites = useCatalog('dms_sites', 'site_name');
  const units = useCatalog('dms_units', 'unit_name');

  const [suggesting, setSuggesting] = useState(false);

  // Mine the most-common Plant/Site/Unit segments from existing synced documents
  // for this project. Document numbers follow the 9-segment dash format:
  //   {Project}-{Originator}-{Plant}-{Site}-{Unit}-{Discipline}-{DocumentType}-{DocumentNo}-{Sequence}
  const suggestFromDocuments = async () => {
    if (!projectKey) return;
    setSuggesting(true);
    try {
      const { data, error } = await (supabase as any)
        .from('dms_external_sync')
        .select('document_number')
        .eq('project_id', projectKey)
        .not('document_number', 'is', null)
        .limit(500);
      if (error) throw error;

      const rows = data || [];
      if (rows.length === 0) {
        toast.info('No synced documents for this project yet — set the segments manually.');
        return;
      }

      const mode = (idx: number): string | null => {
        const counts: Record<string, number> = {};
        for (const r of rows) {
          const parts = String(r.document_number).split('-');
          const seg = parts[idx];
          if (!seg || seg === 'TBD') continue;
          counts[seg] = (counts[seg] || 0) + 1;
        }
        const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return best ? best[0] : null;
      };

      const next: NumberingDefaults = {
        default_plant_code: value.default_plant_code || mode(2),
        default_site_code: value.default_site_code || mode(3),
        default_unit_code: value.default_unit_code || mode(4),
      };
      onChange(next);
      toast.success('Suggested defaults from existing documents');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to inspect existing documents');
    } finally {
      setSuggesting(false);
    }
  };

  const loading = plants.isLoading || sites.isLoading || units.isLoading;

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Document Numbering Defaults</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            DMS catalog codes used when this project auto-assigns document numbers
            (procedures, critical docs, etc.). Leave blank to use the <code className="font-mono">TBD</code> placeholder.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={suggestFromDocuments}
          disabled={!projectKey || suggesting}
          className="gap-1.5 shrink-0"
          title="Inspect existing synced documents for this project and pre-fill the most-used codes"
        >
          {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Suggest from documents
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Plant</Label>
          <EnhancedCombobox
            options={plants.data || []}
            value={value.default_plant_code || ''}
            onValueChange={(v) => onChange({ ...value, default_plant_code: v || null })}
            placeholder={loading ? 'Loading…' : 'Select plant…'}
            emptyText="No plant found"
            allowCreate={false}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Site</Label>
          <EnhancedCombobox
            options={sites.data || []}
            value={value.default_site_code || ''}
            onValueChange={(v) => onChange({ ...value, default_site_code: v || null })}
            placeholder={loading ? 'Loading…' : 'Select site…'}
            emptyText="No site found"
            allowCreate={false}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Unit</Label>
          <EnhancedCombobox
            options={units.data || []}
            value={value.default_unit_code || ''}
            onValueChange={(v) => onChange({ ...value, default_unit_code: v || null })}
            placeholder={loading ? 'Loading…' : 'Select unit…'}
            emptyText="No unit found"
            allowCreate={false}
          />
        </div>
      </div>
    </div>
  );
};
