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

const RequiredMark = () => <span className="text-destructive ml-0.5">*</span>;

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

  // Ensure prefix defaults to DP
  useEffect(() => {
    if (!formData.project_id_prefix) {
      onFormDataChange({ project_id_prefix: 'DP' });
    }
  }, [formData.project_id_prefix, onFormDataChange]);

  const filteredHubs = useMemo(() => {
    if (!formData.region_id) return hubs;
    const selectedRegion = hierarchyRegions.find(r => r.id === formData.region_id);
    if (!selectedRegion) return hubs;
    const hubIdsInRegion = selectedRegion.hubs.map(h => h.id);
    return hubs.filter(hub => hubIdsInRegion.includes(hub.id));
  }, [formData.region_id, hierarchyRegions, hubs]);

  const fieldsForPlant = useMemo(() => {
    if (!formData.plant_id || !allFields) return [] as any[];
    return (allFields as any[]).filter((f: any) => f.plant_id === formData.plant_id);
  }, [allFields, formData.plant_id]);

  const stationsForField = useMemo(() => {
    if (!allStations) return [] as any[];
    if (formData.field_id) {
      return (allStations as any[]).filter((s: any) => s.field_id === formData.field_id);
    }
    if (formData.plant_id && fieldsForPlant.length === 0) {
      const plant = plants.find(p => p.id === formData.plant_id);
      return (allStations as any[]).filter((s: any) => s.plant_name === plant?.name);
    }
    return [];
  }, [allStations, formData.field_id, formData.plant_id, fieldsForPlant.length, plants]);

  const hasFields = fieldsForPlant.length > 0;
  const hasStations = stationsForField.length > 0;

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
    <div className="space-y-5">
      {/* Project ID + Title row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="project_id">Project ID<RequiredMark /></Label>
          <div className="flex h-10 w-full rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
            <span className="flex items-center px-3 text-sm font-medium text-muted-foreground bg-muted/60 border-r border-input select-none">
              DP&nbsp;-
            </span>
            <Input
              id="project_id"
              value={formData.project_id_number}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onFormDataChange({ project_id_number: value });
              }}
              placeholder="0000"
              className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-full"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project_title">Project Title<RequiredMark /></Label>
          <Input
            id="project_title"
            value={formData.project_title}
            onChange={(e) => onFormDataChange({ project_title: e.target.value })}
            placeholder="e.g. Crude Stabilization Upgrade"
          />
        </div>
      </div>

      {formData.project_id_number && (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 -mt-2">
          DP-{formData.project_id_number}
        </Badge>
      )}

      {/* Portfolio + Hub */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="region">Portfolio<RequiredMark /></Label>
          <EnhancedCombobox
            options={regions.map(region => ({ value: region.id, label: region.name }))}
            value={formData.region_id}
            onValueChange={(value) => onFormDataChange({ region_id: value, hub_id: '' })}
            placeholder="Select portfolio"
            emptyText="No portfolios found"
            allowCreate={false}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hub">Project Hub<RequiredMark /></Label>
          <EnhancedCombobox
            options={filteredHubs.map(hub => ({ value: hub.id, label: hub.name }))}
            value={formData.hub_id}
            onValueChange={(value) => onFormDataChange({ hub_id: value })}
            onCreateNew={async (name) => { await createHub(name); }}
            placeholder={formData.region_id ? 'Select hub' : 'Select portfolio first'}
            emptyText="No hubs found"
            createText="Create hub"
            disabled={!formData.region_id}
            className="w-full"
          />
        </div>
      </div>

      {/* Plant → Field → Station */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="plant">Plant<RequiredMark /></Label>
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

        <div className="space-y-1.5">
          <Label htmlFor="field">
            Field{hasFields && <RequiredMark />}
          </Label>
          <EnhancedCombobox
            options={fieldsForPlant.map((f: any) => ({ value: f.id, label: f.name }))}
            value={formData.field_id}
            onValueChange={(value) => onFormDataChange({ field_id: value, station_id: '' })}
            placeholder={
              !formData.plant_id
                ? 'Select plant first'
                : hasFields
                  ? 'Select field'
                  : 'Not applicable'
            }
            emptyText={formData.plant_id ? 'No fields found' : 'Select a plant first'}
            allowCreate={false}
            disabled={!formData.plant_id || !hasFields}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="station">
            Station{hasStations && <RequiredMark />}
          </Label>
          <EnhancedCombobox
            options={stationsForField.map((s: any) => ({ value: s.id, label: s.name }))}
            value={formData.station_id}
            onValueChange={(value) => onFormDataChange({ station_id: value })}
            placeholder={
              !formData.plant_id
                ? 'Select plant first'
                : hasFields && !formData.field_id
                  ? 'Select field first'
                  : hasStations
                    ? 'Select station'
                    : 'Not applicable'
            }
            emptyText={
              !formData.plant_id
                ? 'Select a plant first'
                : hasFields && !formData.field_id
                  ? 'Select a field first'
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
