import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Plug, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AdminHeader from '@/components/admin/AdminHeader';
import APIConfigWizard from './APIConfigWizard';
import { isAPIConfigured } from '@/lib/api-config-storage';

import sapLogo from '@/assets/logos/sap4hana.png';
import primaveraLogo from '@/assets/logos/primavera.png';
import gocompletionsLogo from '@/assets/logos/gocompletions.png';
import assaiLogo from '@/assets/logos/assai.png';
import sharepointLogo from '@/assets/logos/sharepoint.png';
import teamsLogo from '@/assets/logos/teams.png';

interface APIManagementProps {
  onBack: () => void;
}

const predefinedAPIs = [
  { id: 'sap4hana', name: 'SAP S/4HANA', description: 'Enterprise resource planning and business operations', category: 'ERP', logo: sapLogo, scale: 0.8 },
  { id: 'primavera-p6', name: 'Oracle Primavera P6', description: 'Project planning, scheduling and control', category: 'Project Management', logo: primaveraLogo, scale: 1.3 },
  { id: 'gocompletions', name: 'GoCompletions', description: 'Completions and commissioning management', category: 'Completions', logo: gocompletionsLogo },
  { id: 'assai', name: 'Assai', description: 'Document management and control', category: 'Document Management', logo: assaiLogo, scale: 0.79 },
  { id: 'sharepoint', name: 'SharePoint', description: 'Collaboration and document storage platform', category: 'Collaboration', logo: sharepointLogo, scale: 1.6 },
  { id: 'teams', name: 'Microsoft Teams', description: 'Team communication and collaboration platform', category: 'Communication', logo: teamsLogo },
];

const APIManagement: React.FC<APIManagementProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAPI, setSelectedAPI] = useState<typeof predefinedAPIs[0] | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [configuredAPIs, setConfiguredAPIs] = useState<Set<string>>(new Set());

  // Check which APIs are configured on mount
  useEffect(() => {
    const configured = new Set<string>();
    predefinedAPIs.forEach((api) => {
      if (isAPIConfigured(api.id)) configured.add(api.id);
    });
    setConfiguredAPIs(configured);
  }, []);

  const filteredAPIs = predefinedAPIs.filter(api =>
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCardClick = (api: typeof predefinedAPIs[0]) => {
    setSelectedAPI(api);
    setWizardOpen(true);
  };

  const handleConfigured = (apiId: string) => {
    setConfiguredAPIs((prev) => new Set([...prev, apiId]));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AdminHeader
        title="APIs"
        description="Configure interfaces between ORSH and external applications"
        icon={<Plug className="h-6 w-6" />}
        iconGradient="from-blue-500 to-indigo-600"
        customBreadcrumbs={[
          { label: 'Home', path: '/', onClick: onBack },
          { label: 'Administration', path: '/admin-tools', onClick: onBack }
        ]}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">Connected APIs</h2>
            <Badge variant="outline" className="px-3 py-1">{filteredAPIs.length} available</Badge>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add API
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 max-w-md">
          <Input
            placeholder="Search APIs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* API Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAPIs.map((api) => {
            const isConfigured = configuredAPIs.has(api.id);
            return (
              <Card
                key={api.id}
                interactive
                className="border-border/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                onClick={() => handleCardClick(api)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-end mb-3">
                    {isConfigured ? (
                      <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200">Configured</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Not configured</Badge>
                    )}
                  </div>
                  <div className="h-16 flex items-center justify-center bg-white rounded-lg border border-border/30 p-3">
                    <img src={api.logo} alt={`${api.name} logo`} className="h-full max-w-full object-contain" style={api.scale ? { transform: `scale(${api.scale})` } : undefined} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground truncate">{api.description}</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Configure
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredAPIs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Plug className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No APIs match your search criteria.</p>
          </div>
        )}
      </div>

      {/* Config Wizard */}
      <APIConfigWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        api={selectedAPI}
        onConfigured={handleConfigured}
      />
    </div>
  );
};

export default APIManagement;
