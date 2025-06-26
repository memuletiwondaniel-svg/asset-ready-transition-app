
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import CreatePSSRFlow from '@/components/CreatePSSRFlow';
import PSSRDetails from '@/components/PSSRDetails';
import PSSRFilters from './PSSRFilters';
import PSSRList from './PSSRList';
import ScrollIndicator from './ScrollIndicator';

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

  // Empty PSSR list
  const pssrList: any[] = [];

  // Get unique values for filter options
  const uniquePlants: string[] = [];
  const uniqueStatuses: string[] = [];
  const uniqueLeads: string[] = [];

  // Memoized filter logic for better performance
  const filteredPSSRs = useMemo(() => {
    return pssrList.filter(pssr => {
      // Search term filter - case insensitive and trims whitespace
      const searchQuery = searchTerm.toLowerCase().trim();
      const matchesSearch = searchQuery === '' || 
        pssr.id.toLowerCase().includes(searchQuery) ||
        pssr.projectId.toLowerCase().includes(searchQuery) ||
        pssr.projectName.toLowerCase().includes(searchQuery) ||
        pssr.asset.toLowerCase().includes(searchQuery) ||
        pssr.pssrLead.toLowerCase().includes(searchQuery) ||
        pssr.status.toLowerCase().includes(searchQuery);

      // Plant filter
      const matchesPlant = filters.plant.length === 0 || filters.plant.includes(pssr.asset);
      
      // Status filter
      const matchesStatus = filters.status.length === 0 || filters.status.includes(pssr.status);
      
      // Lead filter
      const matchesLead = filters.lead.length === 0 || filters.lead.includes(pssr.pssrLead);

      return matchesSearch && matchesPlant && matchesStatus && matchesLead;
    });
  }, [searchTerm, filters, pssrList]);

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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      <ScrollIndicator showFade={true} />
      
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} className="hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  Pre-Start-Up Safety Review (PSSR)
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {/* Enhanced Create New PSSR Button */}
        <div className="mb-8">
          <Button 
            onClick={() => setActiveView('create')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New PSSR
          </Button>
        </div>

        {/* Search and Filter */}
        <PSSRFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
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
