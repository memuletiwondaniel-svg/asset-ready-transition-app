import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Search, Filter, Eye, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import CreatePSSRFlow from '@/components/CreatePSSRFlow';
import PSSRDetails from '@/components/PSSRDetails';

interface PSSRModuleProps {
  onBack: () => void;
}

const PSSRModule: React.FC<PSSRModuleProps> = ({ onBack }) => {
  const [activeView, setActiveView] = useState<'list' | 'create' | 'details'>('list');
  const [selectedPSSR, setSelectedPSSR] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock PSSR data
  const pssrList = [
    {
      id: 'PSSR-2024-001',
      projectId: 'DP 300',
      projectName: 'HM Additional Compressors',
      asset: 'Compression Station',
      status: 'Under Review',
      progress: 75,
      created: '2024-01-15',
      dueDate: '2024-02-15',
      pssrLead: 'Ahmed Al-Rashid',
      pendingApprovals: 3
    },
    {
      id: 'PSSR-2024-002',
      projectId: 'DP 163',
      projectName: 'LPG Unit 12.1 Rehabilitation',
      asset: 'KAZ Plant',
      status: 'Draft',
      progress: 30,
      created: '2024-01-20',
      dueDate: '2024-02-20',
      pssrLead: 'Sarah Johnson',
      pendingApprovals: 0
    },
    {
      id: 'PSSR-2024-003',
      projectId: 'DP 083C',
      projectName: 'UQ Jetty 2 Export Terminal',
      asset: 'UQ Asset',
      status: 'Approved',
      progress: 100,
      created: '2024-01-10',
      dueDate: '2024-02-10',
      pssrLead: 'Mohammed Hassan',
      pendingApprovals: 0
    },
    {
      id: 'PSSR-2024-004',
      projectId: 'DP 317',
      projectName: 'Majnoon New Gas Tie-in',
      asset: 'NRNGL Asset',
      status: 'Under Review',
      progress: 45,
      created: '2024-01-25',
      dueDate: '2024-02-25',
      pssrLead: 'Omar Al-Basri',
      pendingApprovals: 5
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'under review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'under review': return <Clock className="h-4 w-4" />;
      case 'draft': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (activeView === 'create') {
    return <CreatePSSRFlow onBack={() => setActiveView('list')} />;
  }

  if (activeView === 'details' && selectedPSSR) {
    return (
      <PSSRDetails 
        pssrId={selectedPSSR} 
        onBack={() => setActiveView('list')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-xl font-bold text-gray-900">
                Pre-Start-Up Safety Review (PSSR)
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create New PSSR Button */}
        <div className="mb-6">
          <Button onClick={() => setActiveView('create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create New PSSR
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search PSSRs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* PSSR List */}
        <div className="space-y-4">
          {pssrList.map((pssr) => (
            <Card key={pssr.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    {/* Most prominent: Project ID and Name */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {pssr.projectId} - {pssr.projectName}
                    </h3>
                    
                    {/* Asset info and small PSSR ID */}
                    <div className="flex items-center gap-3 mb-3">
                      <p className="text-gray-600">Asset: <span className="font-medium">{pssr.asset}</span></p>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{pssr.id}</span>
                    </div>

                    {/* Second important: Status */}
                    <div className="mb-3">
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 w-fit ${getStatusColor(pssr.status)}`}
                      >
                        {getStatusIcon(pssr.status)}
                        {pssr.status}
                      </Badge>
                    </div>
                    
                    {/* Third important: PSSR Lead and pending approvals */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>PSSR Lead: {pssr.pssrLead}</span>
                      {pssr.pendingApprovals > 0 && (
                        <span className="text-orange-600 font-medium">
                          {pssr.pendingApprovals} pending approvals
                        </span>
                      )}
                    </div>
                    
                    {/* Additional info */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                      <span>Created: {pssr.created}</span>
                      <span>Due: {pssr.dueDate}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all" 
                            style={{ width: `${pssr.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{pssr.progress}%</span>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedPSSR(pssr.id);
                        setActiveView('details');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PSSRModule;
