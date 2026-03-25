import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AdminHeader from '@/components/admin/AdminHeader';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { isAPIConfigured, getAPIConfig } from '@/lib/api-config-storage';
import {
  Plug, Search, Wifi, RefreshCw, Loader2, Eye, EyeOff,
  ChevronDown, CheckCircle2, XCircle, AlertTriangle, X, Zap, Bot, Info, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

import sapLogo from '@/assets/logos/sap4hana.png';
import primaveraLogo from '@/assets/logos/primavera.png';
import gocompletionsLogo from '@/assets/logos/gocompletions.png';
import assaiLogo from '@/assets/logos/assai.png';
import sharepointLogo from '@/assets/logos/sharepoint.png';
import teamsLogo from '@/assets/logos/teams.png';
import wrenchLogo from '@/assets/logos/wrench.png';
import documentumLogo from '@/assets/logos/documentum.png';
import outlookLogo from '@/assets/logos/outlook.png';

interface IntegrationHubProps {
  onBack: () => void;
}

interface SyncCredential {
  id: string;
  tenant_id: string;
  dms_platform: string;
  base_url: string | null;
  username_encrypted: string | null;
  password_encrypted: string | null;
  project_code_field: string | null;
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
  section: 'dms' | 'enterprise' | 'comms';
  logo: string | null;
  logoScale?: number;
  hasEdgeFunction?: boolean;
  accent: string;
  badgeLabel: string;
}

type ConnectionMethod = 'api' | 'automation';
type AuthType = 'api_key' | 'oauth' | 'bearer';

const ALL_PLATFORMS: Platform[] = [
  { id: 'assai', name: 'Assai', description: 'Enterprise document management for O&G', section: 'dms', logo: assaiLogo, logoScale: 1.15, hasEdgeFunction: true, accent: '#F97316', badgeLabel: 'assai' },
  { id: 'wrench', name: 'Wrench', description: 'Project document control and management', section: 'dms', logo: wrenchLogo, accent: '#2563EB', badgeLabel: 'wrench' },
  { id: 'documentum', name: 'Documentum', description: 'Enterprise content management platform', section: 'dms', logo: documentumLogo, logoScale: 1.35, accent: '#6D28D9', badgeLabel: 'Documentum' },
  { id: 'sharepoint', name: 'SharePoint', description: 'Collaboration and document storage', section: 'dms', logo: sharepointLogo, logoScale: 2.2, accent: '#038387', badgeLabel: 'SharePoint' },
  { id: 'gocompletions', name: 'GoCompletions', description: 'Completions and commissioning management', section: 'enterprise', logo: gocompletionsLogo, logoScale: 1.6, accent: '#0EA5E9', badgeLabel: 'GoCompletions' },
  { id: 'sap4hana', name: 'SAP S/4HANA', description: 'Enterprise resource planning and financials', section: 'enterprise', logo: sapLogo, logoScale: 1.4, accent: '#0070F2', badgeLabel: 'SAP' },
  { id: 'primavera-p6', name: 'Oracle Primavera P6', description: 'Project planning, scheduling and control', section: 'enterprise', logo: primaveraLogo, logoScale: 1.5, accent: '#C74634', badgeLabel: 'Oracle' },
  { id: 'teams', name: 'Microsoft Teams', description: 'Team communication and collaboration', section: 'comms', logo: teamsLogo, logoScale: 1.5, accent: '#6264A7', badgeLabel: 'Teams' },
  { id: 'outlook', name: 'Microsoft Outlook', description: 'Email and calendar integration for invitations', section: 'comms', logo: outlookLogo, logoScale: 1.0, accent: '#0078D4', badgeLabel: 'Outlook' },
];

const IntegrationHub: React.FC<IntegrationHubProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [credentials, setCredentials] = useState<SyncCredential[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelPlatform, setPanelPlatform] = useState<Platform | null>(null);

  // Panel form state
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>('api');
  const [authType, setAuthType] = useState<AuthType>('api_key');
  const [formData, setFormData] = useState({
    base_url: '', username: '', password: '', api_key: '', header_name: 'X-API-Key',
    client_id: '', client_secret: '', token_url: '', scope: '',
    project_code_field: '', sync_enabled: false,
    platform_url: '', workflow_url: '', auth_token: '', automation_enabled: false,
  });
  const [urlError, setUrlError] = useState('');
  const [triedSave, setTriedSave] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Action states
  const [testingInPanel, setTestingInPanel] = useState(false);
  const [testResultInPanel, setTestResultInPanel] = useState<{ success: boolean; message: string; response_time_ms: number } | null>(null);
  const [syncingInPanel, setSyncingInPanel] = useState(false);
  const [syncResultInPanel, setSyncResultInPanel] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dms: true,
    enterprise: false,
    comms: false,
  });

  // GoCompletions localStorage status
  const [gocConfigured, setGocConfigured] = useState(false);

  useEffect(() => {
    fetchData();
    setGocConfigured(isAPIConfigured('gocompletions'));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [credsResult, logsResult] = await Promise.all([
        supabase.from('dms_sync_credentials').select('*').order('dms_platform'),
        supabase.from('dms_sync_logs').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setCredentials((credsResult.data as SyncCredential[]) || []);
      setSyncLogs((logsResult.data as SyncLog[]) || []);
    } catch (err) {
      console.error('Error fetching integration data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCredential = (platformId: string) => credentials.find(c => c.dms_platform === platformId);

  const getStatusInfo = (platformId: string) => {
    if (platformId === 'gocompletions') {
      return gocConfigured
        ? { label: 'Credentials saved', variant: 'configured' as const }
        : { label: 'Not configured', variant: 'none' as const };
    }
    const cred = getCredential(platformId);
    if (!cred) return { label: 'Not configured', variant: 'none' as const };
    return { label: 'Credentials saved', variant: 'configured' as const };
  };

  const getConnectionMethodLabel = (platformId: string): string | null => {
    if (platformId === 'gocompletions') {
      const config = getAPIConfig('gocompletions');
      if (config?.interfaceMethod === 'rpa') return 'Automation';
      if (config?.interfaceMethod === 'api') return 'API';
      return null;
    }
    const cred = getCredential(platformId);
    if (!cred) return null;
    return 'API';
  };

  const openPanel = (platform: Platform) => {
    setPanelPlatform(platform);
    setTestResultInPanel(null);
    setSyncResultInPanel(null);
    setHistoryOpen(false);
    setShowRemoveConfirm(false);

    // Pre-populate from existing credentials
    if (platform.id === 'gocompletions') {
      const config = getAPIConfig('gocompletions');
      if (config?.interfaceMethod === 'rpa' && config.rpaCredentials) {
        setConnectionMethod('automation');
        setFormData(prev => ({
          ...prev, base_url: '', username: '', password: '', api_key: '', header_name: 'X-API-Key',
          client_id: '', client_secret: '', token_url: '', project_code_field: '', sync_enabled: false,
          workflow_url: config.rpaCredentials!.portalUrl || '', auth_token: '', automation_enabled: true,
        }));
      } else if (config?.apiCredentials) {
        setConnectionMethod('api');
        setFormData(prev => ({
          ...prev,
          base_url: config.apiCredentials!.endpointUrl || '',
          username: config.apiCredentials!.username || '',
          password: config.apiCredentials!.password || '',
          api_key: config.apiCredentials!.apiKey || '',
          client_id: config.apiCredentials!.clientId || '',
          client_secret: config.apiCredentials!.clientSecret || '',
          token_url: config.apiCredentials!.tokenUrl || '',
          scope: '', project_code_field: '', sync_enabled: false,
          platform_url: '', workflow_url: '', auth_token: '', automation_enabled: false, header_name: 'X-API-Key',
        }));
      } else {
        setConnectionMethod('api');
        resetFormData();
      }
    } else {
      const existing = getCredential(platform.id);
      setConnectionMethod('api');
      setFormData({
        base_url: existing?.base_url || '',
        username: '', password: '', api_key: '', header_name: 'X-API-Key',
        client_id: '', client_secret: '', token_url: '', scope: '',
        project_code_field: existing?.project_code_field || '',
        sync_enabled: existing?.sync_enabled || false,
        platform_url: '', workflow_url: '', auth_token: '', automation_enabled: false,
      });
    }
    setAuthType('api_key');
    setTriedSave(false);
    setUrlError('');
    setCredentialsSaved(!!getCredential(platform.id) || (platform.id === 'gocompletions' && gocConfigured));
    setShowPassword(false);
    setPanelOpen(true);
  };

  const resetFormData = () => {
    setFormData({
      base_url: '', username: '', password: '', api_key: '', header_name: 'X-API-Key',
      client_id: '', client_secret: '', token_url: '', scope: '',
      project_code_field: '', sync_enabled: false,
      platform_url: '', workflow_url: '', auth_token: '', automation_enabled: false,
    });
  };

  const saveConfig = async () => {
    if (!panelPlatform) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const tenantId = user.user_metadata?.tenant_id;
      const existing = getCredential(panelPlatform.id);

      const record: Record<string, unknown> = {
        tenant_id: tenantId,
        dms_platform: panelPlatform.id,
        base_url: connectionMethod === 'api' ? formData.base_url : formData.platform_url,
        project_code_field: formData.project_code_field,
        sync_enabled: connectionMethod === 'api' ? formData.sync_enabled : formData.automation_enabled,
        updated_at: new Date().toISOString(),
      };
      if (connectionMethod === 'api') {
        if (authType === 'api_key') {
          if (formData.api_key) record.password_encrypted = formData.api_key;
        } else if (authType === 'bearer') {
          if (formData.auth_token) record.password_encrypted = formData.auth_token;
        } else if (authType === 'oauth') {
          if (formData.client_id) record.username_encrypted = formData.client_id;
          if (formData.client_secret) record.password_encrypted = formData.client_secret;
        }
      } else {
        if (formData.username) record.username_encrypted = formData.username;
        if (formData.password) record.password_encrypted = formData.password;
      }

      if (existing) {
        const { error } = await supabase.from('dms_sync_credentials').update(record).eq('id', existing.id);
        if (error) throw error;
      } else {
        record.created_at = new Date().toISOString();
        const { error } = await supabase.from('dms_sync_credentials').insert(record as any);
        if (error) throw error;
      }

      toast.success('Credentials saved');
      setCredentialsSaved(true);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!panelPlatform?.hasEdgeFunction) {
      toast.info(`Test function not yet deployed for ${panelPlatform?.name}`);
      return;
    }
    setTestingInPanel(true);
    setTestResultInPanel(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.user_metadata?.tenant_id;
      const { data, error } = await supabase.functions.invoke('test-assai-connection', { body: { tenant_id: tenantId } });
      if (error) throw error;
      setTestResultInPanel(data);
    } catch (err: any) {
      setTestResultInPanel({ success: false, message: err.message, response_time_ms: 0 });
    } finally {
      setTestingInPanel(false);
    }
  };

  const triggerSync = async () => {
    if (!panelPlatform?.hasEdgeFunction) {
      toast.info(`Sync function not yet deployed for ${panelPlatform?.name}`);
      return;
    }
    setSyncingInPanel(true);
    setSyncResultInPanel(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.user_metadata?.tenant_id;
      const { data, error } = await supabase.functions.invoke('sync-assai-documents', {
        body: { tenant_id: tenantId, manual_trigger: true },
      });
      if (error) throw error;
      if (data?.success) {
        setSyncResultInPanel(`${data.synced_count} records synced, ${data.new_documents} new`);
      } else {
        setSyncResultInPanel(data?.error || 'Sync failed');
      }
      fetchData();
    } catch (err: any) {
      setSyncResultInPanel(err.message || 'Sync failed');
    } finally {
      setSyncingInPanel(false);
    }
  };

  const removeCredentials = async () => {
    if (!panelPlatform) return;
    const existing = getCredential(panelPlatform.id);
    if (existing) {
      await supabase.from('dms_sync_credentials').delete().eq('id', existing.id);
    }
    toast.success(`Credentials removed for ${panelPlatform.name}`);
    setShowRemoveConfirm(false);
    setPanelOpen(false);
    fetchData();
  };

  const getPlatformLogs = (platformId: string) =>
    syncLogs.filter(l => l.dms_platform === platformId).slice(0, 10);

  const filteredPlatforms = useMemo(() => {
    if (!searchQuery.trim()) return ALL_PLATFORMS;
    const q = searchQuery.toLowerCase();
    return ALL_PLATFORMS.filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const dmsPlatforms = filteredPlatforms.filter(p => p.section === 'dms');
  const enterprisePlatforms = filteredPlatforms.filter(p => p.section === 'enterprise');
  const commsPlatforms = filteredPlatforms.filter(p => p.section === 'comms');

  const isFormValid = connectionMethod === 'api' ? !!formData.base_url.trim() : !!formData.platform_url.trim();

  const validateUrl = (url: string) => {
    if (url && !url.startsWith('https://')) {
      return 'URL must start with https://';
    }
    return '';
  };

  const StatusBadge = ({ platformId }: { platformId: string }) => {
    const status = getStatusInfo(platformId);
    if (status.variant === 'configured') {
      return (
        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        {status.label}
      </Badge>
    );
  };

  const renderPlatformCard = (platform: Platform) => {
    const methodLabel = getConnectionMethodLabel(platform.id);

    return (
      <Card
        key={platform.id}
        className="group border-border/40 bg-card hover:border-border transition-colors duration-200 cursor-pointer overflow-hidden min-h-[180px] flex flex-col"
        onClick={() => openPanel(platform)}
      >
        {/* Status badge */}
        <div className="flex justify-end p-3 pb-0">
          <StatusBadge platformId={platform.id} />
        </div>

        {/* Logo */}
        <div className="flex justify-center px-4 py-3">
          <div className="h-12 w-full max-w-[140px] flex items-center justify-center bg-white dark:bg-white/95 rounded-xl border border-border/20 p-2">
            {platform.logo ? (
              <img
                src={platform.logo}
                alt={`${platform.name} logo`}
                className="h-full max-w-full object-contain"
                style={platform.logoScale ? { transform: `scale(${platform.logoScale})` } : undefined}
              />
            ) : (
              <span
                className="text-sm font-bold text-white px-3 py-1 rounded"
                style={{ backgroundColor: platform.accent }}
              >
                {platform.badgeLabel}
              </span>
            )}
          </div>
        </div>

        <CardContent className="pt-0 pb-4 text-center space-y-2">
          
          <p className="text-xs text-muted-foreground leading-relaxed">{platform.description}</p>
          {methodLabel && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
              {methodLabel}
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };


  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSection = (key: string, title: string, platforms: Platform[]) => {
    if (platforms.length === 0) return null;
    const isOpen = openSections[key] ?? false;
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(key)}>
        <CollapsibleTrigger className="flex items-center gap-3 w-full group/section cursor-pointer mb-3">
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200", isOpen ? "" : "-rotate-90")} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 whitespace-nowrap select-none group-hover/section:text-muted-foreground transition-colors">
            {title}
          </span>
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[10px] text-muted-foreground/40 tabular-nums">{platforms.length}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl">
            {platforms.map(renderPlatformCard)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const panelLogs = panelPlatform ? getPlatformLogs(panelPlatform.id) : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AdminHeader
        title="Integration Hub"
        description="Connect ORSH to external platforms and systems"
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
            {renderSection('dms', 'Document Management', dmsPlatforms)}
            {renderSection('enterprise', 'Project & Enterprise Systems', enterprisePlatforms)}
            {renderSection('comms', 'Communication & Collaboration', commsPlatforms)}
            {filteredPlatforms.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Plug className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No platforms match your search.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Panel */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col [&>button.absolute]:hidden" overlayClassName="">
          {panelPlatform && (
            <>
              {/* Panel Header */}
              <div className="border-b border-border px-6 py-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {panelPlatform.logo && (
                      <div className="h-9 w-20 flex items-center justify-center bg-white rounded-lg border border-border/30 p-1">
                        <img
                          src={panelPlatform.logo}
                          alt={panelPlatform.name}
                          className="h-full max-w-full object-contain"
                          style={panelPlatform.logoScale ? { transform: `scale(${panelPlatform.logoScale})` } : undefined}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge platformId={panelPlatform.id} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPanelOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground mt-2">{panelPlatform.description}</p>
              </div>

              {/* Panel Body — scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* CONNECTION METHOD */}
                <div className="space-y-3">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Connection Method</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setConnectionMethod('api')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center min-h-[110px] justify-center',
                        connectionMethod === 'api'
                          ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                          : 'border border-border bg-background hover:border-border/80'
                      )}
                    >
                      <Zap className={cn('h-5 w-5', connectionMethod === 'api' ? 'text-blue-600' : 'text-muted-foreground')} />
                      <span className={cn('font-medium text-sm', connectionMethod === 'api' ? 'text-blue-700 dark:text-blue-400' : 'text-foreground')}>API</span>
                      <p className="text-xs text-muted-foreground">Real-time sync via REST API</p>
                    </button>
                    <button
                      onClick={() => setConnectionMethod('automation')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center min-h-[110px] justify-center',
                        connectionMethod === 'automation'
                          ? 'border-2 border-violet-600 bg-violet-50 dark:bg-violet-950/30'
                          : 'border border-border bg-background hover:border-border/80'
                      )}
                    >
                      <Bot className={cn('h-5 w-5', connectionMethod === 'automation' ? 'text-violet-600' : 'text-muted-foreground')} />
                      <span className={cn('font-medium text-sm', connectionMethod === 'automation' ? 'text-violet-700 dark:text-violet-400' : 'text-foreground')}>Automation</span>
                      <p className="text-xs text-muted-foreground">Browser-based workflow automation</p>
                    </button>
                  </div>
                </div>

                {/* CONFIGURATION */}
                <div className="space-y-4">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Configuration</span>

                  {connectionMethod === 'api' ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-[13px] font-medium text-foreground/80">Base URL</Label>
                        <Input
                          placeholder="https://client.assaisoftware.com/api"
                          value={formData.base_url}
                          onChange={e => { setFormData(f => ({ ...f, base_url: e.target.value })); setUrlError(''); }}
                          onBlur={() => setUrlError(validateUrl(formData.base_url))}
                          className={cn('h-10 text-sm rounded-lg', (urlError || (triedSave && !formData.base_url.trim())) && 'border-destructive')}
                        />
                        {urlError ? (
                          <p className="text-xs text-destructive mt-1">{urlError}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">e.g. https://client.assaisoftware.com/api</p>
                        )}
                        {triedSave && !formData.base_url.trim() && <p className="text-xs text-destructive mt-1">Base URL is required</p>}
                      </div>

                      {/* Auth type selector */}
                      <div className="space-y-1">
                        <Label className="text-[13px] font-medium text-foreground/80">Authentication Type</Label>
                        <div className="flex rounded-lg border border-border overflow-hidden">
                          {([['api_key', 'API Key'], ['oauth', 'OAuth 2.0'], ['bearer', 'Bearer Token']] as const).map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => setAuthType(key)}
                              className={cn(
                                'flex-1 text-xs py-2 px-2 transition-colors font-medium',
                                authType === key
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-background text-muted-foreground hover:bg-muted'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {authType === 'api_key' && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium text-foreground/80">API Key</Label>
                            <div className="relative">
                              <Input type={showPassword ? 'text' : 'password'} value={formData.api_key} onChange={e => setFormData(f => ({ ...f, api_key: e.target.value }))} className="h-10 text-sm rounded-lg pr-10" />
                              {formData.api_key && (
                                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium text-foreground/80">Header Name</Label>
                            <Input value={formData.header_name} onChange={e => setFormData(f => ({ ...f, header_name: e.target.value }))} className="h-10 text-sm rounded-lg" placeholder="X-API-Key" />
                            <p className="text-xs text-muted-foreground mt-1">HTTP header used to pass the API key</p>
                          </div>
                        </>
                      )}

                      {authType === 'oauth' && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium text-foreground/80">Client ID</Label>
                            <Input value={formData.client_id} onChange={e => setFormData(f => ({ ...f, client_id: e.target.value }))} className="h-10 text-sm rounded-lg" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium text-foreground/80">Client Secret</Label>
                            <div className="relative">
                              <Input type={showPassword ? 'text' : 'password'} value={formData.client_secret} onChange={e => setFormData(f => ({ ...f, client_secret: e.target.value }))} className="h-10 text-sm rounded-lg pr-10" />
                              {formData.client_secret && (
                                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium text-foreground/80">Token URL</Label>
                            <Input value={formData.token_url} onChange={e => setFormData(f => ({ ...f, token_url: e.target.value }))} className="h-10 text-sm rounded-lg" placeholder="https://platform.com/oauth/token" />
                            <p className="text-xs text-muted-foreground mt-1">e.g. https://platform.com/oauth/token</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium text-foreground/80">Scope</Label>
                            <Input value={formData.scope} onChange={e => setFormData(f => ({ ...f, scope: e.target.value }))} className="h-10 text-sm rounded-lg" placeholder="read write" />
                            <p className="text-xs text-muted-foreground mt-1">Space-separated OAuth scopes if required</p>
                          </div>
                        </>
                      )}

                      {authType === 'bearer' && (
                        <div className="space-y-1">
                          <Label className="text-[13px] font-medium text-foreground/80">Token</Label>
                          <div className="relative">
                            <Input type={showPassword ? 'text' : 'password'} value={formData.auth_token} onChange={e => setFormData(f => ({ ...f, auth_token: e.target.value }))} className="h-10 text-sm rounded-lg pr-10" />
                            {formData.auth_token && (
                              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Paste your bearer/access token here</p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-[13px] font-medium text-foreground/80">Project Code Field</Label>
                        <Input value={formData.project_code_field} onChange={e => setFormData(f => ({ ...f, project_code_field: e.target.value }))} className="h-10 text-sm rounded-lg" placeholder="ProjectCode" />
                        <p className="text-xs text-muted-foreground mt-1">Field name used to filter documents by project</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-[13px] font-medium text-foreground/80">Enable Sync</Label>
                          <p className="text-xs text-muted-foreground">Allow ORSH to pull data from this platform</p>
                        </div>
                        <Switch checked={formData.sync_enabled} onCheckedChange={v => setFormData(f => ({ ...f, sync_enabled: v }))} />
                      </div>
                    </div>
                  ) : (
                    /* AUTOMATION MODE */
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-[13px] font-medium text-foreground/80">Platform URL</Label>
                        <Input
                          placeholder="https://client.assaisoftware.com"
                          value={formData.platform_url}
                          onChange={e => { setFormData(f => ({ ...f, platform_url: e.target.value })); setUrlError(''); }}
                          onBlur={() => setUrlError(validateUrl(formData.platform_url))}
                          className={cn('h-10 text-sm rounded-lg', (urlError || (triedSave && !formData.platform_url.trim())) && 'border-destructive')}
                        />
                        {urlError ? (
                          <p className="text-xs text-destructive mt-1">{urlError}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">The login URL of the platform e.g. https://client.assaisoftware.com</p>
                        )}
                        {triedSave && !formData.platform_url.trim() && <p className="text-xs text-destructive mt-1">Platform URL is required</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[13px] font-medium text-foreground/80">Username</Label>
                        <Input value={formData.username} onChange={e => setFormData(f => ({ ...f, username: e.target.value }))} className="h-10 text-sm rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[13px] font-medium text-foreground/80">Password</Label>
                        <div className="relative">
                          <Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} className="h-10 text-sm rounded-lg pr-10" />
                          {formData.password && (
                            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[13px] font-medium text-foreground/80">Workflow Trigger URL</Label>
                        <Input value={formData.workflow_url} onChange={e => setFormData(f => ({ ...f, workflow_url: e.target.value }))} className="h-10 text-sm rounded-lg" placeholder="https://prod-00.westus.logic.azure.com/..." />
                        <p className="text-xs text-muted-foreground mt-1">URL of your Power Automate or UiPath workflow trigger endpoint</p>
                      </div>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50">
                        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                          Automation mode logs into the platform interface directly. Ensure your IT team has set up the automation workflow before enabling.
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-[13px] font-medium text-foreground/80">Enable Automation</Label>
                          <p className="text-xs text-muted-foreground">Allow automated workflows for this platform</p>
                        </div>
                        <Switch checked={formData.automation_enabled} onCheckedChange={v => setFormData(f => ({ ...f, automation_enabled: v }))} />
                      </div>
                    </div>
                  )}
                </div>

                {/* SYNC SECTION */}
                <div className="space-y-3">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Sync</span>
                  {(() => {
                    const cred = getCredential(panelPlatform.id);
                    const lastSync = cred?.last_sync_at;
                    return (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {lastSync ? `Last synced: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true })}` : 'Never synced'}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          disabled={!credentialsSaved || syncingInPanel}
                          onClick={triggerSync}
                        >
                          {syncingInPanel ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                          Sync Now
                        </Button>
                      </div>
                    );
                  })()}
                  {syncResultInPanel && (
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-muted">
                      <RefreshCw className="h-3.5 w-3.5" />
                      {syncResultInPanel}
                    </div>
                  )}
                </div>

                {/* SYNC HISTORY */}
                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                    <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', historyOpen ? '' : '-rotate-90')} />
                    <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Sync History</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    {panelLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">No sync history yet</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden text-[11px]">
                        <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-muted/50 font-medium text-muted-foreground">
                          <span>Date</span><span className="text-right">Synced</span><span className="text-right">New</span><span className="text-right">Changed</span><span className="text-right">Failed</span>
                        </div>
                        {panelLogs.map(log => (
                          <div key={log.id} className="grid grid-cols-5 gap-1 px-3 py-2 border-t border-border/50">
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
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 border-t border-border bg-background px-6 py-4">
                {/* Test result inline */}
                {testResultInPanel && (
                  <div className={cn('flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3', testResultInPanel.success ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-destructive/10 text-destructive')}>
                    {testResultInPanel.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {testResultInPanel.success ? `Connected · ${testResultInPanel.response_time_ms}ms` : testResultInPanel.message}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    {!showRemoveConfirm ? (
                      <button
                        onClick={() => setShowRemoveConfirm(true)}
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove credentials
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button variant="destructive" size="sm" className="text-xs h-7" onClick={removeCredentials}>Remove</Button>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowRemoveConfirm(false)}>Cancel</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={!credentialsSaved || testingInPanel}
                      onClick={testConnection}
                    >
                      {testingInPanel ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wifi className="h-3 w-3 mr-1" />}
                      Test
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs"
                      disabled={!isFormValid || saving}
                      onClick={() => { setTriedSave(true); if (isFormValid) saveConfig(); }}
                    >
                      {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default IntegrationHub;
