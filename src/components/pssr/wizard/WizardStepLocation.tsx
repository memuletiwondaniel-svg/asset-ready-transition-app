import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, MapPin } from 'lucide-react';
import ProjectHierarchySelector from './ProjectHierarchySelector';
import AssetHierarchySelector from './AssetHierarchySelector';
import { Project } from '@/hooks/useProjects';
import { PSSRReasonCategory } from '@/hooks/usePSSRReasonCategories';

type LocationMode = 'project' | 'asset';

interface WizardStepLocationProps {
  categoryCode: string | undefined;
  // Project-based fields
  projectId: string;
  selectedProject: Project | null;
  onProjectChange: (projectId: string, project: Project | null) => void;
  // Asset-based fields
  plantId: string;
  fieldId: string;
  stationId: string;
  onPlantChange: (plantId: string) => void;
  onFieldChange: (fieldId: string) => void;
  onStationChange: (stationId: string) => void;
  // Location mode
  locationMode: LocationMode;
  onLocationModeChange: (mode: LocationMode) => void;
}

const WizardStepLocation: React.FC<WizardStepLocationProps> = ({
  categoryCode,
  projectId,
  selectedProject,
  onProjectChange,
  plantId,
  fieldId,
  stationId,
  onPlantChange,
  onFieldChange,
  onStationChange,
  locationMode,
  onLocationModeChange,
}) => {
  // Determine which mode to show based on category
  const isProjectOnly = categoryCode === 'PROJECT_STARTUP' || categoryCode === 'BFM_PROJECTS' || categoryCode === 'PE_PROJECTS';
  const isAssetOnly = categoryCode === 'INCIDENCE' || categoryCode === 'OPS_MTCE';
  const isFlexible = !isProjectOnly && !isAssetOnly;

  // If category forces a mode, use that mode
  const effectiveMode = isProjectOnly ? 'project' : isAssetOnly ? 'asset' : locationMode;

  // For project-only or asset-only categories, render directly
  if (isProjectOnly) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-medium mb-1">Project Selection</h3>
          <p className="text-sm text-muted-foreground">
            Select the project for this PSSR. You can search by project ID or title.
          </p>
        </div>
        <ProjectHierarchySelector
          projectId={projectId}
          onProjectChange={onProjectChange}
          selectedProject={selectedProject}
        />
      </div>
    );
  }

  if (isAssetOnly) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-medium mb-1">Asset Location</h3>
          <p className="text-sm text-muted-foreground">
            Select the asset location (Plant, Field, Station) for this PSSR.
          </p>
        </div>
        <AssetHierarchySelector
          plantId={plantId}
          fieldId={fieldId}
          stationId={stationId}
          onPlantChange={onPlantChange}
          onFieldChange={onFieldChange}
          onStationChange={onStationChange}
        />
      </div>
    );
  }

  // For flexible categories, show tabs
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium mb-1">Location / Context</h3>
        <p className="text-sm text-muted-foreground">
          Choose how you want to identify the location for this PSSR
        </p>
      </div>

      <Tabs value={effectiveMode} onValueChange={(v) => onLocationModeChange(v as LocationMode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="project" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            By Project
          </TabsTrigger>
          <TabsTrigger value="asset" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            By Asset Location
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="project" className="mt-4">
          <ProjectHierarchySelector
            projectId={projectId}
            onProjectChange={onProjectChange}
            selectedProject={selectedProject}
          />
        </TabsContent>
        
        <TabsContent value="asset" className="mt-4">
          <AssetHierarchySelector
            plantId={plantId}
            fieldId={fieldId}
            stationId={stationId}
            onPlantChange={onPlantChange}
            onFieldChange={onFieldChange}
            onStationChange={onStationChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WizardStepLocation;
