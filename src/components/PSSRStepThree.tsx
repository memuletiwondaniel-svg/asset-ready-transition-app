import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { 
  Users, 
  Plus, 
  Trash2, 
  Save,
  ArrowLeft,
  ArrowRight,
  Search,
  Target,
  UserCheck,
  CheckCircle
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
  position: string;
  avatar: string;
  level: 1 | 2;
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
  const [selectedLevel, setSelectedLevel] = useState<1 | 2>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  // Fetch real users from database
  const { data: profileUsers, isLoading } = useProfileUsers();

  // Initialize with default approvers for Tier 1 PSSR
  useEffect(() => {
    if (profileUsers && profileUsers.length > 0 && approvers.length === 0) {
      const defaultApprovers = getDefaultTier1Approvers();
      setApprovers(defaultApprovers);
    }
  }, [profileUsers]);

  const getDefaultTier1Approvers = (): Approver[] => {
    if (!profileUsers) return [];
    
    // Level 1 approvers based on position/role
    const level1Positions = ['PSSR Lead', 'Engineering Manager (P&E)', 'Engineering Manager (Asset)', 'Project Manager', 'Deputy Plant Director'];
    const level1Approvers = profileUsers
      .filter(user => level1Positions.some(pos => user.position?.includes(pos)))
      .slice(0, 5)
      .map(user => ({
        id: user.user_id,
        name: user.full_name,
        position: user.position || 'Not specified',
        avatar: user.avatar_url || '',
        level: 1 as const
      }));

    // Level 2 approvers based on position/role  
    const level2Positions = ['Plant Director', 'P&E Director', 'HSSE Director', 'P&M Director'];
    const level2Approvers = profileUsers
      .filter(user => level2Positions.some(pos => user.position?.includes(pos)))
      .slice(0, 4)
      .map(user => ({
        id: user.user_id,
        name: user.full_name,
        position: user.position || 'Not specified',
        avatar: user.avatar_url || '',
        level: 2 as const
      }));

    return [...level1Approvers, ...level2Approvers];
  };

  const getApproversByLevel = (level: 1 | 2) => {
    return approvers.filter(approver => approver.level === level);
  };

  const handleAddApprover = () => {
    if (!selectedUserId) {
      toast({ title: 'Please select a user', variant: 'destructive' });
      return;
    }

    const user = profileUsers?.find(u => u.user_id === selectedUserId);
    if (!user) return;

    const newApprover: Approver = {
      id: user.user_id,
      name: user.full_name,
      position: user.position || 'Not specified',
      avatar: user.avatar_url || '',
      level: selectedLevel
    };

    setApprovers(prev => [...prev, newApprover]);
    setShowAddModal(false);
    setSelectedUserId('');
    setSearchTerm('');
    
    toast({ title: 'Approver added successfully' });
  };

  const handleRemoveApprover = (approverId: string) => {
    setApprovers(prev => prev.filter(a => a.id !== approverId));
    toast({ title: 'Approver removed' });
  };

  const filteredUsers = (profileUsers || []).filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.position?.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(user => !approvers.some(approver => approver.id === user.user_id));

  const handleFinalizePSSR = () => {
    onDataUpdate({ approvers, finalized: true });
    setShowFinalizeModal(false);
    toast({ 
      title: 'PSSR Finalized', 
      description: 'The PSSR is now ready for checklist completion and scheduling.' 
    });
    onNext();
  };

  const calculateProgress = () => {
    const level1Count = getApproversByLevel(1).length;
    const level2Count = getApproversByLevel(2).length;
    const totalExpected = 9; // 5 Level 1 + 4 Level 2
    const totalCurrent = approvers.length;
    return Math.min((totalCurrent / totalExpected) * 100, 100);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading approvers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/40">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <UserCheck className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-semibold text-lg">PSSR Approval Workflow - Tier 1</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure approvers for your PSSR. Level 1 approval must be completed before Level 2 begins.
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Approval Configuration Progress</span>
              <span className="font-medium">{approvers.length} / 9 Approvers</span>
            </div>
            <Progress value={calculateProgress()} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Level 1: {getApproversByLevel(1).length} / 5</span>
              <span>Level 2: {getApproversByLevel(2).length} / 4</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Levels */}
      <div className="space-y-6">
        {[1, 2].map(level => {
          const levelApprovers = getApproversByLevel(level as 1 | 2);
          const levelDescription = {
            1: 'Level 1: PSSR Lead, Engineering Manager (P&E), Engineering Manager (Asset), Project Manager, Deputy Plant Director',
            2: 'Level 2: Plant Director, P&E Director, HSSE Director, P&M Director'
          };

          const levelLabel = {
            1: 'Level 1 Approvers',
            2: 'Level 2 Approvers'
          };

          return (
            <Card key={level} className="bg-card/60 backdrop-blur-sm border-border/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{levelLabel[level as keyof typeof levelLabel]}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {levelDescription[level as keyof typeof levelDescription]}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedLevel(level as 1 | 2);
                      setShowAddModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Approver
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {levelApprovers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No approvers assigned yet. Click "Add Approver" to assign.
                    </p>
                  ) : (
                    levelApprovers.map(approver => (
                      <div key={approver.id} className="flex items-center justify-between p-4 bg-background/60 rounded-lg border border-border/60 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12 border-2 border-border">
                            <AvatarImage src={approver.avatar} alt={approver.name} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {approver.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{approver.name}</p>
                            <p className="text-sm text-muted-foreground">{approver.position}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveApprover(approver.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
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
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <Label>Available Users</Label>
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users available</p>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.user_id}
                    onClick={() => setSelectedUserId(user.user_id)}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUserId === user.user_id 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || ''} alt={user.full_name} />
                      <AvatarFallback>
                        {user.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.position || 'No position'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowAddModal(false);
                setSelectedUserId('');
                setSearchTerm('');
              }}>
                Cancel
              </Button>
              <Button onClick={handleAddApprover} disabled={!selectedUserId}>
                <Plus className="h-4 w-4 mr-2" />
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