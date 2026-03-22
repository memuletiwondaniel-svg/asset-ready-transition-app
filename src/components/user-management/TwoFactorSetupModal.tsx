import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TwoFactorSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetupComplete?: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  open,
  onOpenChange,
  onSetupComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open && step === 'setup') {
      initializeSetup();
    }
  }, [open, step]);

  const initializeSetup = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please sign in to set up 2FA.',
          variant: 'destructive'
        });
        return;
      }

      setUserEmail(user.email || '');

      // Generate a new secret
      const newSecret = authenticator.generateSecret();
      setSecret(newSecret);

      // Generate OTP Auth URL for QR code
      const otpauthUrl = authenticator.keyuri(
        user.email || 'user',
        'ORSH',
        newSecret
      );

      // Generate QR code
      const qrCode = await QRCode.toDataURL(otpauthUrl);
      setQrCodeUrl(qrCode);
    } catch (error: any) {
      console.error('Error initializing 2FA setup:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize 2FA setup.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);

      // Verify the code
      const isValid = authenticator.verify({
        token: verificationCode,
        secret: secret
      });

      if (!isValid) {
        toast({
          title: 'Invalid Code',
          description: 'The verification code is incorrect. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      // Generate backup codes
      const codes = generateBackupCodes(8);
      setBackupCodes(codes);
      
      setStep('backup');
    } catch (error: any) {
      console.error('Error verifying 2FA code:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify code. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = (count: number): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      // Store encrypted secret + backup codes via edge function
      const { error } = await supabase.functions.invoke('setup-totp', {
        body: { secret, backupCodes }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Two-factor authentication has been enabled successfully.',
      });

      onSetupComplete?.();
      onOpenChange(false);
      
      // Reset state
      setStep('setup');
      setSecret('');
      setQrCodeUrl('');
      setVerificationCode('');
      setBackupCodes([]);
    } catch (error: any) {
      console.error('Error completing 2FA setup:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable 2FA. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard.',
    });
  };

  const copyAllBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'All backup codes copied to clipboard.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'setup' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Set Up Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Add an extra layer of security to your account using an authenticator app.
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Scan the QR code below with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col items-center space-y-4">
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 border rounded" />
                  )}

                  <div className="w-full space-y-2">
                    <Label>Or enter this code manually:</Label>
                    <div className="flex gap-2">
                      <Input
                        value={secret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(secret)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep('verify')} disabled={loading || !secret}>
                Next
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'verify' && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Your Authenticator</DialogTitle>
              <DialogDescription>
                Enter the 6-digit code from your authenticator app to verify the setup.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('setup')}>
                Back
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={loading || verificationCode.length !== 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'backup' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Save Your Backup Codes
              </DialogTitle>
              <DialogDescription>
                Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Each backup code can only be used once. Keep them secure!
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Backup Codes</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllBackupCodes}
                  >
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    Copy All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="text-center p-2 bg-background rounded">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleComplete} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
