import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, User, Lock, Eye, EyeOff } from 'lucide-react';
import { RPACredentials } from '@/lib/api-config-storage';

interface RPAConfigStepProps {
  credentials: RPACredentials;
  onChange: (credentials: RPACredentials) => void;
  defaultPortalUrl?: string;
}

export const RPAConfigStep: React.FC<RPAConfigStepProps> = ({
  credentials,
  onChange,
  defaultPortalUrl = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const update = (field: keyof RPACredentials, value: string) => {
    onChange({ ...credentials, [field]: value });
  };

  return (
    <div className="space-y-4 py-2">
      <div>
        <h3 className="text-sm font-medium text-foreground">RPA Configuration</h3>
        <p className="text-xs text-muted-foreground mt-1">Enter the portal credentials for robotic process automation</p>
      </div>

      <div className="space-y-4">
        {/* Portal URL */}
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            Portal URL
          </Label>
          <Input
            type="url"
            value={credentials.portalUrl}
            onChange={(e) => update('portalUrl', e.target.value)}
            placeholder={defaultPortalUrl || 'https://...'}
            className="font-mono text-xs"
          />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Username
          </Label>
          <Input
            type="email"
            value={credentials.username}
            onChange={(e) => update('username', e.target.value)}
            placeholder="user@company.com"
            autoComplete="off"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            Password
          </Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
