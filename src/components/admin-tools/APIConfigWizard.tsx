import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Save, CheckCircle2, Plug, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  InterfaceMethod,
  APICredentials,
  APIConfig,
  getAPIConfig,
  saveAPIConfig,
} from '@/lib/api-config-storage';
import { InterfaceMethodStep } from './wizard-steps/InterfaceMethodStep';
import { APIConfigStep } from './wizard-steps/APIConfigStep';
import { TestConnectionStep } from './wizard-steps/TestConnectionStep';

interface PredefinedAPI {
  id: string;
  name: string;
  description: string;
  category: string;
  logo: string;
  scale?: number;
}

interface APIConfigWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: PredefinedAPI | null;
  onConfigured: (apiId: string) => void;
}

const DEFAULT_PORTAL_URLS: Record<string, string> = {
  gocompletions: 'https://goc.gotechnology.online/BGC/GoHub/Home.aspx',
};

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const APIConfigWizard: React.FC<APIConfigWizardProps> = ({
  open,
  onOpenChange,
  api,
  onConfigured,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [interfaceMethod, setInterfaceMethod] = useState<InterfaceMethod | null>(null);
  const [apiCredentials, setApiCredentials] = useState<APICredentials>({ endpointUrl: '', authType: 'api_key' });
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState('');

  // Load existing config when dialog opens
  useEffect(() => {
    if (open && api) {
      const existing = getAPIConfig(api.id);
      if (existing) {
        setInterfaceMethod(existing.interfaceMethod);
        if (existing.apiCredentials) setApiCredentials(existing.apiCredentials);
      } else {
        setInterfaceMethod(null);
        setApiCredentials({ endpointUrl: '', authType: 'api_key' });
      }
      setCurrentStep(1);
      setTestStatus('idle');
      setTestError('');
    }
  }, [open, api]);

  if (!api) return null;

  const totalSteps = 4;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return !!interfaceMethod;
      case 2:
        if (interfaceMethod === 'rpa') return !!rpaCredentials.username && !!rpaCredentials.password;
        if (interfaceMethod === 'api') return !!apiCredentials.endpointUrl;
        return false;
      case 3: return testStatus === 'success';
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 4) setTestStatus('idle');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestError('');
    // Simulate a test — in production this would call the edge function
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // For now, always succeed if credentials are present
    if (interfaceMethod === 'rpa' && rpaCredentials.username && rpaCredentials.password) {
      setTestStatus('success');
    } else if (interfaceMethod === 'api' && apiCredentials.endpointUrl) {
      setTestStatus('success');
    } else {
      setTestStatus('error');
      setTestError('Missing required credentials');
    }
  };

  const handleSave = () => {
    const config: APIConfig = {
      interfaceMethod: interfaceMethod!,
      rpaCredentials: interfaceMethod === 'rpa' ? rpaCredentials : undefined,
      apiCredentials: interfaceMethod === 'api' ? apiCredentials : undefined,
      configuredAt: new Date().toISOString(),
      status: 'configured',
    };
    saveAPIConfig(api.id, config);
    onConfigured(api.id);
    onOpenChange(false);
  };

  const steps = [
    { id: 1, title: 'Method' },
    { id: 2, title: 'Configure' },
    { id: 3, title: 'Test' },
    { id: 4, title: 'Save' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center bg-white rounded-lg border border-border/30 p-1.5">
              <img
                src={api.logo}
                alt={api.name}
                className="h-full max-w-full object-contain"
                style={api.scale ? { transform: `scale(${api.scale})` } : undefined}
              />
            </div>
            <div>
              <DialogTitle>Configure {api.name}</DialogTitle>
              <DialogDescription>{api.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 rounded-lg">
          {steps.map((step, index) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                      isCompleted && 'bg-emerald-500 text-white',
                      isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                      !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.id}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium',
                    isCurrent ? 'text-foreground' : isCompleted ? 'text-emerald-600' : 'text-muted-foreground'
                  )}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 max-w-16 mt-[-12px]',
                    isCompleted ? 'bg-emerald-500' : 'bg-muted'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[280px]">
          {currentStep === 1 && (
            <InterfaceMethodStep selected={interfaceMethod} onSelect={setInterfaceMethod} />
          )}
          {currentStep === 2 && interfaceMethod === 'rpa' && (
            <RPAConfigStep
              credentials={rpaCredentials}
              onChange={setRpaCredentials}
              defaultPortalUrl={DEFAULT_PORTAL_URLS[api.id]}
            />
          )}
          {currentStep === 2 && interfaceMethod === 'api' && (
            <APIConfigStep credentials={apiCredentials} onChange={setApiCredentials} />
          )}
          {currentStep === 3 && (
            <TestConnectionStep
              status={testStatus}
              errorMessage={testError}
              onTest={handleTestConnection}
              apiName={api.name}
            />
          )}
          {currentStep === 4 && (
            <div className="space-y-4 py-2">
              <div>
                <h3 className="text-sm font-medium text-foreground">Configuration Summary</h3>
                <p className="text-xs text-muted-foreground mt-1">Review and save your configuration</p>
              </div>
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Interface Method</span>
                  <Badge variant="outline" className="gap-1">
                    {interfaceMethod === 'rpa' ? <Bot className="h-3 w-3" /> : <Plug className="h-3 w-3" />}
                    {interfaceMethod === 'rpa' ? 'RPA' : 'API'}
                  </Badge>
                </div>
                {interfaceMethod === 'rpa' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Portal URL</span>
                      <span className="text-xs font-mono truncate max-w-[200px]">{rpaCredentials.portalUrl || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Username</span>
                      <span className="text-xs">{rpaCredentials.username}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Password</span>
                      <span className="text-xs">••••••••</span>
                    </div>
                  </>
                )}
                {interfaceMethod === 'api' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Endpoint</span>
                      <span className="text-xs font-mono truncate max-w-[200px]">{apiCredentials.endpointUrl || '—'}</span>
                    </div>
                    {apiCredentials.authType === 'oauth' && apiCredentials.tokenUrl && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Token URL</span>
                        <span className="text-xs font-mono truncate max-w-[200px]">{apiCredentials.tokenUrl}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Auth Type</span>
                      <span className="text-xs capitalize">{apiCredentials.authType.replace('_', ' ')}</span>
                    </div>
                    {apiCredentials.authType === 'sso' && (
                      <>
                        {apiCredentials.username && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Username</span>
                            <span className="text-xs truncate max-w-[200px]">{apiCredentials.username}</span>
                          </div>
                        )}
                        {apiCredentials.ssoProject && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Project</span>
                            <span className="text-xs truncate max-w-[200px]">{apiCredentials.ssoProject}</span>
                          </div>
                        )}
                        {apiCredentials.ssoDatabase && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Database</span>
                            <span className="text-xs truncate max-w-[200px]">{apiCredentials.ssoDatabase}</span>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Connection Test</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Passed
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep === totalSteps ? (
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save Configuration
            </Button>
          ) : (
            <Button size="sm" onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default APIConfigWizard;
