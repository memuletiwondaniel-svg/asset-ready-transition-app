import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, Key, Plus, Copy, Eye, EyeOff, Trash2, RotateCcw, Shield, Clock, Activity,
  AlertTriangle, CheckCircle, Loader2, Info, Globe, Lock, Zap, RefreshCw,
} from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow, addDays } from 'date-fns';

interface ApiKeyManagementProps {
  onBack: () => void;
}

interface ApiKeyRecord {
  id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  integration_type: string;
  permissions: string[];
  allowed_ips: string[] | null;
  rate_limit_per_minute: number;
  expires_at: string | null;
  last_used_at: string | null;
  last_rotated_at: string | null;
  rotation_reminder_days: number;
  total_requests: number;
  is_active: boolean;
  created_at: string;
}

const INTEGRATION_TYPES = [
  { value: 'sap', label: 'SAP S/4HANA' },
  { value: 'primavera', label: 'Primavera P6' },
  { value: 'gocompletions', label: 'GoCompletions' },
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'assai', label: 'Assai DMS' },
  { value: 'rpa', label: 'RPA Bot' },
  { value: 'custom', label: 'Custom Integration' },
];

const PERMISSION_OPTIONS = [
  { value: 'read:projects', label: 'Read Projects' },
  { value: 'write:projects', label: 'Write Projects' },
  { value: 'read:pssrs', label: 'Read PSSRs' },
  { value: 'write:pssrs', label: 'Write PSSRs' },
  { value: 'read:handovers', label: 'Read Handovers' },
  { value: 'write:handovers', label: 'Write Handovers' },
  { value: 'read:users', label: 'Read Users' },
  { value: 'read:audit', label: 'Read Audit Logs' },
  { value: 'webhook:receive', label: 'Receive Webhooks' },
];

const generateApiKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'orsh_';
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

const hashKey = async (key: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const ApiKeyManagement: React.FC<ApiKeyManagementProps> = ({ onBack }) => {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIntegration, setFormIntegration] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formRateLimit, setFormRateLimit] = useState(60);
  const [formExpiryDays, setFormExpiryDays] = useState(90);
  const [formIpWhitelist, setFormIpWhitelist] = useState('');

  const fetchKeys = useCallback(async () => {
    const { data, error } = await supabase
      .from('api_keys' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setKeys(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!formName || !formIntegration || formPermissions.length === 0) {
      toast.error('Name, integration type, and at least one permission are required');
      return;
    }
    setCreating(true);
    const rawKey = generateApiKey();
    const keyHash = await hashKey(rawKey);
    const prefix = rawKey.slice(0, 12);

    const { data: user } = await supabase.auth.getUser();
    const ips = formIpWhitelist.trim() ? formIpWhitelist.split(',').map(s => s.trim()).filter(Boolean) : null;

    const { error } = await supabase.from('api_keys' as any).insert({
      name: formName,
      description: formDescription || null,
      key_hash: keyHash,
      key_prefix: prefix,
      integration_type: formIntegration,
      permissions: formPermissions,
      rate_limit_per_minute: formRateLimit,
      expires_at: addDays(new Date(), formExpiryDays).toISOString(),
      allowed_ips: ips,
      rotation_reminder_days: formExpiryDays,
      created_by: user.user?.id,
    } as any);

    setCreating(false);
    if (error) {
      toast.error('Failed to create API key');
    } else {
      setNewKeyVisible(rawKey);
      setShowCreate(false);
      resetForm();
      fetchKeys();
      toast.success('API key created');
    }
  };

  const resetForm = () => {
    setFormName(''); setFormDescription(''); setFormIntegration('');
    setFormPermissions([]); setFormRateLimit(60); setFormExpiryDays(90); setFormIpWhitelist('');
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from('api_keys' as any).update({ is_active: false } as any).eq('id', id);
    if (error) toast.error('Failed to revoke key');
    else { toast.success('API key revoked'); fetchKeys(); }
  };

  const handleRotate = async (id: string) => {
    const rawKey = generateApiKey();
    const keyHash = await hashKey(rawKey);
    const prefix = rawKey.slice(0, 12);

    const { error } = await supabase.from('api_keys' as any).update({
      key_hash: keyHash, key_prefix: prefix, last_rotated_at: new Date().toISOString(),
    } as any).eq('id', id);

    if (error) toast.error('Failed to rotate key');
    else { setNewKeyVisible(rawKey); fetchKeys(); toast.success('API key rotated — copy the new key now'); }
  };

  const togglePermission = (perm: string) => {
    setFormPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const getStatusBadge = (key: ApiKeyRecord) => {
    if (!key.is_active) return <Badge variant="destructive" className="text-[10px]">Revoked</Badge>;
    if (key.expires_at && new Date(key.expires_at) < new Date()) return <Badge variant="destructive" className="text-[10px]">Expired</Badge>;
    const daysToExpiry = key.expires_at ? Math.ceil((new Date(key.expires_at).getTime() - Date.now()) / 86400000) : null;
    if (daysToExpiry && daysToExpiry < 14) return <Badge className="text-[10px] bg-amber-500">Expiring Soon</Badge>;
    return <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/30">Active</Badge>;
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="API Key Management" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                API Key Management
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate, scope, and manage API keys for external integrations
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Create API Key
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">{keys.filter(k => k.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Active Keys</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">{keys.reduce((s, k) => s + (k.total_requests || 0), 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent></Card>
          <Card className={keys.some(k => k.expires_at && new Date(k.expires_at) < addDays(new Date(), 14) && k.is_active) ? 'border-amber-500/30' : ''}>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold">{keys.filter(k => k.expires_at && new Date(k.expires_at) < addDays(new Date(), 14) && k.is_active).length}</p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Key list */}
        {keys.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Key className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No API keys created yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first API key to enable external integrations</p>
          </CardContent></Card>
        ) : (
          keys.map(key => (
            <Card key={key.id} className={!key.is_active ? 'opacity-60' : ''}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{key.name}</span>
                      {getStatusBadge(key)}
                      <Badge variant="outline" className="text-[10px]">{INTEGRATION_TYPES.find(t => t.value === key.integration_type)?.label || key.integration_type}</Badge>
                    </div>
                    {key.description && <p className="text-xs text-muted-foreground">{key.description}</p>}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{key.key_prefix}••••••</span>
                      <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{(key.total_requests || 0).toLocaleString()} requests</span>
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{key.rate_limit_per_minute}/min</span>
                      {key.last_used_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last used {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}</span>}
                      {key.expires_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Expires {format(new Date(key.expires_at), 'MMM d, yyyy')}</span>}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {key.permissions.map(p => <Badge key={p} variant="secondary" className="text-[9px]">{p}</Badge>)}
                    </div>
                    {key.allowed_ips && key.allowed_ips.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="h-3 w-3" /> IP restricted: {key.allowed_ips.join(', ')}
                      </div>
                    )}
                  </div>
                  {key.is_active && (
                    <div className="flex gap-1">
                      <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRotate(key.id)}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Rotate key</TooltipContent>
                      </Tooltip></TooltipProvider>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                            <AlertDialogDescription>This will immediately disable the API key "{key.name}". Any integrations using this key will stop working.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevoke(key.id)}>Revoke</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Security info */}
        <Card className="border-muted">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong className="text-foreground">Key hashing:</strong> API keys are hashed with SHA-256 before storage — raw keys are never persisted.</p>
                <p><strong className="text-foreground">Rate limiting:</strong> Each key has a configurable rate limit enforced at the database level.</p>
                <p><strong className="text-foreground">IP allowlisting:</strong> Optionally restrict keys to specific IP addresses for RPA/service accounts.</p>
                <p><strong className="text-foreground">Auto-cleanup:</strong> API request logs are automatically purged after 30 days.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New key reveal dialog */}
      <Dialog open={!!newKeyVisible} onOpenChange={() => setNewKeyVisible(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5 text-primary" /> API Key Created</DialogTitle>
            <DialogDescription>Copy this key now — it won't be shown again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Input value={newKeyVisible || ''} readOnly className="font-mono text-xs pr-10" />
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => { navigator.clipboard.writeText(newKeyVisible || ''); toast.success('Copied!'); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Store this key securely. It cannot be retrieved after closing this dialog.</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKeyVisible(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Generate a scoped API key for an external integration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Name *</Label>
              <Input placeholder="e.g. SAP Production" value={formName} onChange={e => setFormName(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="What this key is used for..." value={formDescription} onChange={e => setFormDescription(e.target.value)} className="text-sm" rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Integration Type *</Label>
              <Select value={formIntegration} onValueChange={setFormIntegration}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select integration" /></SelectTrigger>
                <SelectContent>
                  {INTEGRATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Permissions *</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map(p => (
                  <div key={p.value} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs cursor-pointer border transition-colors ${formPermissions.includes(p.value) ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-border/80'}`}
                    onClick={() => togglePermission(p.value)}>
                    <Switch checked={formPermissions.includes(p.value)} onCheckedChange={() => togglePermission(p.value)} className="scale-75" />
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rate Limit</Label>
                <Badge variant="outline" className="text-[10px] font-mono">{formRateLimit} req/min</Badge>
              </div>
              <Slider value={[formRateLimit]} onValueChange={([v]) => setFormRateLimit(v)} min={10} max={500} step={10} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Expiry</Label>
                <Badge variant="outline" className="text-[10px] font-mono">{formExpiryDays} days</Badge>
              </div>
              <Slider value={[formExpiryDays]} onValueChange={([v]) => setFormExpiryDays(v)} min={7} max={365} step={7} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">IP Allowlist (optional)</Label>
              <Input placeholder="e.g. 10.0.0.1, 192.168.1.0/24" value={formIpWhitelist} onChange={e => setFormIpWhitelist(e.target.value)} className="text-sm" />
              <p className="text-[10px] text-muted-foreground">Comma-separated. Leave empty to allow all IPs.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              {creating ? 'Creating...' : 'Generate Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeyManagement;
