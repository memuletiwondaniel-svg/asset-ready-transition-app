import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem 
} from '@/components/ui/dropdown-menu';
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

  const hasActiveFilters = filters.plant.length > 0 || filters.status.length > 0 || filters.lead.length > 0;

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
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search PSSRs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {hasActiveFilters && (
                  <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {filters.plant.length + filters.status.length + filters.lead.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter by Plant</DropdownMenuLabel>
              {uniquePlants.map(plant => (
                <DropdownMenuCheckboxItem
                  key={plant}
                  checked={filters.plant.includes(plant)}
                  onCheckedChange={() => toggleFilter('plant', plant)}
                >
                  {plant}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              {uniqueStatuses.map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.status.includes(status)}
                  onCheckedChange={() => toggleFilter('status', status)}
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by PSSR Lead</DropdownMenuLabel>
              {uniqueLeads.map(lead => (
                <DropdownMenuCheckboxItem
                  key={lead}
                  checked={filters.lead.includes(lead)}
                  onCheckedChange={() => toggleFilter('lead', lead)}
                >
                  {lead}
                </DropdownMenuCheckboxItem>
              ))}
              
              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearAllFilters}>
                    Clear All Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description under search */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Showing PSSRs requiring action from You ({filteredPSSRs.length} of {pssrList.length})
          </p>
        </div>

        {/* PSSR List */}
        <div className="space-y-3">
          {filteredPSSRs.map((pssr) => (
            <Card key={pssr.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex-1">
                    {/* PSSR ID first with original design, then Project ID and Name */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      <span className="text-blue-600">{pssr.id}</span> - {pssr.projectId} - {pssr.projectName}
                    </h3>
                    
                    {/* Plant info */}
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm text-gray-600">Plant: <span className="font-medium">{pssr.asset}</span></p>
                    </div>

                    {/* Second important: Status with pending approvals */}
                    <div className="mb-2 flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 w-fit ${getStatusColor(pssr.status)}`}
                      >
                        {getStatusIcon(pssr.status)}
                        {pssr.status}
                      </Badge>
                      {pssr.pendingApprovals > 0 && (
                        <span className="text-sm text-orange-600 font-medium">
                          - {pssr.pendingApprovals} pending approvals
                        </span>
                      )}
                    </div>
                    
                    {/* Third important: PSSR Lead with Avatar first */}
                    <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={pssr.pssrLeadAvatar} alt={pssr.pssrLead} />
                        <AvatarFallback className="text-xs">
                          {pssr.pssrLead.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{pssr.pssrLead} (PSSR Lead)</span>
                    </div>
                    
                    {/* Additional info */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Created: {pssr.created}</span>
                      {pssr.completedDate && (
                        <span>Completed: {pssr.completedDate}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-xs text-gray-600 mb-1">Overall Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all" 
                            style={{ width: `${pssr.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{pssr.progress}%</span>
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

        {filteredPSSRs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No PSSRs match your current filters.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PSSRModule;
