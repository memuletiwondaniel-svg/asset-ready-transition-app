import React from 'react';
import { useMicrosoftOAuth } from '@/hooks/useMicrosoftOAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Check, AlertTriangle, Unlink } from 'lucide-react';

export const MicrosoftConnectionSettings: React.FC = () => {
  const {
    isConnected,
    isExpired,
    isCheckingStatus,
    isConnecting,
    connect,
    disconnect,
    isDisconnecting,
  } = useMicrosoftOAuth();

  if (isCheckingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Microsoft Outlook
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-muted-foreground">Checking connection status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0078d4]/10">
              <Calendar className="w-5 h-5 text-[#0078d4]" />
            </div>
            <div>
              <CardTitle className="text-lg">Microsoft Outlook</CardTitle>
              <CardDescription>
                Send walkdown invitations directly through Outlook and track RSVP responses
              </CardDescription>
            </div>
          </div>
          {isConnected && (
            <Badge variant={isExpired ? "destructive" : "default"} className="gap-1">
              {isExpired ? (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Expired
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  Connected
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Connecting your Microsoft account enables:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Create calendar events directly in Outlook</li>
                <li>Track attendee RSVP status in real-time</li>
                <li>Two-way sync between ORSH and Outlook</li>
                <li>Automatic event updates when walkdown details change</li>
              </ul>
            </div>
            <Button
              onClick={connect}
              disabled={isConnecting}
              className="w-full sm:w-auto"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Microsoft Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Your Microsoft account is connected</span>
              </div>
              {isExpired && (
                <p className="text-sm text-amber-600 mt-2">
                  Your session has expired. Please reconnect to continue using Outlook integration.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {isExpired && (
                <Button
                  onClick={connect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    'Reconnect'
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => disconnect()}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
