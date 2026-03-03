import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, Shield, Save, RotateCcw, Info } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SessionTimeoutConfigProps {
  onBack: () => void;
}

interface Config {
  timeout_minutes: number;
  warning_minutes: number;
  enabled: boolean;
}

const PRESETS = [
  { label: '15 min', value: 15, desc: 'High security' },
  { label: '30 min', value: 30, desc: 'Recommended' },
  { label: '1 hour', value: 60, desc: 'Standard' },
  { label: '2 hours', value: 120, desc: 'Relaxed' },
];

const DEFAULT_CONFIG: Config = { timeout_minutes: 30, warning_minutes: 5, enabled: true };

const SessionTimeoutConfig: React.FC<SessionTimeoutConfigProps> = ({ onBack }) => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [original, setOriginal] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'session_timeout')
        .single();
      if (data?.value) {
        const c = data.value as unknown as Config;
        setConfig(c);
        setOriginal(c);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .update({ value: config as any })
      .eq('key', 'session_timeout');
    
    setSaving(false);
    if (error) {
      toast.error('Failed to save session timeout settings');
    } else {
      setOriginal(config);
      toast.success('Session timeout settings saved. Changes apply on next page load.');
    }
  };

  const handleReset = () => setConfig(original);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Session Timeout" favoritePath="/admin-tools/session-timeout" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Session Timeout Configuration
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure auto-logout for inactive sessions
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
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
        {/* Enable/Disable */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${config.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Session Timeout</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sign out users after inactivity
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

        {config.enabled && (
          <>
            {/* Quick Presets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Presets</CardTitle>
                <CardDescription className="text-xs">Select a common timeout duration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setConfig(prev => ({
                        ...prev,
                        timeout_minutes: preset.value,
                        warning_minutes: Math.min(prev.warning_minutes, Math.floor(preset.value / 2)),
                      }))}
                      className={`relative rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-sm ${
                        config.timeout_minutes === preset.value
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="text-sm font-semibold text-foreground">{preset.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{preset.desc}</div>
                      {preset.value === 30 && (
                        <Badge variant="secondary" className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0">
                          Default
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fine-tune Sliders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Fine-tune</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timeout Duration */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium">Inactivity Timeout</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-[200px]">
                            Users are signed out after this period of no mouse, keyboard, or touch activity.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono tabular-nums">
                      {config.timeout_minutes >= 60
                        ? `${Math.floor(config.timeout_minutes / 60)}h ${config.timeout_minutes % 60}m`
                        : `${config.timeout_minutes} min`}
                    </Badge>
                  </div>
                  <Slider
                    value={[config.timeout_minutes]}
                    onValueChange={([v]) => setConfig(prev => ({
                      ...prev,
                      timeout_minutes: v,
                      warning_minutes: Math.min(prev.warning_minutes, Math.floor(v / 2)),
                    }))}
                    min={5}
                    max={240}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5 min</span>
                    <span>4 hours</span>
                  </div>
                </div>

                <Separator />

                {/* Warning Duration */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium">Warning Before Logout</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-[200px]">
                            A countdown dialog appears this many minutes before auto-logout, giving users a chance to stay signed in.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono tabular-nums">
                      {config.warning_minutes} min
                    </Badge>
                  </div>
                  <Slider
                    value={[config.warning_minutes]}
                    onValueChange={([v]) => setConfig(prev => ({ ...prev, warning_minutes: v }))}
                    min={1}
                    max={Math.floor(config.timeout_minutes / 2)}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1 min</span>
                    <span>{Math.floor(config.timeout_minutes / 2)} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Session Timeline</CardTitle>
                <CardDescription className="text-xs">Visual preview of the session lifecycle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="bg-emerald-500/60 transition-all duration-300"
                      style={{ width: `${((config.timeout_minutes - config.warning_minutes) / config.timeout_minutes) * 100}%` }}
                    />
                    <div
                      className="bg-amber-500/60 transition-all duration-300"
                      style={{ width: `${(config.warning_minutes / config.timeout_minutes) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>Login</span>
                    <span className="text-amber-600 font-medium">
                      Warning at {config.timeout_minutes - config.warning_minutes}m
                    </span>
                    <span className="text-destructive font-medium">
                      Logout at {config.timeout_minutes}m
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionTimeoutConfig;
