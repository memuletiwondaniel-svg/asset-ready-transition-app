import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, User } from 'lucide-react';
import P2ALogo from '@/components/P2ALogo';
import EnhancedCreateUserModal from '@/components/user-management/EnhancedCreateUserModal';
import { useUsers } from '@/hooks/useUsers';

interface AuthenticationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

const AuthenticationModal: React.FC<AuthenticationModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { addUser } = useUsers();

  const handleSSOLogin = (provider: string) => {
    console.log(`SSO Login with ${provider}`);
    // Check if user is from BGC or Kent for SSO access
    if (provider === 'BGC' || provider === 'Kent') {
      onAuthenticated();
    } else {
      alert('SSO access is only available for authorized company employees. Please use regular registration.');
    }
  };

  const handleRegularLogin = () => {
    // Simulate regular login
    if (formData.email && formData.password) {
      onAuthenticated();
    }
  };

  const handleCreateUser = (userData: any) => {
    addUser(userData);
    setShowRegistrationModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showRegistrationModal} onOpenChange={onClose}>
        <DialogContent className="max-w-sm fixed left-8 top-1/2 translate-x-0 translate-y-[-50%] z-[100]">
          <DialogHeader className="bg-white/80 backdrop-blur-sm rounded-lg p-3 mb-2">
            <DialogTitle className="flex items-center justify-center">
              <P2ALogo size={24} />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {loginMode === 'login' && (
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Single Sign-On</CardTitle>
                  <CardDescription className="text-sm">
                    For company employees
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full transition-all duration-200 hover:scale-105 hover:shadow-lg text-sm py-2" 
                    variant="secondary"
                    onClick={() => handleSSOLogin('BGC')}
                  >
                    <img src="/lovable-uploads/a89a5227-480d-4e3c-abc1-9c6c3ced9d5f.png" alt="BGC Logo" className="h-4 w-4 mr-2" />
                    Login with BGC
                  </Button>
                  <Button 
                    className="w-full transition-all duration-200 hover:scale-105 hover:shadow-lg text-sm py-2" 
                    variant="secondary"
                    onClick={() => handleSSOLogin('Kent')}
                  >
                    <img src="/lovable-uploads/08d85d46-7571-49db-977b-a806bd1c91e5.png" alt="Kent Logo" className="h-4 w-4 mr-2" />
                    Login with Kent
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className={`text-base ${loginMode === 'register' ? 'text-center font-bold text-blue-600' : ''}`}>
                  {loginMode === 'login' ? 'Standard Login' : 'New User Registration'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {loginMode === 'login' 
                    ? 'For registered external users or new user registration'
                    : ''
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loginMode === 'login' ? (
                  <>
                    <div>
                      <Label htmlFor="email" className="text-sm">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="your.email@company.com"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-sm">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="h-8"
                      />
                    </div>
                    <div className="flex justify-center mb-3">
                      <div className="flex gap-2 group">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRegularLogin()}
                          className="transition-all duration-300 hover:scale-105 hover:shadow-md transform border group-hover:group-hover:[&:not(:hover)]:opacity-60 text-sm py-1"
                        >
                          <User className="h-3 w-3 mr-1" />
                          Login
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLoginMode('register')}
                          className="transition-all duration-300 hover:scale-105 hover:shadow-md text-gray-500 bg-gray-100 hover:text-black hover:bg-gray-300 transform border hover:group-hover:[&~button]:opacity-60 text-sm py-1"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Register
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center space-y-4">
                      <p className="text-sm text-gray-600">
                        Create your P2A account with detailed information and project associations.
                      </p>
                      <Button 
                        className="w-full flex flex-col py-1 leading-tight transition-all duration-300 hover:scale-105 hover:shadow-md text-sm h-auto" 
                        onClick={() => setShowRegistrationModal(true)}
                      >
                        <span>Create Your Account</span>
                        <span className="text-[8px] opacity-75 -mt-0.5">approval required by BGC</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full transition-all duration-300 hover:scale-105 hover:shadow-md text-gray-500 bg-gray-100 hover:text-white hover:bg-primary transform border text-sm py-1"
                        onClick={() => setLoginMode('login')}
                      >
                        <User className="h-3 w-3 mr-1" />
                        Return to Login Menu
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
      
      <EnhancedCreateUserModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onCreateUser={handleCreateUser}
        isAdminCreated={false}
      />
    </>
  );
};

export default AuthenticationModal;
