import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Plug, Search, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AdminHeader from '@/components/admin/AdminHeader';

interface APIManagementProps {
  onBack: () => void;
}

const predefinedAPIs = [
  { id: 'sap4hana', name: 'SAP4HANA', description: 'Enterprise resource planning and business operations', category: 'ERP' },
  { id: 'primavera-p6', name: 'Primavera P6', description: 'Project planning, scheduling and control', category: 'Project Management' },
  { id: 'gocompletions', name: 'GoCompletions', description: 'Completions and commissioning management', category: 'Completions' },
  { id: 'assai', name: 'Assai', description: 'Document management and control', category: 'Document Management' },
  { id: 'sharepoint', name: 'SharePoint', description: 'Collaboration and document storage platform', category: 'Collaboration' },
];

const APIManagement: React.FC<APIManagementProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAPIs = predefinedAPIs.filter(api =>
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AdminHeader
        title="APIs"
        description="Configure interfaces between ORSH and external applications"
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
          {filteredAPIs.map((api) => (
            <Card key={api.id} className="border-border/40 hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Plug className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{api.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1 text-xs">{api.category}</Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-muted-foreground">Not configured</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{api.description}</p>
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Configure
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAPIs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Plug className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No APIs match your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default APIManagement;
