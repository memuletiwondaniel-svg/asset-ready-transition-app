
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, UserPlus } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('sso');
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
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-blue-600" />
            P2A System Access
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sso">SSO Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="sso" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Single Sign-On</CardTitle>
                <CardDescription>
                  For BGC and Kent employees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleSSOLogin('BGC')}
                >
                  <img src="/lovable-uploads/a89a5227-480d-4e3c-abc1-9c6c3ced9d5f.png" alt="BGC Logo" className="h-6 w-6 mr-2" />
                  Login with BGC
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleSSOLogin('Kent')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Login with Kent
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Standard Login</CardTitle>
                <CardDescription>
                  For registered external users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <Button className="w-full" onClick={handleRegularLogin}>
                  Login
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Request Access
                </CardTitle>
                <CardDescription>
                  Non-BGC/Kent users must register for approval
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <Button className="w-full" onClick={handleRegistration}>
                  Submit Registration
                </Button>
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    Approval required by BGC
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthenticationModal;
