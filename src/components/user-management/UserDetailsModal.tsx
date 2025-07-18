import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  UserCheck, 
  Calendar,
  Shield,
  Briefcase,
  AlertCircle
} from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isFunctionalEmail?: boolean;
  personalEmail?: string;
  phone: string;
  company: string;
  role: string;
  discipline?: string;
  commission?: string;
  privileges: string[];
  status: string;
  associatedProjects: string[];
  pendingActions: number;
  createdAt: string;
}

interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const UserDetailsModal = ({ user, isOpen, onClose }: UserDetailsModalProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'inactive': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details - {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-gray-600">{user.role}</p>
                    <p className="text-sm text-gray-500">{user.company}</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Badge variant={getStatusColor(user.status) as any}>
                    {user.status.toUpperCase()}
                  </Badge>
                  {user.pendingActions > 0 && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{user.pendingActions} pending actions</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Primary Email</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm">{user.email}</p>
                    {user.isFunctionalEmail && (
                      <Badge variant="outline" className="text-xs">Functional</Badge>
                    )}
                  </div>
                </div>
                
                {user.personalEmail && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Personal Email</label>
                    <p className="text-sm">{user.personalEmail}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-sm">{user.phone || 'Not provided'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Member Since</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-sm">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role & Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Role & Company
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Company</label>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <p className="text-sm">{user.company}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-gray-400" />
                    <p className="text-sm">{user.role}</p>
                  </div>
                </div>
                
                {user.discipline && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Discipline</label>
                    <p className="text-sm">{user.discipline}</p>
                  </div>
                )}
                
                {user.commission && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Commission</label>
                    <p className="text-sm">{user.commission}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Associated Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Associated Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {user.associatedProjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.associatedProjects.map((project) => (
                    <Badge key={project} variant="secondary">
                      {project}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No associated projects</p>
              )}
            </CardContent>
          </Card>

          {/* Privileges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                User Privileges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.privileges.length > 0 ? (
                <ul className="space-y-2">
                  {user.privileges.map((privilege, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{privilege}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No privileges assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline">
              Edit User
            </Button>
            <Button variant="outline">
              Assign to Project
            </Button>
            {user.status === 'pending' && (
              <Button className="bg-green-600 hover:bg-green-700">
                Approve User
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;