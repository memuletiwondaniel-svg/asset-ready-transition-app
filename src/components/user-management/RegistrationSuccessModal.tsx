import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  isAdminCreated?: boolean;
}

const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  isAdminCreated = false
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-xl text-center">
            {isAdminCreated ? 'User Created Successfully!' : 'Request Submitted Successfully!'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isAdminCreated ? (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                The user account has been created and login credentials have been sent to:
              </p>
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium">{userEmail}</span>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                Your registration request has been submitted for review.
              </p>
              
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  If your request is approved, login credentials will be sent to your email address. 
                  You will receive a notification once the authenticator has reviewed your request.
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium">{userEmail}</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Please check your email regularly for updates on your request status.
              </p>
            </div>
          )}
          
          <Button 
            onClick={onClose} 
            className="w-full mt-6"
            size="lg"
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationSuccessModal;