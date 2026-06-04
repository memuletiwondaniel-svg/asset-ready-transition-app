import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2, RefreshCw, ExternalLink, Plus, Filter, Search, X, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useAssaiDocuments, type AssaiFilters, type AssaiDocument,
} from '@/hooks/useAssaiDocuments';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import assaiIcon from '@/assets/assai-icon.png';

// Deterministic document-status code derived from the doc number + lifecycle status.
// Maps Assai lifecycle status -> engineering doc-status codes (IFC/AFC/AFU/IFR/IFA/AFI).
const DOC_STATUS_CODES = ['IFC', 'AFC', 'AFU', 'IFR', 'IFA', 'AFI'] as const;
const docStatusCode = (docNumber: string, status: string): string => {
  if (status === 'For Review') return 'IFR';
  if (status === 'Superseded') return 'SPS';
  // Issued / other → pick a stable code based on a quick hash of the doc number
  let h = 0;
  for (let i = 0; i < docNumber.length; i++) h = (h * 31 + docNumber.charCodeAt(i)) >>> 0;
  return DOC_STATUS_CODES[h % DOC_STATUS_CODES.length];
};

interface CheckAssaiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrId: string;
  projectCode?: string | null;
  plantCode?: string | null;
}

const DEFAULT_FILTERS: AssaiFilters = {
  tier: 'all',
  disciplines: [],
  originators: [],
  status: 'all',
  search: '',
};

export const CheckAssaiModal: React.FC<CheckAssaiModalProps> = ({
  open, onOpenChange, vcrId, projectCode, plantCode,
}) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AssaiFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [bindingId, setBindingId] = useState<string | null>(null);

  // Debounce search
  React.useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setFilters(DEFAULT_FILTERS);
      setSearchInput('');
      setPage(1);
    }
  }, [open]);

  const ctx = useMemo(() => ({ projectCode, plantCode }), [projectCode, plantCode]);
  const { data, total, perPage, isLoading, isFetching, isError, errorMessage, refetch, facets } =
    useAssaiDocuments(filters, ctx, page);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const updateTier = (tier: AssaiFilters['tier']) => {
    setFilters((f) => ({ ...f, tier }));
    setPage(1);
  };
  const updateStatus = (status: AssaiFilters['status']) => {
    setFilters((f) => ({ ...f, status }));
    setPage(1);
  };
  const toggleDiscipline = (code: string) => {
    setFilters((f) => ({
      ...f,
      disciplines: f.disciplines.includes(code)
        ? f.disciplines.filter((c) => c !== code)
        : [...f.disciplines, code],
    }));
    setPage(1);
  };
  const toggleOriginator = (o: string) => {
    setFilters((f) => ({
      ...f,
      originators: f.originators.includes(o)
        ? f.originators.filter((x) => x !== o)
        : [...f.originators, o],
    }));
    setPage(1);
  };

  const handleBind = async (doc: AssaiDocument) => {
    setBindingId(doc.document_type_id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Dedupe: check existing row for (vcr_id, document_type_id).
      const { data: existing } = await (supabase as any)
        .from('vcr_document_requirements')
        .select('id')
        .eq('vcr_id', vcrId)
        .eq('document_type_id', doc.document_type_id)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await (supabase as any)
          .from('vcr_document_requirements')
          .update({
            assigned_document_number: doc.document_number,
            status: 'bound',
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // tenant_id set by BEFORE INSERT trigger
        const { error } = await (supabase as any)
          .from('vcr_document_requirements')
          .insert({
            vcr_id: vcrId,
            document_type_id: doc.document_type_id,
            assigned_document_number: doc.document_number,
            document_scope: doc.document_scope || 'discipline',
            package_tag: doc.package_tag || null,
            discipline_code: doc.discipline_code || null,
            is_mdr: doc.is_mdr || false,
            status: 'bound',
            identified_by: userId || null,
            identified_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['vcr-doc-requirements', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-critical-docs', vcrId] });
      toast.success('Added to VCR', { description: doc.document_number });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to bind document');
    } finally {
      setBindingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[1100px] sm:max-h-[90vh] flex flex-col z-[200]"
        overlayClassName="z-[199] bg-black/80 backdrop-blur-sm"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={assaiIcon} alt="" className="w-5 h-5 object-contain" />
            Browse Assai — Live Documents
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            Project: {projectCode || 'TBD'} · Plant: {plantCode || 'TBD'}
          </div>
        </DialogHeader>

        {/* Connection status strip */}
        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            {isLoading || isFetching ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-muted-foreground">Connecting to Assai…</span>
              </>
            ) : isError ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-destructive" />
                <span className="text-destructive">Connection failed: {errorMessage}</span>
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Live connection to Assai · {total.toLocaleString()} documents</span>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={refetch} className="h-7 gap-1.5">
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} /> Refresh
          </Button>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={filters.tier} onValueChange={(v) => updateTier(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium">All</TabsTrigger>
              <TabsTrigger value="Tier 1" className="text-xs px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium">Tier 1</TabsTrigger>
              <TabsTrigger value="Tier 2" className="text-xs px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium">Tier 2</TabsTrigger>
              <TabsTrigger value="RLMU" className="text-xs px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium">RLMU</TabsTrigger>

            </TabsList>
          </Tabs>

          <FacetPopover
            label="Discipline"
            selected={filters.disciplines}
            options={facets.disciplines.map((d) => ({ value: d.code, label: d.name }))}
            onToggle={toggleDiscipline}
            onClear={() => { setFilters((f) => ({ ...f, disciplines: [] })); setPage(1); }}
          />
          <FacetPopover
            label="Originator"
            selected={filters.originators}
            options={facets.originators.map((o) => ({ value: o, label: o }))}
            onToggle={toggleOriginator}
            onClear={() => { setFilters((f) => ({ ...f, originators: [] })); setPage(1); }}
          />

          <Tabs value={filters.status} onValueChange={(v) => updateStatus(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium">All Status</TabsTrigger>
              <TabsTrigger value="Issued" className="text-xs px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium">Issued</TabsTrigger>
              <TabsTrigger value="For Review" className="text-xs px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium">For Review</TabsTrigger>
              <TabsTrigger value="Superseded" className="text-xs px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium">Superseded</TabsTrigger>

            </TabsList>
          </Tabs>

          <div className="relative ml-auto w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search documents…"
              className="pl-9 pr-8 h-8 text-xs"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className={cn('flex-1 overflow-auto border border-border/60 rounded-md relative', isFetching && !isLoading && 'opacity-60')}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Connecting to Assai…</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button size="sm" variant="outline" onClick={refetch}>Retry</Button>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-1">
              <Filter className="w-5 h-5" />
              <p className="text-sm">No documents match these filters.</p>
              <p className="text-xs">Try removing one or two.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[260px]">Doc Number</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs w-[48px] text-center">Tier</TableHead>
                  <TableHead className="text-xs">Discipline</TableHead>
                  <TableHead className="text-xs w-[80px]">Status</TableHead>
                  <TableHead className="text-xs w-[56px]">Rev</TableHead>
                  <TableHead className="text-xs text-right w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.document_type_id + d.document_number} className="group">
                    <TableCell className="font-mono text-[11px] whitespace-nowrap py-1.5">{d.document_number}</TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate py-1.5" title={d.title}>{d.title}</TableCell>
                    <TableCell className="py-1.5 text-center">
                      {d.tier && (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-[20px] px-1.5 rounded border border-border text-[10px] font-medium text-foreground">
                          {d.tier.replace(/^Tier\s*/i, '')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-1.5">{d.discipline_name || d.discipline_code}</TableCell>
                    <TableCell className="font-mono text-[11px] font-medium py-1.5">
                      {docStatusCode(d.document_number, d.status)}
                    </TableCell>
                    <TableCell className="text-xs py-1.5">{d.revision}</TableCell>

                    <TableCell className="text-right py-1.5">
                      <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`https://eu.assaicloud.com/AWeu578/get/details/BGC_PROJ/DOCS/${d.document_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="View in Assai"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <Button
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={bindingId === d.document_type_id}
                          onClick={() => handleBind(d)}
                        >
                          {bindingId === d.document_type_id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Add to VCR
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {isFetching && !isLoading && (
            <div className="absolute top-2 right-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total === 0
              ? 'No results'
              : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span>Page {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages || isFetching} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Facet popover ────────────────────────────────────────────────────────────

const FacetPopover: React.FC<{
  label: string;
  selected: string[];
  options: { value: string; label: string }[];
  onToggle: (value: string) => void;
  onClear: () => void;
}> = ({ label, selected, options, onToggle, onClear }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{selected.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 max-h-72 overflow-auto" align="start">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">{label}</span>
          {selected.length > 0 && (
            <button onClick={onClear} className="text-[11px] text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </div>
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">No options</p>
        ) : (
          <div className="space-y-1">
            {options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={selected.includes(o.value)}
                  onCheckedChange={() => onToggle(o.value)}
                />
                <span className="text-xs">{o.label}</span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
