import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Webhook, Plus, Shield, Trash2, Copy, CheckCircle, XCircle, Loader2, Info, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface WebhookSecurityProps {
  onBack: () => void;
}

interface WebhookRecord {
  id: string;
  name: string;
  source_system: string;
  endpoint_path: string;
  signing_algorithm: string;
  header_name: string;
  is_active: boolean;
  last_received_at: string | null;
  total_received: number;
  total_verified: number;
  total_failed: number;
  created_at: string;
}

const SOURCE_SYSTEMS = [
  { value: 'sap', label: 'SAP S/4HANA' },
  { value: 'primavera', label: 'Primavera P6' },
  { value: 'gocompletions', label: 'GoCompletions' },
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'azure_devops', label: 'Azure DevOps' },
  { value: 'custom', label: 'Custom' },
];

const generateSecret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = 'whsec_';
  for (let i = 0; i < 32; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
  return secret;
};

const hashSecret = async (secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const WebhookSecurity: React.FC<WebhookSecurityProps> = ({ onBack }) => {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formAlgorithm, setFormAlgorithm] = useState('sha256');
  const [formHeaderName, setFormHeaderName] = useState('X-Webhook-Signature');

  const fetchWebhooks = useCallback(async () => {
    const { data, error } = await supabase.from('webhook_configs' as any).select('*').order('created_at', { ascending: false });
    if (!error && data) setWebhooks(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const handleCreate = async () => {
    if (!formName || !formSource || !formEndpoint) {
      toast.error('Name, source system, and endpoint path are required');
      return;
    }
    setCreating(true);
    const rawSecret = generateSecret();
    const secretHash = await hashSecret(rawSecret);
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase.from('webhook_configs' as any).insert({
      name: formName,
      source_system: formSource,
      endpoint_path: formEndpoint,
      signing_secret_hash: secretHash,
      signing_algorithm: formAlgorithm,
      header_name: formHeaderName,
      created_by: user.user?.id,
    } as any);

    setCreating(false);
    if (error) {
      toast.error('Failed to create webhook configuration');
    } else {
      setRevealedSecret(rawSecret);
      setShowCreate(false);
      setFormName(''); setFormSource(''); setFormEndpoint('');
      setFormAlgorithm('sha256'); setFormHeaderName('X-Webhook-Signature');
      fetchWebhooks();
      toast.success('Webhook configured');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('webhook_configs' as any).update({ is_active: false } as any).eq('id', id);
    if (error) toast.error('Failed to disable webhook');
    else { toast.success('Webhook disabled'); fetchWebhooks(); }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Webhook Security" favoritePath="/admin-tools/webhook-security" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                Webhook Security
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure HMAC signature verification for incoming webhooks
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Webhook
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        {/* How it works */}
        <Card className="border-muted">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong className="text-foreground">HMAC Signature Verification</strong> ensures incoming webhooks are authentic and untampered.</p>
                <p>When configured, each incoming request must include a signature header computed as <code className="bg-muted px-1 rounded">HMAC-SHA256(body, secret)</code>. Requests without valid signatures are rejected.</p>
                <p>Share the signing secret with the external system — they'll use it to sign outgoing payloads.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {webhooks.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Webhook className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No webhooks configured</p>
            <p className="text-xs text-muted-foreground mt-1">Add a webhook to enable signature verification for incoming payloads</p>
          </CardContent></Card>
        ) : (
          webhooks.map(wh => (
            <Card key={wh.id} className={!wh.is_active ? 'opacity-60' : ''}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{wh.name}</span>
                      <Badge variant={wh.is_active ? 'outline' : 'destructive'} className="text-[10px]">
                        {wh.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {SOURCE_SYSTEMS.find(s => s.value === wh.source_system)?.label || wh.source_system}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{wh.endpoint_path}</span>
                      <span>Algorithm: {wh.signing_algorithm.toUpperCase()}</span>
                      <span>Header: {wh.header_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px]">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        Total: {(wh.total_received || 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" /> {(wh.total_verified || 0).toLocaleString()} verified
                      </span>
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-3 w-3" /> {(wh.total_failed || 0).toLocaleString()} failed
                      </span>
                      {wh.last_received_at && (
                        <span className="text-muted-foreground">
                          Last received {formatDistanceToNow(new Date(wh.last_received_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  {wh.is_active && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disable Webhook</AlertDialogTitle>
                          <AlertDialogDescription>This will stop verifying signatures for "{wh.name}". Incoming requests will be rejected.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(wh.id)}>Disable</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Secret reveal dialog */}
      <Dialog open={!!revealedSecret} onOpenChange={() => setRevealedSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Signing Secret</DialogTitle>
            <DialogDescription>Share this secret with the external system. It won't be shown again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Input value={revealedSecret || ''} readOnly className="font-mono text-xs pr-10" />
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => { navigator.clipboard.writeText(revealedSecret || ''); toast.success('Copied!'); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Store this secret securely and configure it in the external system's webhook settings.</span>
            </div>
          </div>
          <DialogFooter><Button onClick={() => setRevealedSecret(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Webhook</DialogTitle>
            <DialogDescription>Set up HMAC signature verification for an incoming webhook</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Name *</Label>
              <Input placeholder="e.g. SAP Material Updates" value={formName} onChange={e => setFormName(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Source System *</Label>
              <Select value={formSource} onValueChange={setFormSource}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {SOURCE_SYSTEMS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Endpoint Path *</Label>
              <Input placeholder="e.g. /webhooks/sap-materials" value={formEndpoint} onChange={e => setFormEndpoint(e.target.value)} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Algorithm</Label>
                <Select value={formAlgorithm} onValueChange={setFormAlgorithm}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sha256">HMAC-SHA256</SelectItem>
                    <SelectItem value="sha512">HMAC-SHA512</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Signature Header</Label>
                <Input value={formHeaderName} onChange={e => setFormHeaderName(e.target.value)} className="text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
              {creating ? 'Creating...' : 'Generate & Configure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebhookSecurity;
