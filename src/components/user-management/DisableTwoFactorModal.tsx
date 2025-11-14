import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DisableTwoFactorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisabled?: () => void;
}

export const DisableTwoFactorModal: React.FC<DisableTwoFactorModalProps> = ({
  open,
  onOpenChange,
  onDisabled
}) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  const handleDisable = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please sign in to disable 2FA.',
          variant: 'destructive'
        });
        return;
      }

      // Verify password before disabling 2FA
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password
      });

      if (signInError) {
        toast({
          title: 'Invalid Password',
          description: 'The password you entered is incorrect.',
          variant: 'destructive'
        });
        return;
      }

      // Disable 2FA
      const { error } = await supabase
        .from('profiles')
        .update({
          two_factor_secret: null,
          two_factor_enabled: false,
          two_factor_backup_codes: null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Two-factor authentication has been disabled.',
      });

      onDisabled?.();
      onOpenChange(false);
      setPassword('');
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable 2FA. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Disable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            This will remove the extra security layer from your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Disabling 2FA makes your account less secure. Please confirm with your password.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="password">Current Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDisable} 
            disabled={loading || !password}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disable 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
