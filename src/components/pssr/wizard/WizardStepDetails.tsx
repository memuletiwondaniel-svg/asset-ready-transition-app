import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, MapPin, Layers, FileText } from 'lucide-react';
import { usePlants } from '@/hooks/usePlants';
import { useFields } from '@/hooks/useFields';
import { useStations } from '@/hooks/useStations';
import RichTextEditor, { Attachment } from '@/components/ui/RichTextEditor';

interface WizardStepDetailsProps {
  title: string;
  onTitleChange: (title: string) => void;
  scopeDescription: string;
  scopeAttachments: Attachment[];
  onScopeChange: (html: string) => void;
  onAttachmentsChange: (attachments: Attachment[]) => void;
  plantId: string;
  fieldId: string;
  stationId: string;
  onPlantChange: (plantId: string) => void;
  onFieldChange: (fieldId: string) => void;
  onStationChange: (stationId: string) => void;
}

const WizardStepDetails: React.FC<WizardStepDetailsProps> = ({
  title,
  onTitleChange,
  scopeDescription,
  scopeAttachments,
  onScopeChange,
  onAttachmentsChange,
  plantId,
  fieldId,
  stationId,
  onPlantChange,
  onFieldChange,
  onStationChange,
}) => {
  const { plants, isLoading: plantsLoading } = usePlants();
  const { allFields, isLoading: fieldsLoading } = useFields();
  const { allStations, isLoading: stationsLoading } = useStations();

  // Filter fields by selected plant
  const filteredFields = useMemo(() => {
    if (!plantId || !allFields) return [];
    return allFields.filter(f => f.plant_id === plantId);
  }, [allFields, plantId]);

  // Filter stations by selected field
  const filteredStations = useMemo(() => {
    if (!fieldId || !allStations) return [];
    return allStations.filter(s => s.field_id === fieldId);
  }, [allStations, fieldId]);

  // Show field selector if the selected plant has fields
  const hasFields = useMemo(() => {
    if (!plantId || !allFields) return false;
    return allFields.some(f => f.plant_id === plantId);
  }, [allFields, plantId]);

  // Show station selector if the selected field has stations
  const hasStations = useMemo(() => {
    if (!fieldId || !allStations) return false;
    return allStations.some(s => s.field_id === fieldId);
  }, [allStations, fieldId]);

  // Dynamic label for the second level based on selected plant name
  const selectedPlantName = useMemo(() => {
    if (!plantId || !plants) return '';
    return plants.find(p => p.id === plantId)?.name || '';
  }, [plants, plantId]);

  const secondLevelLabel = useMemo(() => {
    const upper = selectedPlantName.toUpperCase();
    if (upper === 'KAZ') return 'Unit';
    if (upper === 'UQ') return 'Site';
    return 'Field';
  }, [selectedPlantName]);

  return (
    <div className="space-y-6">
      {/* PSSR Title */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <Label htmlFor="pssr-title" className="text-base font-medium">PSSR Title *</Label>
        </div>
        <Input
          id="pssr-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter a descriptive title for this PSSR"
          maxLength={200}
        />
      </div>

      {/* Scope Description */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Detailed Scope</Label>
        <p className="text-sm text-muted-foreground">
          Provide a detailed description of the PSSR scope. You can paste or drag & drop images and attach supporting documents.
        </p>
        <RichTextEditor
          value={scopeDescription}
          onChange={onScopeChange}
          attachments={scopeAttachments}
          onAttachmentsChange={onAttachmentsChange}
          placeholder="Describe the scope of this PSSR including safety systems, process controls, emergency procedures, etc..."
          storageBucket="pssr-attachments"
          storagePath="scope"
        />
      </div>

      {/* Asset Location */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <Label className="text-base font-medium">Location *</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Select the asset location using the hierarchy below
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Plant Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="plant" className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4" />
              Plant *
            </Label>
            <Select
              value={plantId}
              onValueChange={(value) => {
                onPlantChange(value);
                onFieldChange('');
                onStationChange('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={plantsLoading ? "Loading..." : "Select plant"} />
              </SelectTrigger>
              <SelectContent>
                {plants?.map((plant) => (
                  <SelectItem key={plant.id} value={plant.id}>
                    {plant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field / Unit / Site Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="field" className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4" />
              {secondLevelLabel}
            </Label>
            <Select
              value={fieldId}
              onValueChange={(value) => {
                onFieldChange(value);
                onStationChange('');
              }}
              disabled={!plantId || !hasFields}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !plantId
                    ? "Select plant first"
                    : !hasFields
                      ? "N/A"
                      : fieldsLoading
                        ? "Loading..."
                        : `Select ${secondLevelLabel.toLowerCase()}`
                } />
              </SelectTrigger>
              <SelectContent>
                {filteredFields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Station Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="station" className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              Station
            </Label>
            <Select
              value={stationId}
              onValueChange={onStationChange}
              disabled={!fieldId || !hasStations}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !fieldId
                    ? `Select ${secondLevelLabel.toLowerCase()} first`
                    : !hasStations
                      ? "N/A"
                      : stationsLoading
                        ? "Loading..."
                        : "Select station"
                } />
              </SelectTrigger>
              <SelectContent>
                {filteredStations.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardStepDetails;
