
import { useState, useMemo } from 'react';
import { PSSR } from './usePSSRData';

interface Filters {
  plant: string[];
  status: string[];
  lead: string[];
}

export const usePSSRFilters = (pssrList: PSSR[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({
    plant: [],
    status: [],
    lead: []
  });

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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  return {
    searchTerm,
    filters,
    filteredPSSRs,
    toggleFilter,
    clearAllFilters,
    handleSearchChange
  };
};
