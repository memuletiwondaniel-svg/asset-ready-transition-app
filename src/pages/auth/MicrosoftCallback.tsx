import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMicrosoftOAuth } from '@/hooks/useMicrosoftOAuth';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MicrosoftCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useMicrosoftOAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || error);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setErrorMessage('Missing authorization code or state');
        return;
      }

      try {
        await handleCallback(code, state);
        setStatus('success');
        
        // Close popup after short delay, or redirect if not in popup
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            navigate('/pssr');
          }
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to complete authentication');
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      navigate('/pssr');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Connecting to Microsoft</h2>
            <p className="text-muted-foreground">
              Please wait while we complete the authentication...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Connected Successfully!</h2>
            <p className="text-muted-foreground mb-4">
              Your Microsoft account has been connected. You can now send calendar invitations through Outlook.
            </p>
            <p className="text-sm text-muted-foreground">
              This window will close automatically...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
            <p className="text-muted-foreground mb-4">
              {errorMessage}
            </p>
            <Button onClick={handleClose}>
              Close
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
