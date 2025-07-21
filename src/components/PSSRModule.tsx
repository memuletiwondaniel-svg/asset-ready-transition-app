
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Shield, AlertTriangle, CheckCircle, Clock, Search, Filter, MoreVertical, Users, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
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

  // Mock PSSR data with enhanced structure
  const pssrList = [
    {
      id: 'SSU-2024-001',
      projectId: 'DP 300',
      projectName: 'HM Additional Compressors',
      asset: 'Compression Station',
      status: 'Under Review',
      priority: 'High',
      progress: 75,
      created: '2024-01-15',
      pssrLead: 'Ahmed Al-Rashid',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 3,
      completedDate: null,
      riskLevel: 'Medium',
      nextReview: '2024-02-15'
    },
    {
      id: 'SSU-2024-002',
      projectId: 'DP 163',
      projectName: 'LPG Unit 12.1 Rehabilitation',
      asset: 'KAZ',
      status: 'Draft',
      priority: 'Medium',
      progress: 30,
      created: '2024-01-20',
      pssrLead: 'Sarah Johnson',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 0,
      completedDate: null,
      riskLevel: 'Low',
      nextReview: '2024-02-20'
    },
    {
      id: 'SSU-2024-003',
      projectId: 'DP 083C',
      projectName: 'UQ Jetty 2 Export Terminal',
      asset: 'UQ',
      status: 'Approved',
      priority: 'High',
      progress: 100,
      created: '2024-01-10',
      pssrLead: 'Mohammed Hassan',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 0,
      completedDate: '2024-02-08',
      riskLevel: 'Low',
      nextReview: null
    },
    {
      id: 'SSU-2024-004',
      projectId: 'DP 317',
      projectName: 'Majnoon New Gas Tie-in',
      asset: 'NRNGL',
      status: 'Under Review',
      priority: 'Critical',
      progress: 45,
      created: '2024-01-25',
      pssrLead: 'Omar Al-Basri',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=150&h=150&fit=crop&crop=face',
      pendingApprovals: 5,
      completedDate: null,
      riskLevel: 'High',
      nextReview: '2024-02-10'
    }
  ];

  // Get unique values for filter options
  const uniquePlants = [...new Set(pssrList.map(pssr => pssr.asset))];
  const uniqueStatuses = [...new Set(pssrList.map(pssr => pssr.status))];
  const uniqueLeads = [...new Set(pssrList.map(pssr => pssr.pssrLead))];

  // Dashboard statistics
  const stats = {
    total: pssrList.length,
    approved: pssrList.filter(p => p.status === 'Approved').length,
    underReview: pssrList.filter(p => p.status === 'Under Review').length,
    draft: pssrList.filter(p => p.status === 'Draft').length,
    criticalIssues: pssrList.filter(p => p.priority === 'Critical').length
  };

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

  // Handle search input change with real-time filtering
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'Under Review': return <Clock className="h-4 w-4 text-warning" />;
      case 'Draft': return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-warning text-warning-foreground';
      case 'Medium': return 'bg-primary text-primary-foreground';
      case 'Low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/20">
      {/* Modern Header */}
      <header className="fluent-navigation sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="fluent-button hover:bg-secondary/80 group"
              >
                <ArrowLeft className="h-4 w-4 mr-3 group-hover:-translate-x-1 transition-transform duration-200" />
                <span className="font-medium">Back to Dashboard</span>
              </Button>
              
              <div className="h-8 w-px bg-border"></div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Safe Start-Up Management</h1>
                  <p className="text-sm text-muted-foreground font-medium">Pre-Start-Up Safety Review System</p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-4">
              <Button 
                variant="outline"
                className="fluent-button border-border/50 hover:bg-secondary/50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                onClick={() => setActiveView('create')}
                className="fluent-button bg-primary hover:bg-primary-hover text-primary-foreground shadow-fluent-md hover:shadow-fluent-lg group"
              >
                <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                New Safe Start-Up Review
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="fluent-card p-6 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{stats.total}</div>
            <div className="text-sm text-muted-foreground font-medium">Total Reviews</div>
          </div>

          <div className="fluent-card p-6 text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{stats.approved}</div>
            <div className="text-sm text-muted-foreground font-medium">Approved</div>
          </div>

          <div className="fluent-card p-6 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{stats.underReview}</div>
            <div className="text-sm text-muted-foreground font-medium">Under Review</div>
          </div>

          <div className="fluent-card p-6 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{stats.draft}</div>
            <div className="text-sm text-muted-foreground font-medium">Draft</div>
          </div>

          <div className="fluent-card p-6 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{stats.criticalIssues}</div>
            <div className="text-sm text-muted-foreground font-medium">Critical</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="fluent-card p-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search reviews by ID, project, asset, or lead..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 h-12 rounded-xl border-border/50 bg-muted/20 focus:bg-background transition-colors duration-200"
              />
            </div>
            
            <div className="flex items-center gap-4">
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
            </div>
          </div>
        </div>

        {/* Enhanced PSSR List */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Safe Start-Up Reviews ({filteredPSSRs.length})
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {filteredPSSRs.length} of {stats.total} reviews</span>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredPSSRs.map((pssr, index) => (
              <div 
                key={pssr.id} 
                className="fluent-card p-6 hover:shadow-fluent-lg transition-all duration-300 cursor-pointer group animate-fade-in"
                style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                onClick={() => handleViewDetails(pssr.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 flex-1">
                    {/* Status Indicator */}
                    <div className="flex items-center gap-3">
                      {getStatusIcon(pssr.status)}
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                          {pssr.id}
                        </div>
                        <div className="text-sm text-muted-foreground">{pssr.projectId}</div>
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors duration-200">
                        {pssr.projectName}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Asset: {pssr.asset}</span>
                        <span>•</span>
                        <span>Created: {new Date(pssr.created).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Priority Badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(pssr.priority)}`}>
                      {pssr.priority}
                    </div>

                    {/* Progress */}
                    <div className="text-center">
                      <div className="text-lg font-semibold text-foreground">{pssr.progress}%</div>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${pssr.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Lead */}
                    <div className="flex items-center gap-3">
                      <img 
                        src={pssr.pssrLeadAvatar} 
                        alt={pssr.pssrLead}
                        className="w-10 h-10 rounded-full border-2 border-border"
                      />
                      <div className="text-sm">
                        <div className="font-medium text-foreground">{pssr.pssrLead}</div>
                        <div className="text-muted-foreground">Lead</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {pssr.pendingApprovals > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-warning/10 text-warning rounded-lg text-sm font-medium">
                        <Clock className="h-3 w-3" />
                        {pssr.pendingApprovals} pending
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPSSRs.length === 0 && (
            <div className="fluent-card p-12 text-center">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No reviews found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || Object.values(filters).some(f => f.length > 0) 
                  ? "Try adjusting your search or filters" 
                  : "Create your first Safe Start-Up Review to get started"}
              </p>
              <Button 
                onClick={() => setActiveView('create')}
                className="fluent-button bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Review
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PSSRModule;
