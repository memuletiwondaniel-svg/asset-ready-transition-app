import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Shield, Info, Copy, CheckCircle, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { useTenantSSOConfigAdmin } from '@/hooks/useTenantSSOConfig';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';

interface SSOConfigurationProps {
  onBack: () => void;
}

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'kgnrjqjbonuvpxxfvfjq';

export const SSOConfiguration: React.FC<SSOConfigurationProps> = ({ onBack }) => {
  const { tenant, tenantId } = useTenant();
  const { ssoConfig, isLoading, saveSSOConfig, isSaving } = useTenantSSOConfigAdmin(tenantId);

  const [formData, setFormData] = useState({
    provider_type: 'saml' as 'saml' | 'oidc',
    display_name: 'Company SSO',
    button_label: 'Sign in with SSO',
    idp_entity_id: '',
    idp_sso_url: '',
    idp_metadata_url: '',
    idp_certificate: '',
    is_active: false,
    sso_enforcement: 'disabled' as string,
  });

  useEffect(() => {
    if (ssoConfig) {
      setFormData({
        provider_type: (ssoConfig.provider_type as 'saml' | 'oidc') || 'saml',
        display_name: ssoConfig.display_name || 'Company SSO',
        button_label: ssoConfig.button_label || 'Sign in with SSO',
        idp_entity_id: ssoConfig.idp_entity_id || '',
        idp_sso_url: ssoConfig.idp_sso_url || '',
        idp_metadata_url: ssoConfig.idp_metadata_url || '',
        idp_certificate: ssoConfig.idp_certificate || '',
        is_active: ssoConfig.is_active,
        sso_enforcement: 'disabled',
      });
    }
  }, [ssoConfig]);

  const handleSave = () => {
    if (!tenantId) return;
    saveSSOConfig({
      tenant_id: tenantId,
      provider_type: formData.provider_type,
      display_name: formData.display_name,
      button_label: formData.button_label,
      idp_entity_id: formData.idp_entity_id || null,
      idp_sso_url: formData.idp_sso_url || null,
      idp_metadata_url: formData.idp_metadata_url || null,
      idp_certificate: formData.idp_certificate || null,
      is_active: formData.is_active,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const acsUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/auth/v1/sso/saml/acs`;
  const entityId = `https://${SUPABASE_PROJECT_ID}.supabase.co/auth/v1/sso/saml/metadata`;

  const isConfigured = !!(formData.idp_entity_id && formData.idp_sso_url);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SSO Configuration</h1>
              <p className="text-sm text-muted-foreground">
                Configure Single Sign-On for {tenant?.name || 'your organization'}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {ssoConfig?.is_configured ? (
              <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle className="h-3 w-3 mr-1" /> Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                <AlertTriangle className="h-3 w-3 mr-1" /> Not Configured
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Service Provider Info — what to give to IT */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Service Provider Details
              </CardTitle>
              <CardDescription>
                Provide these details to your IT team when configuring the Identity Provider (Azure AD, Okta, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">ACS (Assertion Consumer Service) URL</Label>
                <div className="flex items-center gap-2">
                  <Input value={acsUrl} readOnly className="font-mono text-xs bg-muted/50" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(acsUrl, 'ACS URL')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Entity ID (Audience URI)</Label>
                <div className="flex items-center gap-2">
                  <Input value={entityId} readOnly className="font-mono text-xs bg-muted/50" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(entityId, 'Entity ID')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SSO Provider Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identity Provider Configuration</CardTitle>
              <CardDescription>
                Enter the details provided by your IT team after they configure the Identity Provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select
                    value={formData.provider_type}
                    onValueChange={(v) => setFormData({ ...formData, provider_type: v as 'saml' | 'oidc' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saml">SAML 2.0</SelectItem>
                      <SelectItem value="oidc">OpenID Connect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SSO Enforcement</Label>
                  <Select
                    value={formData.sso_enforcement}
                    onValueChange={(v) => setFormData({ ...formData, sso_enforcement: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="optional">Optional (SSO + Password)</SelectItem>
                      <SelectItem value="required">Required (SSO Only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>IdP Metadata URL <span className="text-muted-foreground text-xs">(recommended)</span></Label>
                <Input
                  placeholder="https://login.microsoftonline.com/{tenant-id}/federationmetadata/2007-06/federationmetadata.xml"
                  value={formData.idp_metadata_url}
                  onChange={(e) => setFormData({ ...formData, idp_metadata_url: e.target.value })}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  If provided, entity ID, SSO URL, and certificate are auto-populated from the metadata.
                </p>
              </div>

              <div className="space-y-2">
                <Label>IdP Entity ID <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="https://sts.windows.net/{tenant-id}/"
                  value={formData.idp_entity_id}
                  onChange={(e) => setFormData({ ...formData, idp_entity_id: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>IdP SSO URL <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="https://login.microsoftonline.com/{tenant-id}/saml2"
                  value={formData.idp_sso_url}
                  onChange={(e) => setFormData({ ...formData, idp_sso_url: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>IdP x509 Certificate</Label>
                <Textarea
                  placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDpDCCAoy...&#10;-----END CERTIFICATE-----"
                  value={formData.idp_certificate}
                  onChange={(e) => setFormData({ ...formData, idp_certificate: e.target.value })}
                  className="font-mono text-xs min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Login Page Display</CardTitle>
              <CardDescription>
                Customize how SSO appears on the login page for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="Company SSO"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Button Label</Label>
                  <Input
                    placeholder="Sign in with SSO"
                    value={formData.button_label}
                    onChange={(e) => setFormData({ ...formData, button_label: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable SSO</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    When enabled, the SSO button will appear on the login page
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  disabled={!isConfigured}
                />
              </div>
              {!isConfigured && formData.is_active && (
                <p className="text-xs text-destructive">
                  SSO cannot be enabled until Entity ID and SSO URL are configured.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SSOConfiguration;
