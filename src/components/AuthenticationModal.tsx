
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, User } from 'lucide-react';
import P2ALogo from '@/components/P2ALogo';

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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    role: '',
    justification: ''
  });

  const handleSSOLogin = (provider: string) => {
    // Simulate SSO login
    console.log(`SSO Login with ${provider}`);
    onAuthenticated();
  };

  const handleRegularLogin = () => {
    // Simulate regular login
    if (formData.email && formData.password) {
      onAuthenticated();
    }
  };

  const handleRegistration = () => {
    // Simulate registration
    if (formData.email && formData.name && formData.company) {
      alert('Registration submitted. A BGC representative will review your request.');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-2">
          <DialogTitle className="flex items-center justify-center">
            <P2ALogo size={32} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Single Sign-On</CardTitle>
              <CardDescription>
                For BGC and Kent employees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full transition-all duration-200 hover:scale-105 hover:shadow-lg" 
                variant="secondary"
                onClick={() => handleSSOLogin('BGC')}
              >
                <img src="/lovable-uploads/a89a5227-480d-4e3c-abc1-9c6c3ced9d5f.png" alt="BGC Logo" className="h-6 w-6 mr-2" />
                Login with BGC
              </Button>
              <Button 
                className="w-full transition-all duration-200 hover:scale-105 hover:shadow-lg" 
                variant="secondary"
                onClick={() => handleSSOLogin('Kent')}
              >
                <img src="/lovable-uploads/08d85d46-7571-49db-977b-a806bd1c91e5.png" alt="Kent Logo" className="h-6 w-6 mr-2" />
                Login with Kent
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Standard Login</CardTitle>
              <CardDescription>
                For registered external users or new user registration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loginMode === 'login' ? (
                <>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="your.email@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  <div className="flex justify-center mb-4">
                    <div className="bg-gray-100 p-1 rounded-lg">
                      <Button
                        variant={loginMode === 'login' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setLoginMode('login')}
                        className="mr-1"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Login
                      </Button>
                      <Button
                        variant={loginMode === 'register' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setLoginMode('register')}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Register
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-email">Email Address</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="john.doe@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      placeholder="Company Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role/Position</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      placeholder="e.g., Safety Engineer"
                    />
                  </div>
                  <div>
                    <Label htmlFor="justification">Access Justification</Label>
                    <Input
                      id="justification"
                      value={formData.justification}
                      onChange={(e) => setFormData({...formData, justification: e.target.value})}
                      placeholder="Reason for needing P2A access"
                    />
                  </div>
                  <div className="flex justify-center mb-4">
                    <div className="bg-gray-100 p-1 rounded-lg">
                      <Button
                        variant={loginMode === 'login' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setLoginMode('login')}
                        className="mr-1"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Login
                      </Button>
                      <Button
                        variant={loginMode === 'register' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setLoginMode('register')}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Register
                      </Button>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleRegistration}>
                    Submit Registration
                  </Button>
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      Approval required by BGC
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthenticationModal;
