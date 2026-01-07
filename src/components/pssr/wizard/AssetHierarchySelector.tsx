import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Building, Layers } from 'lucide-react';
import { usePlants } from '@/hooks/usePlants';
import { useFields } from '@/hooks/useFields';
import { useStations } from '@/hooks/useStations';

interface AssetHierarchySelectorProps {
  plantId: string;
  fieldId: string;
  stationId: string;
  onPlantChange: (plantId: string) => void;
  onFieldChange: (fieldId: string) => void;
  onStationChange: (stationId: string) => void;
}

const AssetHierarchySelector: React.FC<AssetHierarchySelectorProps> = ({
  plantId,
  fieldId,
  stationId,
  onPlantChange,
  onFieldChange,
  onStationChange,
}) => {
  const { plants, isLoading: plantsLoading } = usePlants();
  const { fields, isLoading: fieldsLoading } = useFields();
  const { stations, isLoading: stationsLoading } = useStations();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-base font-medium">Asset Location</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Select the location where the PSSR applies using the asset hierarchy
      </p>

      {/* Plant Selection */}
      <div className="space-y-2">
        <Label htmlFor="plant" className="flex items-center gap-2">
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
            <SelectValue placeholder={plantsLoading ? "Loading plants..." : "Select a plant"} />
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

      {/* Field Selection */}
      <div className="space-y-2">
        <Label htmlFor="field" className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Field
        </Label>
        <Select
          value={fieldId}
          onValueChange={(value) => {
            onFieldChange(value);
            onStationChange('');
          }}
          disabled={!plantId}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !plantId 
                ? "Select a plant first" 
                : fieldsLoading 
                  ? "Loading fields..." 
                  : "Select a field (optional)"
            } />
          </SelectTrigger>
          <SelectContent>
            {fields?.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Station Selection */}
      <div className="space-y-2">
        <Label htmlFor="station" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Station / CS Location
        </Label>
        <Select
          value={stationId}
          onValueChange={onStationChange}
          disabled={!plantId}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !plantId 
                ? "Select a plant first" 
                : stationsLoading 
                  ? "Loading stations..." 
                  : "Select a station (optional)"
            } />
          </SelectTrigger>
          <SelectContent>
            {stations?.map((station) => (
              <SelectItem key={station.id} value={station.id}>
                {station.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default AssetHierarchySelector;
