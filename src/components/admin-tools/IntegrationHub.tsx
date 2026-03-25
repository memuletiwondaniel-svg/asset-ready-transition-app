import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminHeader from '@/components/admin/AdminHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { isAPIConfigured } from '@/lib/api-config-storage';
import {
  Plug, Search, Settings, Wifi, RefreshCw, Loader2, Eye, EyeOff,
  ChevronDown, CheckCircle2, XCircle, AlertTriangle, Clock
} from 'lucide-react';

import sapLogo from '@/assets/logos/sap4hana.png';
import primaveraLogo from '@/assets/logos/primavera.png';
import gocompletionsLogo from '@/assets/logos/gocompletions.png';
import assaiLogo from '@/assets/logos/assai.png';
import sharepointLogo from '@/assets/logos/sharepoint.png';
import teamsLogo from '@/assets/logos/teams.png';

interface IntegrationHubProps {
  onBack: () => void;
}

interface SyncCredential {
  id: string;
  tenant_id: string;
  dms_platform: string;
  base_url: string | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
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

interface Platform {
  id: string;
  name: string;
  description: string;
  section: 'dms' | 'enterprise';
  logo: string | null;
  logoScale?: number;
  hasEdgeFunction?: boolean;
  accent: string;
  badgeLabel: string;
}

const ALL_PLATFORMS: Platform[] = [
  { id: 'assai', name: 'Assai', description: 'Enterprise document management for O&G', section: 'dms', logo: assaiLogo, logoScale: 0.79, hasEdgeFunction: true, accent: '#F97316', badgeLabel: 'assai' },
  { id: 'wrench', name: 'Wrench', description: 'Project document control and management', section: 'dms', logo: null, accent: '#2563EB', badgeLabel: 'wrench' },
  { id: 'documentum', name: 'Documentum', description: 'Enterprise content management platform', section: 'dms', logo: null, accent: '#6D28D9', badgeLabel: 'Documentum' },
  { id: 'gocompletions', name: 'GoCompletions', description: 'Completions and commissioning management', section: 'enterprise', logo: gocompletionsLogo, accent: '#0EA5E9', badgeLabel: 'GoCompletions' },
  { id: 'sap4hana', name: 'SAP S/4HANA', description: 'Enterprise resource planning and financials', section: 'enterprise', logo: sapLogo, accent: '#0070F2', badgeLabel: 'SAP' },
  { id: 'primavera-p6', name: 'Oracle Primavera P6', description: 'Project planning, scheduling and control', section: 'enterprise', logo: primaveraLogo, logoScale: 1.3, accent: '#C74634', badgeLabel: 'Oracle' },
  { id: 'sharepoint', name: 'SharePoint', description: 'Collaboration and document storage', section: 'enterprise', logo: sharepointLogo, logoScale: 1.6, accent: '#038387', badgeLabel: 'SharePoint' },
  { id: 'teams', name: 'Microsoft Teams', description: 'Team communication and collaboration', section: 'enterprise', logo: teamsLogo, accent: '#6264A7', badgeLabel: 'Teams' },
];

const IntegrationHub: React.FC<IntegrationHubProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [credentials, setCredentials] = useState<SyncCredential[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Configure panel state
  const [configOpen, setConfigOpen] = useState(false);
  const [configPlatform, setConfigPlatform] = useState<Platform | null>(null);
  const [configForm, setConfigForm] = useState({ base_url: '', username: '', password: '', project_code_field: 'ProjectCode', sync_enabled: false });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Action states
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string; response_time_ms: number } | null>>({});
  const [syncError, setSyncError] = useState<Record<string, string>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  // Project selector for sync
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState<{ id: string; project_title: string; project_id_prefix: string }[]>([]);

  // GoCompletions localStorage status
  const [gocConfigured, setGocConfigured] = useState(false);

  useEffect(() => {
    fetchData();
    fetchProjects();
    setGocConfigured(isAPIConfigured('gocompletions'));
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, project_title, project_id_prefix').order('project_title');
    setProjects((data as any[]) || []);
    if (data && data.length > 0) setSelectedProject((data[0] as any).id);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [credsResult, logsResult] = await Promise.all([
        supabase.from('dms_sync_credentials').select('*').order('dms_platform'),
        supabase.from('dms_sync_logs').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setCredentials((credsResult.data as SyncCredential[]) || []);
      setSyncLogs((logsResult.data as SyncLog[]) || []);

      const counts: Record<string, number> = {};
      for (const p of ALL_PLATFORMS.filter(p => p.section === 'dms')) {
        const { count } = await supabase.from('dms_external_sync').select('id', { count: 'exact', head: true }).eq('dms_platform', p.id);
        counts[p.id] = count || 0;
      }
      setDocCounts(counts);
    } catch (err) {
      console.error('Error fetching integration data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCredential = (platformId: string) => credentials.find(c => c.dms_platform === platformId);

  const getStatusBadge = (platformId: string) => {
    // GoCompletions uses localStorage
    if (platformId === 'gocompletions') {
      return gocConfigured
        ? { label: 'Credentials saved', variant: 'configured' as const }
        : { label: 'Not configured', variant: 'none' as const };
    }

    const tr = testResult[platformId];
    if (tr) {
      if (tr.success) return { label: `Connected · ${tr.response_time_ms}ms`, variant: 'connected' as const };
      return { label: `Connection failed · ${tr.message.substring(0, 30)}`, variant: 'failed' as const };
    }

    const cred = getCredential(platformId);
    if (!cred) return { label: 'Not configured', variant: 'none' as const };
    if (cred.sync_enabled) return { label: 'Credentials saved', variant: 'configured' as const };
    return { label: 'Credentials saved', variant: 'configured' as const };
  };

  const openConfig = (platform: Platform) => {
    if (platform.id === 'gocompletions') {
      toast.info('GoCompletions uses its own configuration. Check the APIs wizard.');
      return;
    }
    const existing = getCredential(platform.id);
    setConfigPlatform(platform);
    setConfigForm({
      base_url: existing?.base_url || '',
      username: '',
      password: '',
      project_code_field: 'ProjectCode',
      sync_enabled: existing?.sync_enabled || false,
    });
    setShowPassword(false);
    setConfigOpen(true);
  };

  const saveConfig = async () => {
    if (!configPlatform) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const tenantId = user.user_metadata?.tenant_id;
      const existing = getCredential(configPlatform.id);

      const record: Record<string, unknown> = {
        tenant_id: tenantId,
        dms_platform: configPlatform.id,
        base_url: configForm.base_url,
        project_code_field: configForm.project_code_field,
        sync_enabled: configForm.sync_enabled,
        updated_at: new Date().toISOString(),
      };
      if (configForm.username) record.username_encrypted = configForm.username;
      if (configForm.password) record.password_encrypted = configForm.password;

      if (existing) {
        const { error } = await supabase.from('dms_sync_credentials').update(record).eq('id', existing.id);
        if (error) throw error;
      } else {
        record.created_at = new Date().toISOString();
        const { error } = await supabase.from('dms_sync_credentials').insert(record as any);
        if (error) throw error;
      }

      toast.success(`${configPlatform.name} configuration saved`);
      setConfigOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (platform: Platform) => {
    if (!platform.hasEdgeFunction) {
      toast.info(`Test function not yet deployed for ${platform.name}`);
      return;
    }
    setTesting(platform.id);
    setTestResult(prev => ({ ...prev, [platform.id]: null }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.user_metadata?.tenant_id;
      const { data, error } = await supabase.functions.invoke('test-assai-connection', { body: { tenant_id: tenantId } });
      if (error) throw error;
      setTestResult(prev => ({ ...prev, [platform.id]: data }));
      if (data?.success) toast.success(`Connection successful (${data.response_time_ms}ms)`);
      else toast.error(data?.message || 'Connection failed');
    } catch (err: any) {
      setTestResult(prev => ({ ...prev, [platform.id]: { success: false, message: err.message, response_time_ms: 0 } }));
      toast.error(err.message || 'Test failed');
    } finally {
      setTesting(null);
    }
  };

  const triggerSync = async (platform: Platform) => {
    if (!platform.hasEdgeFunction) {
      toast.info(`Sync function not yet deployed for ${platform.name}`);
      return;
    }
    if (!selectedProject) { toast.error('Select a project first'); return; }
    setSyncing(platform.id);
    setSyncError(prev => ({ ...prev, [platform.id]: '' }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.user_metadata?.tenant_id;
      const { data, error } = await supabase.functions.invoke('sync-assai-documents', {
        body: { project_id: selectedProject, tenant_id: tenantId, manual_trigger: true },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Sync complete: ${data.synced_count} synced, ${data.new_documents} new`);
      } else {
        setSyncError(prev => ({ ...prev, [platform.id]: data?.error || 'Sync failed' }));
        toast.error(data?.error || 'Sync failed');
      }
      fetchData();
    } catch (err: any) {
      setSyncError(prev => ({ ...prev, [platform.id]: err.message }));
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  const getPlatformLogs = (platformId: string) =>
    syncLogs.filter(l => l.dms_platform === platformId).slice(0, 5);

  const filteredPlatforms = useMemo(() => {
    if (!searchQuery.trim()) return ALL_PLATFORMS;
    const q = searchQuery.toLowerCase();
    return ALL_PLATFORMS.filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const dmsPlatforms = filteredPlatforms.filter(p => p.section === 'dms');
  const enterprisePlatforms = filteredPlatforms.filter(p => p.section === 'enterprise');

  const StatusBadgeComponent = ({ platformId }: { platformId: string }) => {
    const status = getStatusBadge(platformId);
    const variantStyles: Record<string, string> = {
      connected: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      configured: 'bg-teal-500/10 text-teal-600 border-teal-200',
      failed: 'bg-destructive/10 text-destructive border-destructive/20',
      none: '',
    };
    const icons: Record<string, React.ReactNode> = {
      connected: <CheckCircle2 className="h-3 w-3 mr-1" />,
      configured: <CheckCircle2 className="h-3 w-3 mr-1" />,
      failed: <XCircle className="h-3 w-3 mr-1" />,
      none: <AlertTriangle className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge variant={status.variant === 'none' ? 'outline' : 'default'} className={`text-[10px] ${variantStyles[status.variant]}`}>
        {icons[status.variant]}
        {status.label}
      </Badge>
    );
  };

  const renderPlatformCard = (platform: Platform) => {
    const cred = getCredential(platform.id);
    const count = docCounts[platform.id] || 0;
    const hasCredentials = !!cred || (platform.id === 'gocompletions' && gocConfigured);
    const logs = getPlatformLogs(platform.id);
    const isExpanded = expandedLogs[platform.id] || false;

    return (
      <Card key={platform.id} className="border-border/40 transition-all duration-200 overflow-hidden" style={{ borderTop: `3px solid ${platform.accent}` }}>
        {/* Status badge */}
        <div className="flex justify-end p-3 pb-0">
          <StatusBadgeComponent platformId={platform.id} />
        </div>

        {/* Logo */}
        <div className="flex justify-center px-4 py-3">
          <div className="h-12 w-full max-w-[160px] flex items-center justify-center bg-white dark:bg-white/95 rounded-lg border border-border/30 p-2">
            {platform.logo ? (
              <img
                src={platform.logo}
                alt={`${platform.name} logo`}
                className="h-full max-w-full object-contain"
                style={platform.logoScale ? { transform: `scale(${platform.logoScale})` } : undefined}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
              />
            ) : null}
            <span
              className={`text-sm font-bold text-white px-3 py-1 rounded ${platform.logo ? 'hidden' : ''}`}
              style={{ backgroundColor: platform.accent }}
            >
              {platform.badgeLabel}
            </span>
          </div>
        </div>

        <CardContent className="space-y-3 pt-0">
          {/* Name & description */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{platform.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{platform.description}</p>
          </div>

          {/* Stats row - only if connected */}
          {hasCredentials && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {cred?.last_sync_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(cred.last_sync_at), { addSuffix: true })}
                </span>
              )}
              {count > 0 && <span className="font-medium text-foreground">{count.toLocaleString()} records</span>}
            </div>
          )}

          {/* Project selector for sync */}
          {platform.hasEdgeFunction && hasCredentials && (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="h-8 text-xs">
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
          )}

          {/* Button row */}
          <div className="grid grid-cols-3 gap-1.5">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => openConfig(platform)}>
              <Settings className="h-3 w-3 mr-1" />
              Configure
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 w-full"
                      disabled={!hasCredentials || testing === platform.id}
                      onClick={() => testConnection(platform)}
                    >
                      {testing === platform.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wifi className="h-3 w-3 mr-1" />}
                      Test
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasCredentials && <TooltipContent><p className="text-xs">Configure credentials first</p></TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              className="text-xs h-8"
              disabled={!hasCredentials || syncing === platform.id}
              onClick={() => triggerSync(platform)}
            >
              {syncing === platform.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Sync Now
            </Button>
          </div>

          {/* Sync error */}
          {syncError[platform.id] && (
            <p className="text-xs text-destructive">{syncError[platform.id]}</p>
          )}

          {/* Expandable sync log */}
          <Collapsible open={isExpanded} onOpenChange={(o) => setExpandedLogs(prev => ({ ...prev, [platform.id]: o }))}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              View sync history
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No syncs recorded yet</p>
              ) : (
                <div className="space-y-0 border rounded-md overflow-hidden">
                  <div className="grid grid-cols-5 gap-1 px-2 py-1 bg-muted/50 text-[10px] font-medium text-muted-foreground">
                    <span>Date</span><span className="text-right">Synced</span><span className="text-right">New</span><span className="text-right">Changed</span><span className="text-right">Failed</span>
                  </div>
                  {logs.map(log => (
                    <div key={log.id} className="grid grid-cols-5 gap-1 px-2 py-1 text-[10px] border-t border-border/50">
                      <span>{format(new Date(log.created_at), 'dd MMM HH:mm')}</span>
                      <span className="text-right font-medium">{log.synced_count}</span>
                      <span className="text-right text-emerald-600">{log.new_documents}</span>
                      <span className="text-right text-amber-600">{log.status_changes}</span>
                      <span className="text-right text-destructive">{log.failed_count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  const renderSection = (title: string, platforms: Platform[]) => {
    if (platforms.length === 0) return null;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <Badge variant="outline" className="text-xs">{platforms.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map(renderPlatformCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AdminHeader
        title="Integration Hub"
        description="Configure interfaces between ORSH and external applications"
        icon={<Plug className="h-6 w-6" />}
        iconGradient="from-emerald-500 to-teal-600"
        favoritePath="/admin-tools/integration-hub"
        customBreadcrumbs={[
          { label: 'Home', path: '/', onClick: onBack },
          { label: 'Administration', path: '/admin-tools', onClick: onBack },
        ]}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search platforms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {renderSection('Document Management Systems', dmsPlatforms)}
            {renderSection('Project & Enterprise Systems', enterprisePlatforms)}
            {filteredPlatforms.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Plug className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No platforms match your search.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Configure Slide-over */}
      <Sheet open={configOpen} onOpenChange={setConfigOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configure {configPlatform?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label className="text-xs">Base URL</Label>
              <Input
                placeholder="https://your-instance.com"
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
              <p className="text-[10px] text-muted-foreground">Credentials are encrypted before storage</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Project Code Field</Label>
              <Input
                placeholder="ProjectCode"
                value={configForm.project_code_field}
                onChange={e => setConfigForm(f => ({ ...f, project_code_field: e.target.value }))}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">The API field name used to filter by project</p>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Enable Sync</Label>
              <Switch
                checked={configForm.sync_enabled}
                onCheckedChange={v => setConfigForm(f => ({ ...f, sync_enabled: v }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setConfigOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={saveConfig} disabled={saving}>
                {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save Configuration
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default IntegrationHub;
