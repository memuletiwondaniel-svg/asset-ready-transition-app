import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Flag, Plus, Building2, ToggleLeft, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TenantFeatureFlagsProps {
  onBack: () => void;
}

const AVAILABLE_FEATURES = [
  { key: 'ora_module', label: 'ORA Plans Module', description: 'Operational Readiness Assurance planning and tracking' },
  { key: 'p2a_module', label: 'P2A Handover Module', description: 'Project-to-Asset handover management' },
  { key: 'orm_module', label: 'ORM Module', description: 'Operational Readiness Manpower tracking' },
  { key: 'pssr_module', label: 'PSSR Module', description: 'Pre-Startup Safety Review management' },
  { key: 'vcr_module', label: 'VCR Module', description: 'Verification Certificate of Readiness' },
  { key: 'sof_module', label: 'SoF Module', description: 'Statement of Fitness certificates' },
  { key: 'training_module', label: 'Training Plans', description: 'ORA training plan management and tracking' },
  { key: 'ai_chat', label: 'AI Chat Assistant', description: 'AI-powered help and document analysis' },
  { key: 'bulk_upload', label: 'Bulk User Upload', description: 'CSV-based bulk user creation' },
  { key: 'advanced_reporting', label: 'Advanced Reporting', description: 'Extended analytics and custom report builder' },
  { key: 'api_integrations', label: 'API Integrations', description: 'SAP, Primavera P6, GoCompletions connectivity' },
  { key: 'sso_login', label: 'SSO / SAML Login', description: 'Enterprise single sign-on authentication' },
];

const TenantFeatureFlags: React.FC<TenantFeatureFlagsProps> = ({ onBack }) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFeatureKey, setNewFeatureKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch flags for selected tenant
  const { data: flags = [], isLoading: flagsLoading } = useQuery({
    queryKey: ['tenant-flags', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await supabase
        .from('tenant_feature_flags')
        .select('*')
        .eq('tenant_id', selectedTenantId)
        .order('feature_label');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTenantId,
  });

  // Toggle flag
  const toggleFlagMutation = useMutation({
    mutationFn: async ({ flagId, enabled }: { flagId: string; enabled: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('tenant_feature_flags')
        .update({
          is_enabled: enabled,
          enabled_at: enabled ? new Date().toISOString() : null,
          enabled_by: enabled ? user?.id : null,
        })
        .eq('id', flagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-flags', selectedTenantId] });
      toast.success('Feature flag updated');
    },
    onError: (err: any) => toast.error('Failed to update flag', { description: err.message }),
  });

  // Add feature flag
  const addFlagMutation = useMutation({
    mutationFn: async () => {
      const feature = AVAILABLE_FEATURES.find(f => f.key === newFeatureKey);
      if (!feature) throw new Error('Invalid feature');

      const { error } = await supabase
        .from('tenant_feature_flags')
        .insert({
          tenant_id: selectedTenantId,
          feature_key: feature.key,
          feature_label: feature.label,
          description: feature.description,
          is_enabled: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Feature flag added');
      setShowAddDialog(false);
      setNewFeatureKey('');
      queryClient.invalidateQueries({ queryKey: ['tenant-flags', selectedTenantId] });
    },
    onError: (err: any) => toast.error('Failed to add flag', { description: err.message }),
  });

  // Initialize all flags for a tenant
  const initAllFlagsMutation = useMutation({
    mutationFn: async () => {
      const existingKeys = flags.map(f => f.feature_key);
      const newFlags = AVAILABLE_FEATURES
        .filter(f => !existingKeys.includes(f.key))
        .map(f => ({
          tenant_id: selectedTenantId,
          feature_key: f.key,
          feature_label: f.label,
          description: f.description,
          is_enabled: true, // Enable all by default
        }));

      if (newFlags.length === 0) {
        toast.info('All features already configured');
        return;
      }

      const { error } = await supabase.from('tenant_feature_flags').insert(newFlags);
      if (error) throw error;
      return newFlags.length;
    },
    onSuccess: (count) => {
      if (count) toast.success(`${count} feature flags initialized (all enabled)`);
      queryClient.invalidateQueries({ queryKey: ['tenant-flags', selectedTenantId] });
    },
    onError: (err: any) => toast.error('Failed', { description: err.message }),
  });

  const filteredFlags = flags.filter(f =>
    !searchQuery || f.feature_label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Flag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Tenant Feature Flags</h1>
              <p className="text-sm text-muted-foreground">Enable or disable features per company/tenant</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tenant Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Select Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a company/tenant..." />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        {selectedTenantId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Features for {selectedTenant?.name}
                  </CardTitle>
                  <CardDescription>
                    {flags.filter(f => f.is_enabled).length}/{flags.length} features enabled
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => initAllFlagsMutation.mutate()}
                    disabled={initAllFlagsMutation.isPending}
                  >
                    <ToggleLeft className="h-4 w-4 mr-1" />
                    Initialize All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Flag
                  </Button>
                </div>
              </div>

              {flags.length > 5 && (
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter features..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 max-w-sm"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {flagsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : filteredFlags.length === 0 ? (
                <div className="text-center py-8">
                  <Flag className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {flags.length === 0
                      ? 'No feature flags configured for this tenant. Click "Initialize All" to set up all features.'
                      : 'No matching features found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        flag.is_enabled
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{flag.feature_label}</p>
                          <Badge
                            variant={flag.is_enabled ? 'default' : 'outline'}
                            className={flag.is_enabled ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}
                          >
                            {flag.is_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        {flag.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                        )}
                        {flag.enabled_at && flag.is_enabled && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Enabled {format(new Date(flag.enabled_at), 'PP')}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={flag.is_enabled}
                        onCheckedChange={(checked) =>
                          toggleFlagMutation.mutate({ flagId: flag.id, enabled: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Flag Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feature Flag</DialogTitle>
            <DialogDescription>Select a feature to add for {selectedTenant?.name}</DialogDescription>
          </DialogHeader>
          <Select value={newFeatureKey} onValueChange={setNewFeatureKey}>
            <SelectTrigger>
              <SelectValue placeholder="Select feature..." />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_FEATURES
                .filter(f => !flags.some(fl => fl.feature_key === f.key))
                .map(f => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={() => addFlagMutation.mutate()}
              disabled={!newFeatureKey || addFlagMutation.isPending}
            >
              Add Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantFeatureFlags;
