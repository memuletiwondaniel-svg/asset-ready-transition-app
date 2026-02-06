import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Database, Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WizardSystem } from './SystemsImportStep';

interface CMSImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (systems: WizardSystem[]) => void;
}

export interface CMSImportConfig {
  environment: string;
  projectId: string;
  apiEndpoint: string;
  apiKey: string;
}

type ImportStatus = 'idle' | 'connecting' | 'success' | 'error';

export const CMSImportModal: React.FC<CMSImportModalProps> = ({
  open,
  onOpenChange,
  onImport,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [resource, setResource] = useState('SubSystem');
  const [importedCount, setImportedCount] = useState(0);

  const handleImport = async () => {
    setIsLoading(true);
    setStatus('connecting');
    setErrorMessage('');
    setSetupRequired(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('You must be logged in to import from GoHub');
      }

      const response = await supabase.functions.invoke('gohub-import', {
        body: { resource },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Import failed');
      }

      const data = response.data;

      if (!data.success) {
        if (data.setup_required) {
          setSetupRequired(true);
          setErrorMessage(data.message || 'API credentials not configured');
          setStatus('error');
          return;
        }
        throw new Error(data.error || 'Import failed');
      }

      const systems: WizardSystem[] = (data.systems || []).map((s: WizardSystem & { source?: string; raw_data?: unknown }) => ({
        id: s.id,
        system_id: s.system_id,
        name: s.name,
        description: s.description,
        is_hydrocarbon: s.is_hydrocarbon,
      }));

      setImportedCount(systems.length);
      setStatus('success');

      // Auto-close after brief success display
      setTimeout(() => {
        onImport(systems);
        resetAndClose();
      }, 1500);
    } catch (error: unknown) {
      console.error('GoHub import error:', error);
      const message = error instanceof Error ? error.message : 'Import failed';
      setErrorMessage(message);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setStatus('idle');
    setErrorMessage('');
    setSetupRequired(false);
    setImportedCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Database className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                Import from GoHub
              </DialogTitle>
              <DialogDescription>
                Connect to GoTechnology® Completions System
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connection Info */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">BGC Instance</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              goc.gotechnology.online/BGC
            </p>
          </div>

          {/* Resource Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Resource to Import</Label>
            <Select value={resource} onValueChange={setResource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SubSystem">Sub Systems</SelectItem>
                <SelectItem value="System">Systems</SelectItem>
                <SelectItem value="Discipline">Disciplines</SelectItem>
                <SelectItem value="Area">Areas</SelectItem>
                <SelectItem value="CertificationGrouping">Certification Groupings</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the type of data to import from GoHub
            </p>
          </div>

          {/* Status Messages */}
          {status === 'connecting' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Connecting to GoHub...
                </p>
                <p className="text-xs text-blue-600/70 dark:text-blue-500/70">
                  Authenticating via OAuth2 and fetching {resource} data
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Successfully imported {importedCount} records
                </p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                  Adding to your systems list...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {setupRequired ? 'API Setup Required' : 'Import Failed'}
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>

              {setupRequired && (
                <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    To complete GoHub API setup:
                  </p>
                  <ol className="text-xs text-amber-700/80 dark:text-amber-400/80 space-y-1 list-decimal list-inside">
                    <li>
                      Email{' '}
                      <a
                        href="mailto:GoTechnology.Support@woodplc.com?subject=API%20Registration%20-%20BGC%20GoHub"
                        className="underline font-medium"
                      >
                        GoTechnology.Support@woodplc.com
                      </a>{' '}
                      to register your app
                    </li>
                    <li>Request a Machine App Client ID & Secret</li>
                    <li>Find your Level ID at Admin → Level E in GoHub</li>
                    <li>Add the credentials as secrets in project settings</li>
                  </ol>
                  <a
                    href="https://goc.gotechnology.online/BGC/GoHub/Home.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open GoHub
                  </a>
                </div>
              )}
            </div>
          )}

          {/* GoHub branding footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                Powered by GoTechnology® Hub2 REST API
              </span>
            </div>
            <a
              href="https://goc.gotechnology.online/BGC/GoHub/Home.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              GoHub
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || status === 'success'}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {status === 'success' ? 'Imported!' : 'Import from GoHub'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
