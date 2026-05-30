import React, { useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useProjectHierarchy } from '@/hooks/useProjectHierarchy';
import { useHubs } from '@/hooks/useHubs';
import { usePlants } from '@/hooks/usePlants';
import { useFields } from '@/hooks/useFields';
import { useStations } from '@/hooks/useStations';
import { useProjectIdAvailability } from '@/hooks/useProjectIdAvailability';
import { OwnershipAssignmentPreview, PlantAssignmentPreview } from './LiveAssignmentPreview';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean; htmlFor?: string }> = ({
  children,
  required,
  htmlFor,
}) => (
  <label
    htmlFor={htmlFor}
    className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
  >
    {children}
    {required && <span className="text-destructive ml-0.5">*</span>}
  </label>
);

const GroupHeader: React.FC<{ title: string; helper?: string; withDivider?: boolean }> = ({
  title,
  helper,
  withDivider,
}) => (
  <div className={cn('mb-3', withDivider && 'pt-4 border-t border-border/40')}>
    <div className="flex items-baseline flex-wrap gap-x-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
        {title}
      </h3>
      {helper && (
        <span className="text-[11px] text-muted-foreground">— {helper}</span>
      )}
    </div>
  </div>
);

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

  useEffect(() => {
    if (!formData.project_id_prefix) {
      onFormDataChange({ project_id_prefix: 'DP' });
    }
  }, [formData.project_id_prefix, onFormDataChange]);

  const { conflict, isChecking } = useProjectIdAvailability(
    formData.project_id_prefix || 'DP',
    formData.project_id_number
  );

  const filteredHubs = useMemo(() => {
    if (!formData.region_id) return hubs;
    const selectedRegion = hierarchyRegions.find((r) => r.id === formData.region_id);
    if (!selectedRegion) return hubs;
    const hubIdsInRegion = selectedRegion.hubs.map((h) => h.id);
    return hubs.filter((hub) => hubIdsInRegion.includes(hub.id));
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
      const plant = plants.find((p) => p.id === formData.plant_id);
      return (allStations as any[]).filter((s: any) => s.plant_name === plant?.name);
    }
    return [];
  }, [allStations, formData.field_id, formData.plant_id, fieldsForPlant.length, plants]);

  const hasFields = fieldsForPlant.length > 0;
  const hasStations = stationsForField.length > 0;

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

  const regionName = regions.find((r) => r.id === formData.region_id)?.name || null;
  const hubName = hubs.find((h) => h.id === formData.hub_id)?.name || null;
  const plantName = plants.find((p) => p.id === formData.plant_id)?.name || null;

  return (
    <div className="space-y-5">
      <div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="project_id" required>
              Project ID
            </FieldLabel>
            <div
              className={cn(
                'flex h-10 w-full rounded-md border bg-background ring-offset-background overflow-hidden',
                'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                conflict ? 'border-destructive' : 'border-input'
              )}
            >
              <span className="flex items-center px-3 text-sm font-semibold text-primary bg-primary/10 border-r border-input select-none tracking-wide font-mono">
                DP
              </span>
              <Input
                id="project_id"
                value={formData.project_id_number}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
                  onFormDataChange({ project_id_number: value });
                }}
                placeholder="0000"
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-full font-mono"
                maxLength={20}
              />
              {isChecking && (
                <span className="flex items-center px-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </span>
              )}
            </div>
            {conflict && (
              <p className="mt-1.5 text-xs text-destructive flex items-start gap-1">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                DP-{formData.project_id_number} already exists
                {conflict.project_title ? ` — ${conflict.project_title}` : ''}.
              </p>
            )}

          </div>

          <div className="sm:col-span-3">
            <FieldLabel htmlFor="project_title" required>
              Project Title
            </FieldLabel>
            <Input
              id="project_title"
              value={formData.project_title}
              onChange={(e) => onFormDataChange({ project_title: e.target.value })}
              placeholder="e.g. Crude Stabilization Upgrade"
              className="h-10"
            />
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-border">
        <div className="space-y-3">
          {/* Portfolio row */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Portfolio <span className="text-destructive">*</span>
            </label>
            <EnhancedCombobox
              options={regions.map((region) => ({ value: region.id, label: region.name }))}
              value={formData.region_id}
              onValueChange={(value) => onFormDataChange({ region_id: value, hub_id: '' })}
              placeholder="Select portfolio"
              emptyText="No portfolios found"
              allowCreate={false}
              showSearch={false}
              className="w-full"
            />
          </div>

          {/* Project Hub row */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Project Hub <span className="text-destructive">*</span>
            </label>
            <EnhancedCombobox
              options={filteredHubs.map((hub) => ({ value: hub.id, label: hub.name }))}
              value={formData.hub_id}
              onValueChange={(value) => onFormDataChange({ hub_id: value })}
              onCreateNew={async (name) => {
                await createHub(name);
              }}
              placeholder={formData.region_id ? 'Select hub' : 'Choose a portfolio first'}
              emptyText="No hubs found"
              createText="Create hub"
              disabled={!formData.region_id}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-border">


        <div className="space-y-3">
          {/* Plant row */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Plant <span className="text-destructive">*</span>
            </label>
            <EnhancedCombobox
              options={plants.map((p) => ({ value: p.id, label: p.name }))}
              value={formData.plant_id}
              onValueChange={(value) =>
                onFormDataChange({ plant_id: value, field_id: '', station_id: '' })
              }
              placeholder="Select plant"
              emptyText="No plants found"
              allowCreate={false}
              showSearch={false}
              className="w-full"
            />
          </div>

          {/* Field row */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Field{hasFields && <span className="text-destructive"> *</span>}
            </label>
            <EnhancedCombobox
              options={fieldsForPlant.map((f: any) => ({ value: f.id, label: f.name }))}
              value={formData.field_id}
              onValueChange={(value) => onFormDataChange({ field_id: value, station_id: '' })}
              placeholder={
                !formData.plant_id
                  ? 'Choose a plant first'
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

          {/* Station row */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Station{hasStations && <span className="text-destructive"> *</span>}
            </label>
            <EnhancedCombobox
              options={stationsForField.map((s: any) => ({ value: s.id, label: s.name }))}
              value={formData.station_id}
              onValueChange={(value) => onFormDataChange({ station_id: value })}
              placeholder={
                !formData.plant_id
                  ? 'Choose a plant first'
                  : hasFields && !formData.field_id
                    ? 'Choose a field first'
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
        <PlantAssignmentPreview plantName={plantName} />
      </div>

    </div>
  );
};

export default WizardStepProjectInfo;
