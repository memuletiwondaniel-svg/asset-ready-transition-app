import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import UserAuthenticationPage from '@/components/user-management/UserAuthenticationPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [completed, setCompleted] = useState(false);
  const token = searchParams.get('token');
  const action = searchParams.get('action');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Missing Authentication Token</h2>
              <p className="text-muted-foreground">
                No authentication token was provided in the URL.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Complete</h2>
              <p className="text-muted-foreground mb-4">
                The user authentication process has been completed successfully.
              </p>
              <Button onClick={() => window.close()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Close Window
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <UserAuthenticationPage 
      token={token} 
      onComplete={() => setCompleted(true)} 
    />
  );
};

export default AuthPage;