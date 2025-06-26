
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CreatePSSRFlow from '@/components/CreatePSSRFlow';
import PSSRDetails from '@/components/PSSRDetails';
import PSSRFilters from './PSSRFilters';
import PSSRList from './PSSRList';
import PSSRHeader from './PSSRHeader';
import { usePSSRData } from '@/hooks/usePSSRData';
import { usePSSRFilters } from '@/hooks/usePSSRFilters';

interface PSSRModuleProps {
  onBack: () => void;
}

const PSSRModule: React.FC<PSSRModuleProps> = ({ onBack }) => {
  const [activeView, setActiveView] = useState<'list' | 'create' | 'details'>('list');
  const [selectedPSSR, setSelectedPSSR] = useState<string | null>(null);

  const { pssrList, uniquePlants, uniqueStatuses, uniqueLeads } = usePSSRData();
  const {
    searchTerm,
    filters,
    filteredPSSRs,
    toggleFilter,
    clearAllFilters,
    handleSearchChange
  } = usePSSRFilters(pssrList);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <PSSRHeader onBack={onBack} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
