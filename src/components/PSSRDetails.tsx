import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Users, FileText, MessageSquare } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import DOMPurify from 'dompurify';

interface PSSRDetailsProps {
  pssrId: string;
  onBack: () => void;
}

const PSSRDetails: React.FC<PSSRDetailsProps> = ({ pssrId, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock PSSR details data
  const pssrData = {
    id: pssrId,
    title: 'DP300 HM Additional Compressors',
    asset: 'NRNGL Plant',
    reason: 'Start-up or Commissioning of a new Asset',
    projectId: 'PROJ-2024-001',
    projectName: 'Phase 3 Expansion Project',
    status: 'Under Review',
    progress: 75,
    created: '2024-01-15',
    dueDate: '2024-02-15',
    initiator: 'Plant Director',
    scope: 'Pre-start-up safety review for the commissioning of new natural gas processing units including safety systems, process controls, and emergency shutdown procedures.',
    pendingApprovals: 3,
    teamMembers: {
      technicalAuthorities: [
        { name: 'Process Engineering TA', role: 'Process Engineering TA', status: 'Approved' },
        { name: 'Technical Safety TA', role: 'Technical Safety TA', status: 'Pending' },
        { name: 'Mechanical Static TA', role: 'Mechanical Static TA', status: 'Under Review' }
      ],
      assetTeam: [
        { name: 'Deputy Plant Director', role: 'Deputy Plant Director', status: 'Approved' },
        { name: 'Site Engineer', role: 'Site Engineer', status: 'Approved' }
      ],
      projectTeam: [
        { name: 'Michael Brown', role: 'Project Manager', status: 'Approved' },
        { name: 'Anna Thompson', role: 'CSU Lead', status: 'Pending' }
      ],
      hsse: [
        { name: 'David Park', role: 'HSSE Lead', status: 'Under Review' }
      ]
    },
    checklist: {
      general: { total: 15, completed: 12, approved: 10 },
      technicalIntegrity: { total: 20, completed: 15, approved: 12 },
      startUpReadiness: { total: 18, completed: 14, approved: 11 },
      healthSafety: { total: 12, completed: 10, approved: 8 }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'under review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle2 className="h-3 w-3" />;
      case 'under review': return <Clock className="h-3 w-3" />;
      case 'pending': return <AlertCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Modern Gradient Background */}
      <div className="absolute inset-0 bg-background">
        {/* Main layer */}
        <div className="absolute inset-0 opacity-25 dark:opacity-20">
          <div 
            className="absolute inset-0 animate-gradient-shift-morph"
            style={{
              background: 'radial-gradient(at 20% 30%, hsl(220, 12%, 90%) 0%, transparent 40%), radial-gradient(at 80% 20%, hsl(240, 10%, 92%) 0%, transparent 40%), radial-gradient(at 40% 80%, hsl(210, 11%, 91%) 0%, transparent 40%)',
              filter: 'blur(50px)',
            }}
          />
        </div>

        {/* Sweep layer */}
        <div className="absolute inset-0 opacity-20 dark:opacity-15">
          <div 
            className="absolute inset-0 animate-gradient-sweep-morph"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 50%, hsl(230, 10%, 88%) 0%, transparent 50%)',
              filter: 'blur(60px)',
            }}
          />
        </div>
        
        {/* Overlay gradient */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(135deg, hsl(220, 8%, 92%) 0%, transparent 30%, hsl(var(--primary) / 0.05) 50%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10">
      <header className="fluent-navigation sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" onClick={onBack} size="sm">
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to PSSR List
              </Button>
              <div className="flex items-center gap-3">
                <ProjectIdBadge>{pssrData.id}</ProjectIdBadge>
                <p className="text-sm text-muted-foreground">{pssrData.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 text-xs ${getStatusColor(pssrData.status)}`}
              >
                {getStatusIcon(pssrData.status)}
                {pssrData.status}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="team" className="text-xs">Review Team</TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs">Checklist</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Progress Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">PSSR Progress</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">Overall Progress</span>
                    <span className="text-xs text-gray-600">{pssrData.progress}%</span>
                  </div>
                  <Progress value={pssrData.progress} className="w-full h-2" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xl font-bold text-blue-600">{pssrData.pendingApprovals}</p>
                      <p className="text-xs text-gray-600">Pending Approvals</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xl font-bold text-green-600">12</p>
                      <p className="text-xs text-gray-600">Days Remaining</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xl font-bold text-orange-600">8</p>
                      <p className="text-xs text-gray-600">Team Members</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">PSSR Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Asset</label>
                      <p className="text-sm text-gray-900">{pssrData.asset}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Reason</label>
                      <p className="text-sm text-gray-900">{pssrData.reason}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Project ID</label>
                      <p className="text-sm text-gray-900">{pssrData.projectId}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Initiator</label>
                      <p className="text-sm text-gray-900">{pssrData.initiator}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Created Date</label>
                      <p className="text-sm text-gray-900">{pssrData.created}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Due Date</label>
                      <p className="text-sm text-gray-900">{pssrData.dueDate}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-600">Scope Description</label>
                  <div 
                    className="text-sm text-gray-900 mt-1 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(pssrData.scope) 
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {/* Technical Authorities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Users className="h-4 w-4 mr-2" />
                  Technical Authorities
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {pssrData.teamMembers.technicalAuthorities.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-gray-600">{member.role}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 text-xs ${getStatusColor(member.status)}`}
                      >
                        {getStatusIcon(member.status)}
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Asset Team */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Asset Team</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {pssrData.teamMembers.assetTeam.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-gray-600">{member.role}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 text-xs ${getStatusColor(member.status)}`}
                      >
                        {getStatusIcon(member.status)}
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Project Team */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Project Team</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {pssrData.teamMembers.projectTeam.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-gray-600">{member.role}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 text-xs ${getStatusColor(member.status)}`}
                      >
                        {getStatusIcon(member.status)}
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* HSSE Team */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">HSSE Team</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {pssrData.teamMembers.hsse.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-gray-600">{member.role}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 text-xs ${getStatusColor(member.status)}`}
                      >
                        {getStatusIcon(member.status)}
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4">
            {/* Checklist Progress */}
            {Object.entries(pssrData.checklist).map(([category, data]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Badge variant="outline" className="text-xs">
                      {data.approved}/{data.total} Approved
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Progress: {data.completed}/{data.total} completed</span>
                      <span>{Math.round((data.completed / data.total) * 100)}%</span>
                    </div>
                    <Progress value={(data.completed / data.total) * 100} className="h-2" />
                    
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="text-lg font-bold text-green-600">{data.approved}</p>
                        <p className="text-xs text-gray-600">Approved</p>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded">
                        <p className="text-lg font-bold text-yellow-600">{data.completed - data.approved}</p>
                        <p className="text-xs text-gray-600">Under Review</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-lg font-bold text-gray-600">{data.total - data.completed}</p>
                        <p className="text-xs text-gray-600">Pending</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-green-100 rounded-full">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium">Technical Authority approval received</p>
                      <p className="text-xs text-gray-600">Process Engineering TA approved review</p>
                      <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-blue-100 rounded-full">
                      <FileText className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium">Checklist item submitted</p>
                      <p className="text-xs text-gray-600">Safety Systems Integration - submitted for review</p>
                      <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-yellow-100 rounded-full">
                      <Clock className="h-3 w-3 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium">Team member assigned</p>
                      <p className="text-xs text-gray-600">Technical Safety TA assigned</p>
                      <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </div>
  );
};

export default PSSRDetails;
