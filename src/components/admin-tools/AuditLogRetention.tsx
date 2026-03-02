import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, RotateCcw, Trash2, Archive, Clock, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AuditLogRetentionProps {
  onBack: () => void;
}

interface RetentionConfig {
  enabled: boolean;
  retention_days: number;
  auto_archive: boolean;
  archive_to_storage: boolean;
}

const DEFAULT_CONFIG: RetentionConfig = {
  enabled: true,
  retention_days: 365,
  auto_archive: true,
  archive_to_storage: false,
};

const PRESETS = [
  { label: '90 days', value: 90 },
  { label: '6 months', value: 180 },
  { label: '1 year', value: 365 },
  { label: '2 years', value: 730 },
];

const AuditLogRetention: React.FC<AuditLogRetentionProps> = ({ onBack }) => {
  const [config, setConfig] = useState<RetentionConfig>(DEFAULT_CONFIG);
  const [original, setOriginal] = useState<RetentionConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [oldLogCount, setOldLogCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: settings }, { count: total }, { count: old }] = await Promise.all([
        supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'audit_log_retention')
          .single(),
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact', head: true })
          .lt('timestamp', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      if (settings?.value) {
        const c = settings.value as unknown as RetentionConfig;
        setConfig(c);
        setOriginal(c);
      }
      setLogCount(total || 0);
      setOldLogCount(old || 0);
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
      .eq('key', 'audit_log_retention');
    setSaving(false);
    if (error) {
      toast.error('Failed to save retention settings');
    } else {
      setOriginal(config);
      toast.success('Audit log retention settings saved.');
    }
  };

  const handlePurge = async () => {
    setPurging(true);
    const { data, error } = await (supabase.rpc as any)('purge_old_audit_logs', {
      retention_days_param: config.retention_days,
    });
    setPurging(false);
    if (error) {
      toast.error('Failed to purge old logs');
    } else {
      toast.success(`Purged ${data || 0} old audit log entries.`);
      // Refresh counts
      const [{ count: total }, { count: old }] = await Promise.all([
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true })
          .lt('timestamp', new Date(Date.now() - config.retention_days * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      setLogCount(total || 0);
      setOldLogCount(old || 0);
    }
  };

  const formatDays = (days: number) => {
    if (days >= 365) return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''}`;
    if (days >= 30) return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''}`;
    return `${days} days`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Audit Log Retention" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Archive className="h-5 w-5 text-primary" />
                Audit Log Retention
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure how long audit logs are retained and when old entries are purged
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
        {/* Stats overview */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{logCount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total audit log entries</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={oldLogCount > 0 ? 'border-amber-500/30' : ''}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${oldLogCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{oldLogCount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Older than retention period</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enable/Disable */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${config.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Archive className="h-5 w-5" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Automatic Retention Policy</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically purge audit logs older than the retention period
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

        {/* Retention period */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Retention Period</CardTitle>
            <CardDescription className="text-xs">
              How long audit log entries are kept before being eligible for deletion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Presets */}
            <div className="flex gap-2">
              {PRESETS.map(p => (
                <Button
                  key={p.value}
                  variant={config.retention_days === p.value ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setConfig(prev => ({ ...prev, retention_days: p.value }))}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Retention Duration</Label>
              <Badge variant="outline" className="text-xs font-mono tabular-nums">
                {formatDays(config.retention_days)}
              </Badge>
            </div>
            <Slider
              value={[config.retention_days]}
              onValueChange={([v]) => setConfig(prev => ({ ...prev, retention_days: v }))}
              min={30}
              max={1095}
              step={30}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>30 days</span>
              <span>3 years</span>
            </div>
          </CardContent>
        </Card>

        {/* Manual purge */}
        {oldLogCount > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trash2 className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {oldLogCount.toLocaleString()} entries eligible for purge
                    </p>
                    <p className="text-xs text-muted-foreground">
                      These entries are older than {formatDays(config.retention_days)}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs border-amber-500/30 hover:bg-amber-500/10">
                      <Trash2 className="h-3.5 w-3.5" /> Purge Now
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Purge Old Audit Logs</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {oldLogCount.toLocaleString()} audit log entries older than {formatDays(config.retention_days)}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePurge} disabled={purging}>
                        {purging ? 'Purging...' : 'Purge'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
              <li>Audit logs record all security events, admin actions, and approval decisions</li>
              <li>Logs older than <strong className="text-foreground">{formatDays(config.retention_days)}</strong> become eligible for deletion</li>
              <li>You can manually purge eligible logs using the button above</li>
              <li>For compliance, ensure your retention period meets regulatory requirements (e.g., SOX: 7 years)</li>
              <li>Purge actions are themselves recorded in the audit log</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditLogRetention;
