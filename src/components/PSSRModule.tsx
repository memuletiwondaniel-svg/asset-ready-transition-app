
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
      title: 'NRNGL Plant Start-up Commissioning',
      asset: 'NRNGL Plant',
      status: 'Under Review',
      progress: 75,
      created: '2024-01-15',
      dueDate: '2024-02-15',
      initiator: 'Ahmed Al-Rashid',
      pendingApprovals: 3
    },
    {
      id: 'PSSR-2024-002',
      title: 'Compression Station Restart',
      asset: 'Compression Station',
      status: 'Draft',
      progress: 30,
      created: '2024-01-20',
      dueDate: '2024-02-20',
      initiator: 'Sarah Johnson',
      pendingApprovals: 0
    },
    {
      id: 'PSSR-2024-003',
      title: 'KAZ Plant Safety System Modification',
      asset: 'KAZ Plant',
      status: 'Approved',
      progress: 100,
      created: '2024-01-10',
      dueDate: '2024-02-10',
      initiator: 'Mohammed Hassan',
      pendingApprovals: 0
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
            <Button onClick={() => setActiveView('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New PSSR
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total PSSRs</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Under Review</p>
                  <p className="text-2xl font-bold text-yellow-600">7</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">15</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Draft</p>
                  <p className="text-2xl font-bold text-gray-600">2</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
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
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{pssr.id}</h3>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${getStatusColor(pssr.status)}`}
                      >
                        {getStatusIcon(pssr.status)}
                        {pssr.status}
                      </Badge>
                    </div>
                    <p className="text-gray-700 font-medium mb-1">{pssr.title}</p>
                    <p className="text-sm text-gray-500 mb-3">Asset: {pssr.asset}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>Initiator: {pssr.initiator}</span>
                      <span>Created: {pssr.created}</span>
                      <span>Due: {pssr.dueDate}</span>
                      {pssr.pendingApprovals > 0 && (
                        <span className="text-orange-600 font-medium">
                          {pssr.pendingApprovals} pending approvals
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Progress</p>
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
