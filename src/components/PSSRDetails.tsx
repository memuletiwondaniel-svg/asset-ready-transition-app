
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Users, FileText, MessageSquare } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PSSRDetailsProps {
  pssrId: string;
  onBack: () => void;
}

const PSSRDetails: React.FC<PSSRDetailsProps> = ({ pssrId, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock PSSR details data
  const pssrData = {
    id: pssrId,
    title: 'NRNGL Plant Start-up Commissioning',
    asset: 'NRNGL Plant',
    reason: 'Start-up or Commissioning of a new Asset',
    projectId: 'BGC-2024-001',
    projectName: 'Phase 3 Expansion Project',
    status: 'Under Review',
    progress: 75,
    created: '2024-01-15',
    dueDate: '2024-02-15',
    initiator: 'Ahmed Al-Rashid',
    scope: 'Pre-start-up safety review for the commissioning of new natural gas processing units including safety systems, process controls, and emergency shutdown procedures.',
    pendingApprovals: 3,
    teamMembers: {
      technicalAuthorities: [
        { name: 'Dr. Sarah Wilson', role: 'Process Engineering TA', status: 'Approved' },
        { name: 'John Smith', role: 'Technical Safety TA', status: 'Pending' },
        { name: 'Maria Garcia', role: 'Mechanical Static TA', status: 'Under Review' }
      ],
      assetTeam: [
        { name: 'Omar Hassan', role: 'Deputy Plant Director', status: 'Approved' },
        { name: 'Lisa Chen', role: 'Site Engineer', status: 'Approved' }
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
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'under review': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PSSR List
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{pssrData.id}</h1>
                <p className="text-sm text-gray-600">{pssrData.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 ${getStatusColor(pssrData.status)}`}
              >
                {getStatusIcon(pssrData.status)}
                {pssrData.status}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Review Team</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle>PSSR Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-gray-600">{pssrData.progress}%</span>
                  </div>
                  <Progress value={pssrData.progress} className="w-full" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{pssrData.pendingApprovals}</p>
                      <p className="text-sm text-gray-600">Pending Approvals</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">12</p>
                      <p className="text-sm text-gray-600">Days Remaining</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">8</p>
                      <p className="text-sm text-gray-600">Team Members</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>PSSR Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Asset</label>
                      <p className="text-gray-900">{pssrData.asset}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Reason</label>
                      <p className="text-gray-900">{pssrData.reason}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Project ID</label>
                      <p className="text-gray-900">{pssrData.projectId}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Initiator</label>
                      <p className="text-gray-900">{pssrData.initiator}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created Date</label>
                      <p className="text-gray-900">{pssrData.created}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Due Date</label>
                      <p className="text-gray-900">{pssrData.dueDate}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-600">Scope Description</label>
                  <p className="text-gray-900 mt-1">{pssrData.scope}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            {/* Technical Authorities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Technical Authorities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pssrData.teamMembers.technicalAuthorities.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.role}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${getStatusColor(member.status)}`}
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
              <CardHeader>
                <CardTitle>Asset Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pssrData.teamMembers.assetTeam.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.role}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${getStatusColor(member.status)}`}
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
              <CardHeader>
                <CardTitle>Project Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pssrData.teamMembers.projectTeam.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.role}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${getStatusColor(member.status)}`}
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
              <CardHeader>
                <CardTitle>HSSE Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pssrData.teamMembers.hsse.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.role}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${getStatusColor(member.status)}`}
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

          <TabsContent value="checklist" className="space-y-6">
            {/* Checklist Progress */}
            {Object.entries(pssrData.checklist).map(([category, data]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Badge variant="outline">
                      {data.approved}/{data.total} Approved
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {data.completed}/{data.total} completed</span>
                      <span>{Math.round((data.completed / data.total) * 100)}%</span>
                    </div>
                    <Progress value={(data.completed / data.total) * 100} />
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-3 bg-green-50 rounded">
                        <p className="text-lg font-bold text-green-600">{data.approved}</p>
                        <p className="text-xs text-gray-600">Approved</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded">
                        <p className="text-lg font-bold text-yellow-600">{data.completed - data.approved}</p>
                        <p className="text-xs text-gray-600">Under Review</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-lg font-bold text-gray-600">{data.total - data.completed}</p>
                        <p className="text-xs text-gray-600">Pending</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-green-100 rounded-full">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Technical Authority approval received</p>
                      <p className="text-xs text-gray-600">Dr. Sarah Wilson approved Process Engineering review</p>
                      <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-blue-100 rounded-full">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Checklist item submitted</p>
                      <p className="text-xs text-gray-600">Safety Systems Integration - submitted for review</p>
                      <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-yellow-100 rounded-full">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Team member assigned</p>
                      <p className="text-xs text-gray-600">John Smith assigned as Technical Safety TA</p>
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
  );
};

export default PSSRDetails;
