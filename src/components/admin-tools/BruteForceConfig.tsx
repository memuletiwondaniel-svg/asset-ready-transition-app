import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShieldAlert, Save, RotateCcw, Info, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BruteForceConfigProps {
  onBack: () => void;
}

interface Config {
  enabled: boolean;
  max_attempts: number;
  lockout_minutes: number;
  progressive_lockout: boolean;
}

const DEFAULT_CONFIG: Config = {
  enabled: true,
  max_attempts: 5,
  lockout_minutes: 30,
  progressive_lockout: true,
};

const BruteForceConfig: React.FC<BruteForceConfigProps> = ({ onBack }) => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [original, setOriginal] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lockedAccounts, setLockedAccounts] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: settings }, { count }] = await Promise.all([
        supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'brute_force_protection')
          .single(),
        supabase
          .from('profiles')
          .select('user_id', { count: 'exact', head: true })
          .gt('locked_until', new Date().toISOString()),
      ]);
      if (settings?.value) {
        const c = settings.value as unknown as Config;
        setConfig(c);
        setOriginal(c);
      }
      setLockedAccounts(count || 0);
      setLoading(false);
    };
    fetchData();
  }, []);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .update({ value: config as any })
      .eq('key', 'brute_force_protection');

    setSaving(false);
    if (error) {
      toast.error('Failed to save brute-force protection settings');
    } else {
      setOriginal(config);
      toast.success('Brute-force protection settings saved.');
    }
  };

  const handleUnlockAll = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ locked_until: null, login_attempts: 0 } as any)
      .gt('locked_until', new Date().toISOString());

    if (error) {
      toast.error('Failed to unlock accounts');
    } else {
      setLockedAccounts(0);
      toast.success('All locked accounts have been unlocked.');
    }
  };

  // Calculate progressive lockout example
  const getProgressiveExample = (attempt: number) => {
    if (attempt < config.max_attempts) return null;
    const extra = attempt - config.max_attempts;
    const minutes = config.lockout_minutes * Math.pow(2, Math.min(extra, 4));
    if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Brute-Force Protection" favoritePath="/admin-tools/brute-force" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                Brute-Force Protection
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prevent unauthorized access by limiting failed login attempts
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={() => setConfig(original)} className="gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving} className="gap-1.5 text-xs">
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6 max-w-3xl">
        {/* Locked accounts alert */}
        {lockedAccounts > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {lockedAccounts} account{lockedAccounts !== 1 ? 's' : ''} currently locked
                    </p>
                    <p className="text-xs text-muted-foreground">
                      These accounts were locked due to failed login attempts
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleUnlockAll} className="gap-1.5 text-xs">
                  <Unlock className="h-3.5 w-3.5" /> Unlock All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enable/Disable */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${config.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Brute-Force Protection</Label>
                  <p className="text-xs text-muted-foreground">
                    Lock accounts after repeated failed login attempts
                  </p>
                </div>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, enabled }))}
              />
            </div>
          </CardContent>
        </Card>

        {config.enabled && (
          <>
            {/* Max Attempts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Failed Attempts Threshold</CardTitle>
                <CardDescription className="text-xs">
                  Number of failed login attempts before locking the account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Maximum Attempts</Label>
                  <Badge variant="outline" className="text-xs font-mono tabular-nums">
                    {config.max_attempts} attempts
                  </Badge>
                </div>
                <Slider
                  value={[config.max_attempts]}
                  onValueChange={([v]) => setConfig(prev => ({ ...prev, max_attempts: v }))}
                  min={3}
                  max={15}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>3 (strict)</span>
                  <span>15 (lenient)</span>
                </div>
              </CardContent>
            </Card>

            {/* Lockout Duration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Lockout Duration</CardTitle>
                <CardDescription className="text-xs">
                  How long an account stays locked after reaching the threshold
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Lock Duration</Label>
                  <Badge variant="outline" className="text-xs font-mono tabular-nums">
                    {config.lockout_minutes >= 60
                      ? `${Math.floor(config.lockout_minutes / 60)}h ${config.lockout_minutes % 60}m`
                      : `${config.lockout_minutes} min`}
                  </Badge>
                </div>
                <Slider
                  value={[config.lockout_minutes]}
                  onValueChange={([v]) => setConfig(prev => ({ ...prev, lockout_minutes: v }))}
                  min={5}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>5 min</span>
                  <span>2 hours</span>
                </div>

                <Separator />

                {/* Progressive lockout */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <Label className="text-xs font-medium">Progressive Lockout</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Double lockout duration for each subsequent failed attempt
                      </p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs max-w-[240px]">
                          After the initial lockout, each additional failed attempt doubles the lock duration (up to 16× max). This discourages persistent attacks.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    checked={config.progressive_lockout}
                    onCheckedChange={(progressive_lockout) =>
                      setConfig(prev => ({ ...prev, progressive_lockout }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Visual example */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Lockout Escalation Preview</CardTitle>
                <CardDescription className="text-xs">
                  What happens at each failed attempt threshold
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: Math.min(config.max_attempts + 4, 12) }, (_, i) => i + 1).map(attempt => {
                    const isAtThreshold = attempt === config.max_attempts;
                    const isPastThreshold = attempt > config.max_attempts;
                    const lockDuration = isPastThreshold || isAtThreshold
                      ? getProgressiveExample(attempt)
                      : null;

                    return (
                      <div
                        key={attempt}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors ${
                          isAtThreshold
                            ? 'bg-destructive/10 border border-destructive/20'
                            : isPastThreshold
                            ? 'bg-destructive/5 border border-destructive/10'
                            : 'bg-muted/30'
                        }`}
                      >
                        <span className={`font-mono w-6 text-center ${
                          isPastThreshold || isAtThreshold ? 'text-destructive font-bold' : 'text-muted-foreground'
                        }`}>
                          {attempt}
                        </span>
                        <div className="flex-1">
                          {attempt < config.max_attempts ? (
                            <span className="text-muted-foreground">
                              Warning — {config.max_attempts - attempt} attempt{config.max_attempts - attempt !== 1 ? 's' : ''} remaining
                            </span>
                          ) : isAtThreshold ? (
                            <span className="text-destructive font-medium flex items-center gap-1.5">
                              <Lock className="h-3 w-3" />
                              Account locked for {lockDuration}
                            </span>
                          ) : (
                            <span className="text-destructive/80">
                              {config.progressive_lockout
                                ? `Extended lockout: ${lockDuration}`
                                : `Locked for ${lockDuration}`
                              }
                            </span>
                          )}
                        </div>
                        {isAtThreshold && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* How it works */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li>User enters wrong password — attempt counter increments</li>
                  <li>After <strong className="text-foreground">{config.max_attempts} failed attempts</strong>, account is locked for <strong className="text-foreground">{config.lockout_minutes} minutes</strong></li>
                  {config.progressive_lockout && (
                    <li>Each additional failed attempt <strong className="text-foreground">doubles</strong> the lockout duration (up to 16×)</li>
                  )}
                  <li>Successful login <strong className="text-foreground">resets</strong> the attempt counter and removes the lock</li>
                  <li>Admins can manually unlock accounts from this page</li>
                  <li>All lockout events are recorded in the <strong className="text-foreground">Security Audit Log</strong></li>
                </ol>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default BruteForceConfig;
