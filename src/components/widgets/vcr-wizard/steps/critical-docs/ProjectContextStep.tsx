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
  { id: 'assai', label: 'Assai', logo: assaiIcon, iconScale: 0.85 },
  { id: 'wrench', label: 'Wrench', logo: wrenchIcon, iconScale: 0.85 },
  { id: 'documentum', label: 'Documentum', logo: documentumLogo, iconScale: 0.85 },
  { id: 'sharepoint', label: 'SharePoint', logo: sharepointLogo, iconScale: 1.0 },
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
        .select('code, project_id, project_name')
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
    label: p.project_id && p.project_id.trim()
      ? `${p.code} — ${p.project_id} — ${p.project_name}`
      : `${p.code} — ${p.project_name}`,
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
    <div className="px-6 py-5 max-w-2xl mx-auto">
      {/* Guidance Banner — compact single line */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-primary/5 border border-primary/10">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[12px] text-muted-foreground leading-snug">
          <span className="font-medium text-foreground">Document Identification Workflow</span>
          {' — '}Verify project context, select DMS platform(s), then identify required documents.
        </p>
      </div>

      {/* Project Context Fields */}
      <fieldset className="mt-5">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
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
              <p className="text-[11px] text-muted-foreground pl-1 leading-tight">
                {selectedProject.project_id
                  ? `${selectedProject.project_id} — ${selectedProject.project_name}`
                  : selectedProject.project_name}
              </p>
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

      <div className="h-px bg-border mt-5" />

      {/* DMS Platform Selection */}
      <fieldset className="mt-5">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
          Document Management Systems *
        </legend>
        <p className="text-[11px] text-muted-foreground mb-3">
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
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 min-h-[64px]',
                  isSelected
                    ? 'bg-primary/8 ring-1 ring-primary/40 shadow-sm shadow-primary/10'
                    : 'bg-muted/30 hover:bg-muted/60 ring-1 ring-transparent hover:ring-border/60'
                )}
              >
                <div className="shrink-0 overflow-hidden flex items-center justify-center" style={{ width: 32, height: 32 }}>
                  <img
                    src={platform.logo}
                    alt={platform.label}
                    style={{ width: `${100 * platform.iconScale}%`, height: `${100 * platform.iconScale}%`, objectFit: 'contain' }}
                  />
                </div>

                <p className={cn('text-[13px] font-medium leading-tight', isSelected ? 'text-primary' : 'text-foreground')}>
                  {platform.label}
                </p>
              </button>
            );
          })}
        </div>

        {dmsPlatforms.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {dmsPlatforms.length} platform{dmsPlatforms.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </fieldset>
    </div>
  );
};