import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Database, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Lock, User, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WizardSystem } from './SystemsImportStep';

interface CMSImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (systems: WizardSystem[]) => void;
}

type ImportStatus = 'idle' | 'connecting' | 'success' | 'error';

const STORAGE_KEY = 'gohub-credentials';
const DEFAULT_PORTAL_URL = 'https://goc.gotechnology.online/BGC/GoHub/Home.aspx';

function loadSavedCredentials() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as { portalUrl: string; username: string; password: string };
  } catch (_) { /* ignore */ }
  return null;
}

function saveCredentials(portalUrl: string, username: string, password: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ portalUrl, username, password }));
  } catch (_) { /* ignore */ }
}

export const CMSImportModal: React.FC<CMSImportModalProps> = ({
  open,
  onOpenChange,
  onImport,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [rememberCreds, setRememberCreds] = useState(true);

  // Credential fields - initialised from localStorage
  const [portalUrl, setPortalUrl] = useState(DEFAULT_PORTAL_URL);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Load saved credentials on mount / when dialog opens
  useEffect(() => {
    if (open) {
      const saved = loadSavedCredentials();
      if (saved) {
        setPortalUrl(saved.portalUrl || DEFAULT_PORTAL_URL);
        setUsername(saved.username || '');
        setPassword(saved.password || '');
      }
    }
  }, [open]);

  const handleImport = async () => {
    if (!username || !password) {
      setErrorMessage('Please enter your GoHub username and password');
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

      const response = await supabase.functions.invoke('gohub-import', {
        body: {
          portalUrl: portalUrl || DEFAULT_PORTAL_URL,
          username,
          password,
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
          setErrorMessage(data.message || 'Credentials required');
          setStatus('error');
          return;
        }
        throw new Error(data?.error || 'Import failed');
      }

      // Persist credentials on success
      if (rememberCreds) {
        saveCredentials(portalUrl, username, password);
      }

      const systems: WizardSystem[] = (data.systems || []).map(
        (s: WizardSystem & { source?: string }) => ({
          id: s.id,
          system_id: s.system_id,
          name: s.name,
          description: s.description,
          is_hydrocarbon: s.is_hydrocarbon,
          progress: typeof s.progress === 'number' ? s.progress : undefined,
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
        className="sm:max-w-lg"
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
                Login to GoTechnology® Hub and import Completions Grid data
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Portal URL */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              Portal URL
            </Label>
            <Input
              type="url"
              value={portalUrl}
              onChange={(e) => setPortalUrl(e.target.value)}
              placeholder={DEFAULT_PORTAL_URL}
              className="font-mono text-xs"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Username
            </Label>
            <Input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@company.com"
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              Password
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
            />
          </div>

          {/* Remember credentials */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-creds"
              checked={rememberCreds}
              onCheckedChange={(checked) => setRememberCreds(checked as boolean)}
            />
            <Label htmlFor="remember-creds" className="text-xs text-muted-foreground cursor-pointer">
              Remember credentials for next time
            </Label>
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
                  Logging in and fetching Completions Grid
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
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || status === 'success' || !username || !password}
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
