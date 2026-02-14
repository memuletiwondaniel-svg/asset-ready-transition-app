import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, Wifi } from 'lucide-react';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface TestConnectionStepProps {
  status: TestStatus;
  errorMessage?: string;
  onTest: () => void;
  apiName: string;
}

export const TestConnectionStep: React.FC<TestConnectionStepProps> = ({
  status,
  errorMessage,
  onTest,
  apiName,
}) => {
  return (
    <div className="space-y-4 py-2">
      <div>
        <h3 className="text-sm font-medium text-foreground">Test Connection</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Verify that ORSH can connect to {apiName} with the provided configuration
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 py-6">
        {status === 'idle' && (
          <>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Wifi className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Click below to test the connection
            </p>
            <Button onClick={onTest} className="min-w-[160px]">
              <Wifi className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </>
        )}

        {status === 'testing' && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
            </div>
            <p className="text-sm text-blue-600 font-medium">Testing connection...</p>
            <p className="text-xs text-muted-foreground">This may take a few seconds</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-sm text-emerald-600 font-medium">Connection successful!</p>
            <p className="text-xs text-muted-foreground">The configuration is valid. Click Next to save.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <p className="text-sm text-red-600 font-medium">Connection failed</p>
            {errorMessage && (
              <p className="text-xs text-red-500/80 text-center max-w-sm">{errorMessage}</p>
            )}
            <Button onClick={onTest} variant="outline" className="min-w-[160px]">
              Retry
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
