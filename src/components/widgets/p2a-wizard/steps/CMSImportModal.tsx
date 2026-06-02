import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { WizardSystem, WizardSubsystem } from './SystemsImportStep';

interface Candidate {
  id: string;
  system_id: string;
  name: string;
  description: string;
  is_hydrocarbon: boolean;
  progress?: number;
  subsystems?: WizardSubsystem[];
  source_project?: string;
  tier: 'strong' | 'weak';
}

interface SampleEntry {
  source_project: string;
  system_id: string;
  name: string;
}

interface CMSImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (systems: WizardSystem[]) => void;
  projectCode?: string;
}

type Phase = 'idle' | 'loading' | 'review' | 'error';

export const CMSImportModal: React.FC<CMSImportModalProps> = ({
  open,
  onOpenChange,
  onImport,
  projectCode,
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sample, setSample] = useState<SampleEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sampleSelected, setSampleSelected] = useState<Set<string>>(new Set());
  const [sampleFilter, setSampleFilter] = useState('');
  const [searchedProjects, setSearchedProjects] = useState<string[]>([]);
  const [projectsWithResults, setProjectsWithResults] = useState<string[]>([]);
  const [failedTiles, setFailedTiles] = useState<string[]>([]);

  useEffect(() => {
    if (open && phase === 'idle') void runImport();
    if (!open) {
      setPhase('idle');
      setErrorMessage('');
      setCandidates([]);
      setSample([]);
      setSelected(new Set());
      setSampleSelected(new Set());
      setSampleFilter('');
      setSearchedProjects([]);
      setProjectsWithResults([]);
      setFailedTiles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runImport = async () => {
    setPhase('loading');
    setErrorMessage('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('You must be logged in to import from GoHub');

      const response = await supabase.functions.invoke('gohub-import', {
        body: { projectFilter: (projectCode || '').trim() },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.error) {
        const msg = response.data?.error || response.error.message || 'Import failed';
        throw new Error(msg);
      }
      const data = response.data;
      if (!data?.success) {
        if (data?.setup_required) {
          setErrorMessage(data.message || 'Credentials required. Please reconfigure in Administration > APIs.');
          setPhase('error');
          return;
        }
        throw new Error(data?.error || 'Import failed');
      }

      const incoming: Candidate[] = Array.isArray(data.candidates) ? data.candidates : [];
      const incomingSample: SampleEntry[] = Array.isArray(data.sample) ? data.sample : [];
      setCandidates(incoming);
      setSample(incomingSample);
      setSearchedProjects(Array.isArray(data.searched_projects) ? data.searched_projects : []);
      setProjectsWithResults(Array.isArray(data.projects_with_results) ? data.projects_with_results : []);
      setFailedTiles(Array.isArray(data.failed_tiles) ? data.failed_tiles : []);
      // Pre-select STRONG matches only
      setSelected(new Set(incoming.filter(c => c.tier === 'strong').map(c => c.system_id)));
      setSampleSelected(new Set());
      setPhase('review');
    } catch (error: unknown) {
      console.error('GoHub import error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Import failed');
      setPhase('error');
    }
  };

  const strong = useMemo(() => candidates.filter(c => c.tier === 'strong'), [candidates]);
  const weak = useMemo(() => candidates.filter(c => c.tier === 'weak'), [candidates]);

  const toggle = (id: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const filteredSample = useMemo(() => {
    const q = sampleFilter.trim().toLowerCase();
    const list = q
      ? sample.filter(s =>
          s.system_id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.source_project.toLowerCase().includes(q),
        )
      : sample;
    return list.slice(0, 200);
  }, [sample, sampleFilter]);

  const totalSelected = selected.size + sampleSelected.size;

  const handleConfirmImport = () => {
    const fromCandidates = candidates.filter(c => selected.has(c.system_id)).map(c => ({
      id: c.id,
      system_id: c.system_id,
      name: c.name,
      description: c.description,
      is_hydrocarbon: c.is_hydrocarbon,
      progress: typeof c.progress === 'number' ? c.progress : undefined,
      subsystems: Array.isArray(c.subsystems) ? c.subsystems : [],
    }));
    const fromSample: WizardSystem[] = sample
      .filter(s => sampleSelected.has(s.system_id))
      // Don't double-add if user picked it as both candidate and sample
      .filter(s => !selected.has(s.system_id))
      .map((s, idx) => ({
        id: `gohub-sample-${Date.now()}-${idx}`,
        system_id: s.system_id,
        name: s.name,
        description: `Imported from GoCompletions (${s.source_project})`,
        is_hydrocarbon: false,
        subsystems: [],
      }));

    onImport([...fromCandidates, ...fromSample]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl z-[200] flex flex-col max-h-[85vh]"
        overlayClassName="z-[199] bg-black/70 backdrop-blur-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Database className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Import from GoCompletions</DialogTitle>
              <DialogDescription>
                {projectCode ? `Searching GoHub for systems related to ${projectCode}` : 'Searching GoHub for systems'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-3 py-2">
          {phase === 'loading' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Searching GoHub projects…</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-500/70">
                  Scanning systems matching {projectCode || 'project code'}
                </p>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Import Failed</p>
                <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-1 whitespace-pre-wrap">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {phase === 'review' && (
            <div className="flex-1 min-h-0 -mx-1 px-1 overflow-y-auto overscroll-contain">
              <div className="space-y-4 pr-2">
                {/* Findings summary — concise */}
                <section
                  className={cn(
                    'rounded-lg border p-3 text-xs',
                    strong.length > 0
                      ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40'
                      : 'bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40'
                  )}
                >
                  <p className="font-semibold text-sm">
                    {strong.length > 0
                      ? `Found ${strong.length} match${strong.length === 1 ? '' : 'es'} for ${projectCode}`
                      : `No matches for "${projectCode}"`}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Searched {searchedProjects.length || 0} GoHub project{searchedProjects.length === 1 ? '' : 's'}
                    {weak.length > 0 && <> · {weak.length} possible match{weak.length === 1 ? '' : 'es'} below</>}
                    {failedTiles.length > 0 && (
                      <> · <span className="text-amber-700 dark:text-amber-400">{failedTiles.length} tile{failedTiles.length === 1 ? '' : 's'} failed to load</span></>
                    )}
                  </p>
                  {strong.length === 0 && (
                    <p className="mt-2 text-foreground">
                      {failedTiles.length > 0
                        ? 'Some tiles failed — retry, or pick manually below.'
                        : 'Try a different spelling, confirm a possible match below, or pick from available systems.'}
                    </p>
                  )}
                </section>

                {/* Strong matches */}
                {strong.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-sm font-semibold">Confirmed matches</h4>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        Pre-selected
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      These system IDs contain your full project code. Uncheck any you don't want.
                    </p>
                    <div className="space-y-1.5">
                      {strong.map(c => (
                        <CandidateRow
                          key={c.system_id}
                          candidate={c}
                          checked={selected.has(c.system_id)}
                          onToggle={() => toggle(c.system_id, selected, setSelected)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Weak / ambiguous */}
                {weak.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="h-4 w-4 text-amber-600" />
                      <h4 className="text-sm font-semibold">Possible matches — needs confirmation</h4>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        Not selected
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      These only partially match your project code (digits or a short tail). Tick the ones that
                      actually belong to your scope.
                    </p>
                    <div className="space-y-1.5">
                      {weak.map(c => (
                        <CandidateRow
                          key={c.system_id}
                          candidate={c}
                          checked={selected.has(c.system_id)}
                          onToggle={() => toggle(c.system_id, selected, setSelected)}
                        />
                      ))}
                    </div>
                  </section>
                )}


                {/* Sample selector — always available when we have data */}
                {sample.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">
                        {strong.length + weak.length > 0 ? 'Or pick from all available systems' : 'Available systems in GoHub'}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {filteredSample.length} of {sample.length}
                      </span>
                    </div>
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search by ID, name or project…"
                        value={sampleFilter}
                        onChange={(e) => setSampleFilter(e.target.value)}
                        className="h-8 pl-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border bg-muted/20 p-1">
                      {filteredSample.map(s => {
                        const checked = sampleSelected.has(s.system_id);
                        const alreadyCandidate = selected.has(s.system_id);
                        return (
                          <label
                            key={`${s.source_project}-${s.system_id}`}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted/60 text-xs',
                              alreadyCandidate && 'opacity-50',
                            )}
                          >
                            <Checkbox
                              checked={checked || alreadyCandidate}
                              disabled={alreadyCandidate}
                              onCheckedChange={() => toggle(s.system_id, sampleSelected, setSampleSelected)}
                            />
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border shrink-0">
                              {s.system_id}
                            </span>
                            <span className="truncate flex-1">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{s.source_project}</span>
                          </label>
                        );
                      })}
                      {filteredSample.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No systems match your search.</p>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </ScrollArea>
          )}

          {/* footer info bar */}
          <div className="flex items-center justify-between pt-2 border-t shrink-0">
            <span className="text-[10px] text-muted-foreground">Powered by GoTechnology® Hub</span>
            <a
              href="https://goc.gotechnology.online/BGC/GoHub/Home.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ExternalLink className="h-2.5 w-2.5" /> Open GoHub
            </a>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {phase === 'error' && (
            <Button
              onClick={runImport}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              Retry
            </Button>
          )}
          {phase === 'review' && (
            <Button
              onClick={handleConfirmImport}
              disabled={totalSelected === 0}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50"
            >
              Import {totalSelected > 0 ? totalSelected : ''} {totalSelected === 1 ? 'system' : 'systems'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CandidateRow: React.FC<{
  candidate: Candidate;
  checked: boolean;
  onToggle: () => void;
}> = ({ candidate, checked, onToggle }) => {
  return (
    <label
      className={cn(
        'flex items-center gap-2.5 p-2 rounded-md border cursor-pointer transition-colors',
        checked ? 'bg-primary/5 border-primary/30' : 'bg-card hover:bg-muted/50 border-border',
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted border shrink-0">
        {candidate.system_id}
      </span>
      <span className="text-xs font-medium truncate flex-1">{candidate.name}</span>
      {candidate.source_project && (
        <span className="text-[10px] text-muted-foreground shrink-0">{candidate.source_project}</span>
      )}
      {candidate.subsystems && candidate.subsystems.length > 0 && (
        <span className="text-[10px] text-muted-foreground shrink-0">
          {candidate.subsystems.length} sub
        </span>
      )}
    </label>
  );
};
