import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useProjectHierarchy } from '@/hooks/useProjectHierarchy';
import { useHubs } from '@/hooks/useHubs';
import { useStations } from '@/hooks/useStations';

interface WizardStepProjectInfoProps {
  formData: {
    project_id_prefix: 'DP' | 'ST' | 'MoC' | '';
    project_id_number: string;
    project_title: string;
    region_id: string;
    hub_id: string;
  };
  selectedLocationIds: string[];
  onFormDataChange: (updates: Partial<WizardStepProjectInfoProps['formData']>) => void;
  onLocationIdsChange: (ids: string[]) => void;
}

const prefixOptions = [
  { value: 'DP', label: 'DP - Development Project' },
  { value: 'ST', label: 'ST - Study' },
  { value: 'MoC', label: 'MoC - Management of Change' }
];

const WizardStepProjectInfo: React.FC<WizardStepProjectInfoProps> = ({
  formData,
  selectedLocationIds,
  onFormDataChange,
  onLocationIdsChange,
}) => {
  const { regions } = useProjectRegions();
  const { regions: hierarchyRegions } = useProjectHierarchy();
  const { data: hubs = [], createHub } = useHubs();
  const { stations } = useStations();

  // Get hubs filtered by selected region
  const filteredHubs = useMemo(() => {
    if (!formData.region_id) return hubs;
    
    const selectedRegion = hierarchyRegions.find(r => r.id === formData.region_id);
    if (!selectedRegion) return hubs;
    
    const hubIdsInRegion = selectedRegion.hubs.map(h => h.id);
    return hubs.filter(hub => hubIdsInRegion.includes(hub.id));
  }, [formData.region_id, hierarchyRegions, hubs]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Project Information</h3>
        <p className="text-sm text-muted-foreground">
          Enter the basic project details including ID, title, and location information.
        </p>
      </div>

      {/* Project ID */}
      <div className="space-y-2">
        <Label htmlFor="project_id">Project ID *</Label>
        <div className="flex gap-2">
          <EnhancedCombobox
            options={prefixOptions}
            value={formData.project_id_prefix}
            onValueChange={(value) => 
              onFormDataChange({ project_id_prefix: value as 'DP' | 'ST' | 'MoC' })
            }
            placeholder="Prefix"
            allowCreate={false}
            className="w-40"
          />
          <Input
            value={formData.project_id_number}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              onFormDataChange({ project_id_number: value });
            }}
            placeholder="Enter numbers only"
            className="flex-1"
          />
        </div>
        {formData.project_id_prefix && formData.project_id_number && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {formData.project_id_prefix}{formData.project_id_number}
          </Badge>
        )}
      </div>

      {/* Project Title */}
      <div className="space-y-2">
        <Label htmlFor="project_title">Project Title *</Label>
        <Input
          id="project_title"
          value={formData.project_title}
          onChange={(e) => onFormDataChange({ project_title: e.target.value })}
          placeholder="Enter project title"
        />
      </div>

      {/* Portfolio, Hub, and Locations */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="region">Portfolio (Region)</Label>
          <EnhancedCombobox
            options={regions.map(region => ({ value: region.id, label: region.name }))}
            value={formData.region_id}
            onValueChange={(value) => {
              onFormDataChange({ region_id: value, hub_id: '' });
            }}
            placeholder="Select portfolio"
            emptyText="No portfolios found"
            allowCreate={false}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hub">Project Hub</Label>
          <EnhancedCombobox
            options={filteredHubs.map(hub => ({ value: hub.id, label: hub.name }))}
            value={formData.hub_id}
            onValueChange={(value) => onFormDataChange({ hub_id: value })}
            onCreateNew={async (name) => {
              await createHub(name);
            }}
            placeholder="Select or create hub"
            emptyText="No hubs found"
            createText="Create hub"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locations">Locations (Stations)</Label>
          <MultiSelectCombobox
            options={stations.map(station => ({ value: station.id, label: station.name }))}
            selectedValues={selectedLocationIds}
            onValueChange={onLocationIdsChange}
            placeholder="Select locations"
            emptyText="No locations found"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default WizardStepProjectInfo;
