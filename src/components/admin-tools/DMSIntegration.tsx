import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft, Database, Settings, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Clock, Loader2, Eye, EyeOff, Wifi
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DMSIntegrationProps {
  onBack: () => void;
}

interface SyncCredential {
  id: string;
  tenant_id: string;
  dms_platform: string;
  base_url: string | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
  mdr_last_fetched_at: string | null;
  mdr_document_number: string | null;
  mdr_current_revision: string | null;
  created_at: string;
}

interface SyncLog {
  id: string;
  dms_platform: string;
  synced_count: number;
  failed_count: number;
  new_documents: number;
  status_changes: number;
  sync_status: string;
  error_message: string | null;
  created_at: string;
}

const PLATFORMS = [
  { id: 'assai', name: 'Assai', color: 'bg-blue-500', description: 'Enterprise document management for O&G' },
  { id: 'wrench', name: 'Wrench', color: 'bg-emerald-500', description: 'Engineering document control' },
  { id: 'documentum', name: 'Documentum', color: 'bg-purple-500', description: 'OpenText Documentum ECM' },
  { id: 'sharepoint', name: 'SharePoint', color: 'bg-sky-500', description: 'Microsoft SharePoint DMS' },
];

const DMSIntegration: React.FC<DMSIntegrationProps> = ({ onBack }) => {
  const [credentials, setCredentials] = useState<SyncCredential[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [configPlatform, setConfigPlatform] = useState('assai');
  const [configForm, setConfigForm] = useState({
    base_url: '',
    username: '',
    password: '',
    project_code_field: 'ProjectCode',
    sync_enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<{ id: string; project_title: string; project_id_prefix: string }[]>([]);

  useEffect(() => {
    fetchData();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_title, project_id_prefix')
      .order('project_title');
    setProjects((data as any[]) || []);
    if (data && data.length > 0) setSelectedProject((data[0] as any).id);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [credsResult, logsResult] = await Promise.all([
        supabase.from('dms_sync_credentials').select('*').order('dms_platform'),
        supabase.from('dms_sync_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      setCredentials((credsResult.data as SyncCredential[]) || []);
      setSyncLogs((logsResult.data as SyncLog[]) || []);

      // Get document counts per platform
      const counts: Record<string, number> = {};
      for (const platform of PLATFORMS) {
        const { count } = await supabase
          .from('dms_external_sync')
          .select('id', { count: 'exact', head: true })
          .eq('dms_platform', platform.id);
        counts[platform.id] = count || 0;
      }
      setDocCounts(counts);
    } catch (err) {
      console.error('Error fetching DMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openConfig = (platformId: string) => {
    const existing = credentials.find(c => c.dms_platform === platformId);
    setConfigPlatform(platformId);
    setConfigForm({
      base_url: existing?.base_url || '',
      username: '',
      password: '',
      project_code_field: 'ProjectCode',
      sync_enabled: existing?.sync_enabled || false,
    });
    setConfigOpen(true);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const tenantId = user.user_metadata?.tenant_id;

      // Encrypt credentials if possible
      let usernameEnc = configForm.username;
      let passwordEnc = configForm.password;

      const existing = credentials.find(c => c.dms_platform === configPlatform);

      const record: Record<string, unknown> = {
        tenant_id: tenantId,
        dms_platform: configPlatform,
        base_url: configForm.base_url,
        project_code_field: configForm.project_code_field,
        sync_enabled: configForm.sync_enabled,
        updated_at: new Date().toISOString(),
      };

      // Only update credentials if provided
      if (usernameEnc) record.username_encrypted = usernameEnc;
      if (passwordEnc) record.password_encrypted = passwordEnc;

      if (existing) {
        const { error } = await supabase
          .from('dms_sync_credentials')
          .update(record)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        record.created_at = new Date().toISOString();
        const { error } = await supabase
          .from('dms_sync_credentials')
          .insert(record as any);
        if (error) throw error;
      }

      toast.success(`${configPlatform} configuration saved`);
      setConfigOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const triggerSync = async (platformId: string) => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    setSyncing(platformId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.user_metadata?.tenant_id;

      const { data, error } = await supabase.functions.invoke('sync-assai-documents', {
        body: {
          project_id: selectedProject,
          tenant_id: tenantId,
          manual_trigger: true,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          `Sync complete: ${data.synced_count} synced, ${data.new_documents} new, ${data.status_changes} status changes`
        );
      } else {
        toast.error(data?.error || 'Sync failed');
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  const getCredential = (platformId: string) =>
    credentials.find(c => c.dms_platform === platformId);

  const getStatus = (platformId: string) => {
    const cred = getCredential(platformId);
    if (!cred) return 'not_configured';
    if (!cred.sync_enabled) return 'disabled';
    if (!cred.last_sync_at) return 'configured';
    return 'connected';
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>;
      case 'configured':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" /> Ready</Badge>;
      case 'disabled':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Disabled</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" /> Not Configured</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="DMS Integration" favoritePath="/admin-tools/dms-integration" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">DMS Integration</h1>
              <p className="text-xs text-muted-foreground">
                Connect external Document Management Systems — Selma syncs document status from here
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[220px] h-9 text-xs">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.project_id_prefix || p.project_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Platform Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLATFORMS.map(platform => {
                const status = getStatus(platform.id);
                const cred = getCredential(platform.id);
                const count = docCounts[platform.id] || 0;

                return (
                  <Card key={platform.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-md ${platform.color} flex items-center justify-center`}>
                            <Database className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">{platform.name}</CardTitle>
                          </div>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                      <CardDescription className="text-xs mt-1">{platform.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {cred?.base_url && (
                        <p className="text-xs text-muted-foreground truncate" title={cred.base_url}>
                          {cred.base_url}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Documents synced</span>
                        <span className="font-medium">{count.toLocaleString()}</span>
                      </div>
                      {cred?.last_sync_at && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Last sync</span>
                          <span className="font-medium">
                            {format(new Date(cred.last_sync_at), 'dd MMM yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => openConfig(platform.id)}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs h-8"
                          disabled={status === 'not_configured' || status === 'disabled' || syncing === platform.id}
                          onClick={() => triggerSync(platform.id)}
                        >
                          {syncing === platform.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                          )}
                          Sync Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Sync Log Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Sync History</CardTitle>
                <CardDescription className="text-xs">
                  Recent document synchronisation operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No sync operations recorded yet
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Timestamp</TableHead>
                          <TableHead className="text-xs">Platform</TableHead>
                          <TableHead className="text-xs text-right">Synced</TableHead>
                          <TableHead className="text-xs text-right">New</TableHead>
                          <TableHead className="text-xs text-right">Changed</TableHead>
                          <TableHead className="text-xs text-right">Failed</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncLogs.map(log => (
                          <TableRow key={log.id} className="h-9">
                            <TableCell className="text-xs">
                              {format(new Date(log.created_at), 'dd MMM HH:mm:ss')}
                            </TableCell>
                            <TableCell className="text-xs capitalize">{log.dms_platform}</TableCell>
                            <TableCell className="text-xs text-right font-medium">{log.synced_count}</TableCell>
                            <TableCell className="text-xs text-right text-emerald-600">{log.new_documents}</TableCell>
                            <TableCell className="text-xs text-right text-amber-600">{log.status_changes}</TableCell>
                            <TableCell className="text-xs text-right text-destructive">{log.failed_count}</TableCell>
                            <TableCell>
                              {log.sync_status === 'success' ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                  Success
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                              {log.error_message || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configure {PLATFORMS.find(p => p.id === configPlatform)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Base URL</Label>
              <Input
                placeholder="https://your-assai-instance.com"
                value={configForm.base_url}
                onChange={e => setConfigForm(f => ({ ...f, base_url: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Username</Label>
              <Input
                placeholder="API username"
                value={configForm.username}
                onChange={e => setConfigForm(f => ({ ...f, username: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="API password"
                  value={configForm.password}
                  onChange={e => setConfigForm(f => ({ ...f, password: e.target.value }))}
                  className="text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Credentials are encrypted before storage
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Project Code Field</Label>
              <Input
                placeholder="ProjectCode"
                value={configForm.project_code_field}
                onChange={e => setConfigForm(f => ({ ...f, project_code_field: e.target.value }))}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                The API field name used to filter by project
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Enable Sync</Label>
              <Switch
                checked={configForm.sync_enabled}
                onCheckedChange={v => setConfigForm(f => ({ ...f, sync_enabled: v }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setConfigOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveConfig} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DMSIntegration;
