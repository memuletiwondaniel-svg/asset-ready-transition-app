
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import CreatePSSRFlow from '@/components/CreatePSSRFlow';
import PSSRDetails from '@/components/PSSRDetails';
import PSSRFilters from './PSSRFilters';
import PSSRList from './PSSRList';

interface PSSRModuleProps {
  onBack: () => void;
}

const PSSRModule: React.FC<PSSRModuleProps> = ({ onBack }) => {
  const [activeView, setActiveView] = useState<'list' | 'create' | 'details'>('list');
  const [selectedPSSR, setSelectedPSSR] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    plant: [] as string[],
    status: [] as string[],
    lead: [] as string[]
  });

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
      pssrLead: 'Ahmed Al-Rashid',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 3,
      completedDate: null
    },
    {
      id: 'PSSR-2024-002',
      projectId: 'DP 163',
      projectName: 'LPG Unit 12.1 Rehabilitation',
      asset: 'KAZ',
      status: 'Draft',
      progress: 30,
      created: '2024-01-20',
      pssrLead: 'Sarah Johnson',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 0,
      completedDate: null
    },
    {
      id: 'PSSR-2024-003',
      projectId: 'DP 083C',
      projectName: 'UQ Jetty 2 Export Terminal',
      asset: 'UQ',
      status: 'Approved',
      progress: 100,
      created: '2024-01-10',
      pssrLead: 'Mohammed Hassan',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 0,
      completedDate: '2024-02-08'
    },
    {
      id: 'PSSR-2024-004',
      projectId: 'DP 317',
      projectName: 'Majnoon New Gas Tie-in',
      asset: 'NRNGL',
      status: 'Under Review',
      progress: 45,
      created: '2024-01-25',
      pssrLead: 'Omar Al-Basri',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 5,
      completedDate: null
    }
  ];

  // Get unique values for filter options
  const uniquePlants = [...new Set(pssrList.map(pssr => pssr.asset))];
  const uniqueStatuses = [...new Set(pssrList.map(pssr => pssr.status))];
  const uniqueLeads = [...new Set(pssrList.map(pssr => pssr.pssrLead))];

  // Filter logic
  const filteredPSSRs = pssrList.filter(pssr => {
    // Search term filter
    const matchesSearch = searchTerm === '' || 
      pssr.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pssr.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pssr.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pssr.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pssr.pssrLead.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pssr.status.toLowerCase().includes(searchTerm.toLowerCase());

    // Plant filter
    const matchesPlant = filters.plant.length === 0 || filters.plant.includes(pssr.asset);
    
    // Status filter
    const matchesStatus = filters.status.length === 0 || filters.status.includes(pssr.status);
    
    // Lead filter
    const matchesLead = filters.lead.length === 0 || filters.lead.includes(pssr.pssrLead);

    return matchesSearch && matchesPlant && matchesStatus && matchesLead;
  });

  const toggleFilter = (category: 'plant' | 'status' | 'lead', value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value) 
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      plant: [],
      status: [],
      lead: []
    });
  };

  const handleViewDetails = (pssrId: string) => {
    setSelectedPSSR(pssrId);
    setActiveView('details');
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
        <PSSRFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onToggleFilter={toggleFilter}
          onClearFilters={clearAllFilters}
          uniquePlants={uniquePlants}
          uniqueStatuses={uniqueStatuses}
          uniqueLeads={uniqueLeads}
        />

        {/* PSSR List */}
        <PSSRList
          pssrs={filteredPSSRs}
          onViewDetails={handleViewDetails}
          totalCount={pssrList.length}
        />
      </main>
    </div>
  );
};

export default PSSRModule;
