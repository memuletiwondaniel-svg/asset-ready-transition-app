import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';
import assaiIcon from '@/assets/assai-icon.png';
import wrenchIcon from '@/assets/wrench-icon.png';
import documentumLogo from '@/assets/documentum-logo-clean.png';
import sharepointLogo from '@/assets/sharepoint-logo-clean.png';

interface ProjectContextStepProps {
  projectCode: string;
  onProjectCodeChange: (code: string) => void;
  plantCode: string;
  onPlantCodeChange: (code: string) => void;
  dmsPlatforms: string[];
  onDmsPlatformsChange: (platforms: string[]) => void;
}

const DMS_PLATFORMS = [
  { id: 'assai', label: 'Assai', description: 'Document management for oil & gas', logo: assaiIcon },
  { id: 'wrench', label: 'Wrench', description: 'Engineering document management', logo: wrenchIcon },
  { id: 'documentum', label: 'Documentum', description: 'Enterprise content platform', logo: documentumLogo },
  { id: 'sharepoint', label: 'SharePoint', description: 'Microsoft collaboration platform', logo: sharepointLogo },
];

export const ProjectContextStep: React.FC<ProjectContextStepProps> = ({
  projectCode, onProjectCodeChange, plantCode, onPlantCodeChange,
  dmsPlatforms, onDmsPlatformsChange,
}) => {
  const { data: projects = [] } = useQuery({
    queryKey: ['dms-projects-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_projects')
        .select('code, project_name')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['dms-plants-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_plants')
        .select('code, plant_name')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const togglePlatform = (id: string) => {
    onDmsPlatformsChange(
      dmsPlatforms.includes(id)
        ? dmsPlatforms.filter(p => p !== id)
        : [...dmsPlatforms, id]
    );
  };

  const projectOptions = projects.map((p: any) => ({
    value: p.code,
    label: `${p.code} ${p.project_name}`,
    displayValue: p.code,
  }));

  const plantOptions = plants.map((p: any) => ({
    value: p.code,
    label: `${p.code} — ${p.plant_name}`,
    displayValue: p.code,
  }));

  const selectedProject = projects.find((p: any) => p.code === projectCode);
  const selectedPlant = plants.find((p: any) => p.code === plantCode);

  return (
    <div className="px-6 py-4 space-y-4 max-w-2xl mx-auto">
      {/* Guidance Banner — compact */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[12px] text-muted-foreground leading-snug">
          <span className="font-medium text-foreground">Document Identification Workflow</span>
          {' — '}Verify project context, select DMS platform(s), then identify required documents.
        </p>
      </div>

      {/* Project Context Fields */}
      <fieldset className="space-y-1.5">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-2 mb-1.5">
          Project Context
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Project Code *</Label>
            <EnhancedSearchableCombobox
              options={projectOptions}
              value={projectCode}
              onValueChange={onProjectCodeChange}
              placeholder="Select project…"
              searchPlaceholder="Search projects…"
              className="h-9"
            />
            {selectedProject && (
              <p className="text-[11px] text-muted-foreground pl-1 leading-tight">{selectedProject.project_name}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Plant Code *</Label>
            <EnhancedSearchableCombobox
              options={plantOptions}
              value={plantCode}
              onValueChange={onPlantCodeChange}
              placeholder="Select plant…"
              searchPlaceholder="Search plants…"
              className="h-9"
            />
            {selectedPlant && (
              <p className="text-[11px] text-muted-foreground pl-1 leading-tight">{selectedPlant.plant_name}</p>
            )}
          </div>
        </div>
      </fieldset>

      <div className="h-px bg-border" />

      {/* DMS Platform Selection */}
      <fieldset className="space-y-2">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-1 mb-1">
          Document Management Systems *
        </legend>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Select one or more DMS platforms used on this project.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DMS_PLATFORMS.map(platform => {
            const isSelected = dmsPlatforms.includes(platform.id);
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => togglePlatform(platform.id)}
                className={cn(
                  'relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150 min-h-[56px]',
                  isSelected
                    ? 'border-2 border-primary bg-primary/5'
                    : 'border border-border/50 hover:border-muted-foreground/40 hover:bg-muted/30'
                )}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}

                <div className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center">
                  <img
                    src={platform.logo}
                    alt={platform.label}
                    className="w-8 h-8 rounded-md object-contain"
                  />
                </div>

                <p className={cn('text-[13px] font-medium leading-tight', isSelected && 'text-primary')}>
                  {platform.label}
                </p>
              </button>
            );
          })}
        </div>

        {dmsPlatforms.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {dmsPlatforms.length} platform{dmsPlatforms.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </fieldset>
    </div>
  );
};