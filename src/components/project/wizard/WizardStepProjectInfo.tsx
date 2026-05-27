import React, { useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useProjectHierarchy } from '@/hooks/useProjectHierarchy';
import { useHubs } from '@/hooks/useHubs';
import { usePlants } from '@/hooks/usePlants';
import { useFields } from '@/hooks/useFields';
import { useStations } from '@/hooks/useStations';

interface WizardStepProjectInfoProps {
  formData: {
    project_id_prefix: 'DP' | 'ST' | 'MoC' | '';
    project_id_number: string;
    project_title: string;
    region_id: string;
    hub_id: string;
    plant_id: string;
    field_id: string;
    station_id: string;
  };
  onFormDataChange: (updates: Partial<WizardStepProjectInfoProps['formData']>) => void;
}

const prefixOptions = [
  { value: 'DP', label: 'DP' },
  { value: 'ST', label: 'ST' },
  { value: 'MoC', label: 'MoC' }
];

const WizardStepProjectInfo: React.FC<WizardStepProjectInfoProps> = ({
  formData,
  onFormDataChange,
}) => {
  const { regions } = useProjectRegions();
  const { regions: hierarchyRegions } = useProjectHierarchy();
  const { data: hubs = [], createHub } = useHubs();
  const { plants } = usePlants();
  const { allFields } = useFields() as any;
  const { allStations } = useStations() as any;

  const filteredHubs = useMemo(() => {
    if (!formData.region_id) return hubs;
    const selectedRegion = hierarchyRegions.find(r => r.id === formData.region_id);
    if (!selectedRegion) return hubs;
    const hubIdsInRegion = selectedRegion.hubs.map(h => h.id);
    return hubs.filter(hub => hubIdsInRegion.includes(hub.id));
  }, [formData.region_id, hierarchyRegions, hubs]);

  // Fields filtered by selected plant
  const fieldsForPlant = useMemo(() => {
    if (!formData.plant_id || !allFields) return [] as any[];
    return (allFields as any[]).filter((f: any) => f.plant_id === formData.plant_id);
  }, [allFields, formData.plant_id]);

  // Stations filtered by selected field (or by plant if no fields exist for that plant)
  const stationsForField = useMemo(() => {
    if (!allStations) return [] as any[];
    if (formData.field_id) {
      return (allStations as any[]).filter((s: any) => s.field_id === formData.field_id);
    }
    // If a plant is selected but it has no fields, allow direct station selection by plant
    if (formData.plant_id && fieldsForPlant.length === 0) {
      const plant = plants.find(p => p.id === formData.plant_id);
      return (allStations as any[]).filter((s: any) => s.plant_name === plant?.name);
    }
    return [];
  }, [allStations, formData.field_id, formData.plant_id, fieldsForPlant.length, plants]);

  const selectedPlant = plants.find(p => p.id === formData.plant_id);
  const hasFields = fieldsForPlant.length > 0;
  const hasStations = stationsForField.length > 0;

  // Sub-area label adapts to the plant context
  const subAreaLabel = useMemo(() => {
    if (!selectedPlant) return 'Sub-area';
    const name = selectedPlant.name.toUpperCase();
    if (name === 'CS') return 'Major Zone';
    if (name === 'KAZ') return 'Unit / Area';
    if (name === 'UQ') return 'Terminal';
    return 'Sub-area';
  }, [selectedPlant]);

  // Clear downstream selections when parent changes
  useEffect(() => {
    if (formData.field_id && !fieldsForPlant.find((f: any) => f.id === formData.field_id)) {
      onFormDataChange({ field_id: '' });
    }
  }, [formData.plant_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (formData.station_id && !stationsForField.find((s: any) => s.id === formData.station_id)) {
      onFormDataChange({ station_id: '' });
    }
  }, [formData.field_id, formData.plant_id]); // eslint-disable-line react-hooks/exhaustive-deps

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
            {formData.project_id_prefix}-{formData.project_id_number}
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

      {/* Portfolio + Hub */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
            onCreateNew={async (name) => { await createHub(name); }}
            placeholder="Select or create hub"
            emptyText="No hubs found"
            createText="Create hub"
            className="w-full"
          />
        </div>
      </div>

      {/* Plant → Sub-area → Station */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="plant">Plant</Label>
          <EnhancedCombobox
            options={plants.map(p => ({ value: p.id, label: p.name }))}
            value={formData.plant_id}
            onValueChange={(value) =>
              onFormDataChange({ plant_id: value, field_id: '', station_id: '' })
            }
            placeholder="Select plant"
            emptyText="No plants found"
            allowCreate={false}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="field">{subAreaLabel}</Label>
          <EnhancedCombobox
            options={fieldsForPlant.map((f: any) => ({ value: f.id, label: f.name }))}
            value={formData.field_id}
            onValueChange={(value) => onFormDataChange({ field_id: value, station_id: '' })}
            placeholder={hasFields ? `Select ${subAreaLabel.toLowerCase()}` : 'Not applicable'}
            emptyText={formData.plant_id ? `No ${subAreaLabel.toLowerCase()}s found` : 'Select a plant first'}
            allowCreate={false}
            disabled={!formData.plant_id || !hasFields}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="station">Station</Label>
          <EnhancedCombobox
            options={stationsForField.map((s: any) => ({ value: s.id, label: s.name }))}
            value={formData.station_id}
            onValueChange={(value) => onFormDataChange({ station_id: value })}
            placeholder={hasStations ? 'Select station' : 'Not applicable'}
            emptyText={
              !formData.plant_id
                ? 'Select a plant first'
                : hasFields && !formData.field_id
                  ? `Select a ${subAreaLabel.toLowerCase()} first`
                  : 'No stations found'
            }
            allowCreate={false}
            disabled={!hasStations}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default WizardStepProjectInfo;
