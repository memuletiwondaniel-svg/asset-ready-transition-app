import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Save,
  ArrowLeft,
  ArrowRight,
  Search,
  Shield,
  Building,
  Briefcase,
  Target,
  Settings
} from 'lucide-react';

interface PSSRData {
  reason?: string;
  plant?: string;
  projectId?: string;
  projectName?: string;
  asset?: string;
}

interface Approver {
  id: string;
  name: string;
  title: string;
  email: string;
  avatar: string;
  level: 1 | 2 | 3;
  role: string;
  required: boolean;
  status: 'pending' | 'approved' | 'declined';
}

interface PSSRStepThreeProps {
  data: PSSRData;
  onDataUpdate: (stepData: any) => void;
  onNext: () => void;
  onBack: () => void;
  onSave: () => void;
}

const PSSRStepThree: React.FC<PSSRStepThreeProps> = ({ 
  data, 
  onDataUpdate, 
  onNext, 
  onBack, 
  onSave 
}) => {
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  // Mock user data for approver selection
  const mockUsers = [
    { id: '1', name: 'Ahmed Al-Rashid', title: 'PSSR Lead', email: 'ahmed.alrashid@company.com', avatar: '/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png' },
    { id: '2', name: 'Sarah Johnson', title: 'Project Manager', email: 'sarah.johnson@company.com', avatar: '/lovable-uploads/b229716e-e39e-41cb-91d3-2c30dd517fa8.png' },
    { id: '3', name: 'Omar Hassan', title: 'Plant Director - KAZ', email: 'omar.hassan@company.com', avatar: '/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png' },
    { id: '4', name: 'Maria Garcia', title: 'Engineering Manager (P&E)', email: 'maria.garcia@company.com', avatar: '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png' },
    { id: '5', name: 'John Smith', title: 'Engineering Manager (Asset)', email: 'john.smith@company.com', avatar: '/lovable-uploads/f183d942-af72-43b6-8db2-66997da17688.png' },
    { id: '6', name: 'Dr. Lisa Chen', title: 'Project & Engineering Director', email: 'lisa.chen@company.com', avatar: '/lovable-uploads/2a2a9f93-6c5a-4520-b802-82ee00f3a43c.png' },
    { id: '7', name: 'Mohammed Al-Basri', title: 'Production & Maintenance Director', email: 'mohammed.albasri@company.com', avatar: '/lovable-uploads/30a2a118-1d3d-4475-a504-cba628119b02.png' },
    { id: '8', name: 'Elena Petrov', title: 'HSE Director', email: 'elena.petrov@company.com', avatar: '/lovable-uploads/35226e03-6fa5-44db-a5ba-2677ed7dcaaf.png' }
  ];

  // Auto-assign default approvers based on PSSR reason
  useEffect(() => {
    const defaultApprovers = getDefaultApprovers();
    setApprovers(defaultApprovers);
  }, [data.reason, data.plant, data.projectId]);

  const getDefaultApprovers = (): Approver[] => {
    const baseApprovers: Approver[] = [];
    
    // Level 1: PSSR Lead (always required)
    baseApprovers.push({
      id: '1',
      name: 'Ahmed Al-Rashid',
      title: 'PSSR Lead',
      email: 'ahmed.alrashid@company.com',
      avatar: '/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png',
      level: 1,
      role: 'PSSR Lead',
      required: true,
      status: 'pending'
    });

    // Level 2 Approvers
    // Project Manager (only for new asset commissioning)
    if (data.reason === 'Start-up or Commissioning of a new Asset') {
      baseApprovers.push({
        id: '2',
        name: 'Sarah Johnson',
        title: 'Project Manager',
        email: 'sarah.johnson@company.com',
        avatar: '/lovable-uploads/b229716e-e39e-41cb-91d3-2c30dd517fa8.png',
        level: 2,
        role: 'Project Manager',
        required: true,
        status: 'pending'
      });
    }

    // Plant Director (based on plant/asset)
    const plantDirector = getPlantDirector(data.plant || data.asset);
    if (plantDirector) {
      baseApprovers.push(plantDirector);
    }

    // Engineering Managers
    baseApprovers.push(
      {
        id: '4',
        name: 'Maria Garcia',
        title: 'Engineering Manager (P&E)',
        email: 'maria.garcia@company.com',
        avatar: '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png',
        level: 2,
        role: 'Engineering Manager (P&E)',
        required: true,
        status: 'pending'
      },
      {
        id: '5',
        name: 'John Smith',
        title: 'Engineering Manager (Asset)',
        email: 'john.smith@company.com',
        avatar: '/lovable-uploads/f183d942-af72-43b6-8db2-66997da17688.png',
        level: 2,
        role: 'Engineering Manager (Asset)',
        required: true,
        status: 'pending'
      }
    );

    // Level 3 Approvers (Directors)
    baseApprovers.push(
      {
        id: '6',
        name: 'Dr. Lisa Chen',
        title: 'Project & Engineering Director',
        email: 'lisa.chen@company.com',
        avatar: '/lovable-uploads/2a2a9f93-6c5a-4520-b802-82ee00f3a43c.png',
        level: 3,
        role: 'Project & Engineering Director',
        required: true,
        status: 'pending'
      },
      {
        id: '7',
        name: 'Mohammed Al-Basri',
        title: 'Production & Maintenance Director',
        email: 'mohammed.albasri@company.com',
        avatar: '/lovable-uploads/30a2a118-1d3d-4475-a504-cba628119b02.png',
        level: 3,
        role: 'Production & Maintenance Director',
        required: true,
        status: 'pending'
      },
      {
        id: '8',
        name: 'Elena Petrov',
        title: 'HSE Director',
        email: 'elena.petrov@company.com',
        avatar: '/lovable-uploads/35226e03-6fa5-44db-a5ba-2677ed7dcaaf.png',
        level: 3,
        role: 'HSE Director',
        required: true,
        status: 'pending'
      }
    );

    return baseApprovers;
  };

  const getPlantDirector = (plant?: string): Approver | null => {
    if (!plant) return null;
    
    // Return appropriate plant director based on plant
    return {
      id: '3',
      name: 'Omar Hassan',
      title: `Plant Director - ${plant}`,
      email: 'omar.hassan@company.com',
      avatar: '/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png',
      level: 2,
      role: 'Plant Director',
      required: true,
      status: 'pending'
    };
  };

  const getApproversByLevel = (level: 1 | 2 | 3) => {
    return approvers.filter(approver => approver.level === level);
  };

  const getLevelIcon = (level: 1 | 2 | 3) => {
    switch (level) {
      case 1: return <Shield className="h-5 w-5 text-blue-600" />;
      case 2: return <Building className="h-5 w-5 text-green-600" />;
      case 3: return <Briefcase className="h-5 w-5 text-purple-600" />;
    }
  };

  const getLevelColor = (level: 1 | 2 | 3) => {
    switch (level) {
      case 1: return 'border-l-blue-500 bg-blue-50';
      case 2: return 'border-l-green-500 bg-green-50';
      case 3: return 'border-l-purple-500 bg-purple-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'declined': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const handleAddApprover = () => {
    if (!selectedUser) {
      toast({ title: 'Please select a user', variant: 'destructive' });
      return;
    }

    const user = mockUsers.find(u => u.id === selectedUser);
    if (!user) return;

    const newApprover: Approver = {
      id: user.id,
      name: user.name,
      title: user.title,
      email: user.email,
      avatar: user.avatar,
      level: selectedLevel,
      role: user.title,
      required: false,
      status: 'pending'
    };

    setApprovers(prev => [...prev, newApprover]);
    setShowAddModal(false);
    setSelectedUser('');
    setSearchTerm('');
    
    toast({ title: 'Approver added successfully' });
  };

  const handleRemoveApprover = (approverId: string) => {
    const approver = approvers.find(a => a.id === approverId);
    if (approver?.required) {
      toast({ title: 'Cannot remove required approver', variant: 'destructive' });
      return;
    }

    setApprovers(prev => prev.filter(a => a.id !== approverId));
    toast({ title: 'Approver removed' });
  };

  const filteredUsers = mockUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.title.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(user => !approvers.some(approver => approver.id === user.id));

  const handleFinalizePSSR = () => {
    onDataUpdate({ approvers, finalized: true });
    setShowFinalizeModal(false);
    toast({ 
      title: 'PSSR Finalized', 
      description: 'The PSSR is now ready for checklist completion and scheduling.' 
    });
    onNext();
  };

  const getApprovalStats = () => {
    const level1Count = getApproversByLevel(1).length;
    const level2Count = getApproversByLevel(2).length;
    const level3Count = getApproversByLevel(3).length;
    const total = approvers.length;
    
    return { level1Count, level2Count, level3Count, total };
  };

  const stats = getApprovalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-purple-500 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-purple-600" />
            <div>
              <h3 className="font-semibold text-purple-900">PSSR Approval Workflow</h3>
              <p className="text-sm text-purple-700">
                Default approvers have been assigned based on your PSSR reason. Review and modify as needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.level1Count}</div>
            <div className="text-sm text-gray-600">Level 1</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.level2Count}</div>
            <div className="text-sm text-gray-600">Level 2</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.level3Count}</div>
            <div className="text-sm text-gray-600">Level 3</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Approvers</div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Levels */}
      <div className="space-y-6">
        {[1, 2, 3].map(level => {
          const levelApprovers = getApproversByLevel(level as 1 | 2 | 3);
          const levelDescription = {
            1: 'PSSR Lead approval signifies that the PSSR has been successfully completed with no pending actions.',
            2: 'Level 2 approval commences only after Level 1 approval and includes operational and engineering leadership.',
            3: 'Level 3 approval includes executive directors and commences only after all Level 2 approvals are received.'
          };

          return (
            <Card key={level} className={`border-l-4 ${getLevelColor(level as 1 | 2 | 3)}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getLevelIcon(level as 1 | 2 | 3)}
                    <div>
                      <CardTitle className="text-lg">Level {level} Approval</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {levelDescription[level as keyof typeof levelDescription]}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {levelApprovers.length} Approver{levelApprovers.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {levelApprovers.map(approver => (
                    <div key={approver.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={approver.avatar} alt={approver.name} />
                          <AvatarFallback>
                            {approver.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{approver.name}</p>
                          <p className="text-xs text-gray-600">{approver.title}</p>
                          <p className="text-xs text-gray-500">{approver.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(approver.status)}
                          <span className="text-xs capitalize">{approver.status}</span>
                        </div>
                        {approver.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                        {!approver.required && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveApprover(approver.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Approver Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedLevel(level as 1 | 2 | 3);
                      setShowAddModal(true);
                    }}
                    className="w-full mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Level {level} Approver
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Checklist</span>
        </Button>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onSave} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>
          <Button onClick={() => setShowFinalizeModal(true)} className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Finalize PSSR</span>
          </Button>
        </div>
      </div>

      {/* Add Approver Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Level {selectedLevel} Approver</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Search Users</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Select Approver</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose an approver" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50 max-h-60">
                  {filteredUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-gray-600">{user.title}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddApprover}>
                Add Approver
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalize PSSR Modal */}
      <Dialog open={showFinalizeModal} onOpenChange={setShowFinalizeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Target className="h-6 w-6 text-blue-600" />
              <span>Finalize PSSR</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-700">
              The PSSR is now ready to be completed. Once finalized, you will be able to:
            </p>
            
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Complete the PSSR checklist with YES/NO/N/A responses</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Schedule PSSR kick-off and walkdown events</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Submit items for approval workflow</span>
              </li>
            </ul>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Once finalized, the approval workflow cannot be modified without creating a new PSSR.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowFinalizeModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleFinalizePSSR}>
                Finalize PSSR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PSSRStepThree;