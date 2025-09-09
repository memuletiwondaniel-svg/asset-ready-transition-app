import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ArrowRight, Users, CheckCircle, Plus, Trash2 } from 'lucide-react';

interface PSSRStepThreeProps {
  data: any;
  onDataUpdate: (stepData: any) => void;
  onNext: () => void;
  onBack: () => void;
  onFinalize: () => void;
}

const PSSRStepThree: React.FC<PSSRStepThreeProps> = ({ 
  data, 
  onDataUpdate, 
  onNext, 
  onBack, 
  onFinalize 
}) => {
  const [approvers, setApprovers] = useState(data.approvers || {
    level1: [{ name: 'Current User', role: 'PSSR Lead', id: '1' }],
    level2: [],
    level3: []
  });

  // Default approvers based on reason
  const getDefaultApprovers = () => {
    const defaults = {
      level2: [
        { name: 'Project Manager', role: 'Project Manager', id: 'pm1', auto: true },
        { name: 'Plant Director', role: 'Plant Director', id: 'pd1', auto: true },
        { name: 'Engineering Manager (P&E)', role: 'Engineering Manager', id: 'em1', auto: true },
        { name: 'Engineering Manager (Asset)', role: 'Engineering Manager', id: 'em2', auto: true }
      ],
      level3: [
        { name: 'Project & Engineering Director', role: 'Director', id: 'ped1', auto: true },
        { name: 'Production & Maintenance Director', role: 'Director', id: 'pmd1', auto: true },
        { name: 'HSE Director', role: 'Director', id: 'hse1', auto: true }
      ]
    };

    return defaults;
  };

  React.useEffect(() => {
    if (approvers.level2.length === 0 && approvers.level3.length === 0) {
      const defaults = getDefaultApprovers();
      setApprovers(prev => ({
        ...prev,
        level2: defaults.level2,
        level3: defaults.level3
      }));
    }
  }, []);

  const handleSave = () => {
    onDataUpdate({ approvers });
  };

  const handleFinalize = () => {
    onDataUpdate({ approvers });
    onFinalize();
  };

  const removeApprover = (level: string, id: string) => {
    setApprovers(prev => ({
      ...prev,
      [level]: prev[level].filter((approver: any) => approver.id !== id)
    }));
  };

  const renderApproverLevel = (level: string, title: string, description: string) => {
    const levelApprovers = approvers[level] || [];
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {levelApprovers.map((approver: any) => (
              <div key={approver.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={approver.avatar} />
                    <AvatarFallback>
                      {approver.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{approver.name}</p>
                    <p className="text-sm text-muted-foreground">{approver.role}</p>
                  </div>
                  {approver.auto && (
                    <Badge variant="outline" className="text-xs">Auto-assigned</Badge>
                  )}
                </div>
                
                {!approver.auto && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeApprover(level, approver.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {levelApprovers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">No approvers assigned</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review PSSR Approvers</CardTitle>
          <CardDescription>
            Configure the approval hierarchy for this PSSR. Default approvers are automatically assigned based on your selection.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        {renderApproverLevel('level1', 'Level 1 Approvers', 'PSSR Lead approval signifies successful completion with no pending actions')}
        {renderApproverLevel('level2', 'Level 2 Approvers', 'Approval commences after Level 1 approval')}
        {renderApproverLevel('level3', 'Level 3 Approvers', 'Final approval tier after all Level 2 approvals are received')}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
        <h3 className="font-semibold text-primary mb-2">Approval Process Flow</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span>Level 1</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span>Level 2</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span>Level 3</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Approvals must be completed in sequence
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Checklist
        </Button>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSave}>
            Save Progress
          </Button>
          <Button onClick={handleFinalize} className="bg-success hover:bg-success/90">
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalize PSSR
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PSSRStepThree;