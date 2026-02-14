import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Key, Eye, EyeOff, User, Lock } from 'lucide-react';
import { APICredentials, APIAuthType } from '@/lib/api-config-storage';

interface APIConfigStepProps {
  credentials: APICredentials;
  onChange: (credentials: APICredentials) => void;
}

export const APIConfigStep: React.FC<APIConfigStepProps> = ({ credentials, onChange }) => {
  const [showSecret, setShowSecret] = useState(false);

  const update = (field: keyof APICredentials, value: string) => {
    onChange({ ...credentials, [field]: value });
  };

  return (
    <div className="space-y-4 py-2">
      <div>
        <h3 className="text-sm font-medium text-foreground">API Configuration</h3>
        <p className="text-xs text-muted-foreground mt-1">Configure the direct API integration endpoint and authentication</p>
      </div>

      <div className="space-y-4">
        {/* Endpoint URL */}
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            Endpoint URL
          </Label>
          <Input
            type="url"
            value={credentials.endpointUrl}
            onChange={(e) => update('endpointUrl', e.target.value)}
            placeholder="https://api.example.com/v1"
            className="font-mono text-xs"
          />
        </div>

        {/* Auth Type */}
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            Authentication Type
          </Label>
          <Select
            value={credentials.authType}
            onValueChange={(v) => onChange({ ...credentials, authType: v as APIAuthType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="api_key">API Key</SelectItem>
              <SelectItem value="oauth">OAuth 2.0</SelectItem>
              <SelectItem value="basic_auth">Basic Authentication</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auth-specific fields */}
        {credentials.authType === 'api_key' && (
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-muted-foreground" />
              API Key
            </Label>
            <div className="relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={credentials.apiKey || ''}
                onChange={(e) => update('apiKey', e.target.value)}
                placeholder="Enter API key"
                autoComplete="off"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {credentials.authType === 'oauth' && (
          <>
            <div className="space-y-2">
              <Label className="text-sm">Client ID</Label>
              <Input
                value={credentials.clientId || ''}
                onChange={(e) => update('clientId', e.target.value)}
                placeholder="Enter client ID"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Client Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={credentials.clientSecret || ''}
                  onChange={(e) => update('clientSecret', e.target.value)}
                  placeholder="Enter client secret"
                  autoComplete="off"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}

        {credentials.authType === 'basic_auth' && (
          <>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Username
              </Label>
              <Input
                value={credentials.username || ''}
                onChange={(e) => update('username', e.target.value)}
                placeholder="Username"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={credentials.password || ''}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Password"
                  autoComplete="off"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
