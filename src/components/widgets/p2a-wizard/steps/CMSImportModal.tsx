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
import { Database, Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WizardSystem, WizardSubsystem } from './SystemsImportStep';
import { getAPIConfig } from '@/lib/api-config-storage';

interface CMSImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (systems: WizardSystem[]) => void;
  projectCode?: string;
}

type ImportStatus = 'idle' | 'connecting' | 'success' | 'error';

const DEFAULT_PORTAL_URL = 'https://goc.gotechnology.online/BGC/GoHub/Home.aspx';

export const CMSImportModal: React.FC<CMSImportModalProps> = ({
  open,
  onOpenChange,
  onImport,
  projectCode,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  // Auto-import on open using stored credentials
  React.useEffect(() => {
    if (open && status === 'idle') {
      handleImport();
    }
  }, [open]);

  const handleImport = async () => {
    const config = getAPIConfig('gocompletions');

    if (!config || config.status !== 'configured' || !config.rpaCredentials) {
      setErrorMessage('GoCompletions is not configured. Please configure it in Administration > APIs first.');
      setStatus('error');
      return;
    }

    const { portalUrl, username, password } = config.rpaCredentials;

    if (!username || !password) {
      setErrorMessage('GoCompletions credentials are incomplete. Please reconfigure in Administration > APIs.');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setStatus('connecting');
    setErrorMessage('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('You must be logged in to import from GoHub');
      }

      const cleanProjectCode = projectCode?.replace(/-/g, '') || '';

      const response = await supabase.functions.invoke('gohub-import', {
        body: {
          portalUrl: portalUrl || DEFAULT_PORTAL_URL,
          username,
          password,
          projectFilter: cleanProjectCode,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.error) {
        const msg = response.data?.error || response.error.message || 'Import failed';
        throw new Error(msg);
      }

      const data = response.data;

      if (!data?.success) {
        if (data?.setup_required) {
          setErrorMessage(data.message || 'Credentials required. Please reconfigure in Administration > APIs.');
          setStatus('error');
          return;
        }
        throw new Error(data?.error || 'Import failed');
      }

      const systems: WizardSystem[] = (data.systems || []).map(
        (s: WizardSystem & { source?: string; subsystems?: WizardSubsystem[] }) => ({
          id: s.id,
          system_id: s.system_id,
          name: s.name,
          description: s.description,
          is_hydrocarbon: s.is_hydrocarbon,
          progress: typeof s.progress === 'number' ? s.progress : undefined,
          subsystems: Array.isArray(s.subsystems) ? s.subsystems : [],
        })
      );

      setImportedCount(systems.length);
      setStatus('success');

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
    setImportedCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent
        className="sm:max-w-lg z-[200]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
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
                Importing Completions Grid data from GoTechnology® Hub
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Messages */}
          {status === 'connecting' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Searching GoHub projects...
                </p>
                <p className="text-xs text-blue-600/70 dark:text-blue-500/70">
                  Scanning all projects for systems matching {projectCode || 'project code'}
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Successfully imported {importedCount} systems
                </p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                  Adding to your systems list...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Import Failed
                </p>
                <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-1 whitespace-pre-wrap">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* GoHub branding footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-[10px] text-muted-foreground">
              Powered by GoTechnology® Hub
            </span>
            <a
              href="https://goc.gotechnology.online/BGC/GoHub/Home.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Open GoHub
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            {status === 'error' ? 'Close' : 'Cancel'}
          </Button>
          {status === 'error' && (
            <Button
              onClick={handleImport}
              disabled={isLoading}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Retry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
