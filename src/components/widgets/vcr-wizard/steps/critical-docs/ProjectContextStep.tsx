import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import assaiLogo from '@/assets/assai-logo.png';
import wrenchLogo from '@/assets/wrench-logo.png';
import documentumLogo from '@/assets/documentum-logo.png';
import sharepointLogo from '@/assets/sharepoint-logo.png';

interface ProjectContextStepProps {
  projectCode: string;
  onProjectCodeChange: (code: string) => void;
  plantCode: string;
  onPlantCodeChange: (code: string) => void;
  dmsPlatforms: string[];
  onDmsPlatformsChange: (platforms: string[]) => void;
  projectAutoDetected?: boolean;
  plantAutoDetected?: boolean;
}

const DMS_PLATFORMS = [
  { id: 'assai', label: 'Assai', description: 'Document management for oil & gas', logo: assaiLogo },
  { id: 'wrench', label: 'Wrench', description: 'Engineering document management', logo: wrenchLogo },
  { id: 'documentum', label: 'Documentum', description: 'Enterprise content platform', logo: documentumLogo },
  { id: 'sharepoint', label: 'SharePoint', description: 'Microsoft collaboration platform', logo: sharepointLogo },
];

export const ProjectContextStep: React.FC<ProjectContextStepProps> = ({
  projectCode, onProjectCodeChange, plantCode, onPlantCodeChange,
  dmsPlatforms, onDmsPlatformsChange,
  projectAutoDetected = false, plantAutoDetected = false,
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

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      {/* Guidance Banner */}
      <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Document Identification Workflow</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Verify the project context below, then select the applicable DMS platform(s). 
            In the next step, you'll identify required documents system-by-system from the master document list.
          </p>
        </div>
      </div>

      {/* Project Context Fields */}
      <fieldset className="space-y-5">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
          Project Context
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground">Project Code *</Label>
              {projectAutoDetected && projectCode && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Auto-detected
                </Badge>
              )}
            </div>
            <Select value={projectCode} onValueChange={onProjectCodeChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select project…" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {projects.map((p: any) => (
                  <SelectItem key={p.code} value={p.code}>
                    <span className="font-mono text-xs mr-2">{p.code}</span>
                    <span className="text-muted-foreground">{p.project_name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground">Plant Code *</Label>
              {plantAutoDetected && plantCode && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Auto-detected
                </Badge>
              )}
            </div>
            <Select value={plantCode} onValueChange={onPlantCodeChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select plant…" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {plants.map((p: any) => (
                  <SelectItem key={p.code} value={p.code}>
                    <span className="font-mono text-xs mr-2">{p.code}</span>
                    <span className="text-muted-foreground">{p.plant_name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      <div className="h-px bg-border" />

      {/* DMS Platform Selection */}
      <fieldset className="space-y-4">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
          Document Management Systems *
        </legend>
        <p className="text-xs text-muted-foreground -mt-2">
          Select one or more DMS platforms used on this project.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DMS_PLATFORMS.map(platform => {
            const isSelected = dmsPlatforms.includes(platform.id);
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => togglePlatform(platform.id)}
                className={cn(
                  'relative flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all min-h-[80px]',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40'
                )}
              >
                {/* Checkbox top-right */}
                <div className="absolute top-2.5 right-2.5">
                  <Checkbox checked={isSelected} className="pointer-events-none" />
                </div>

                {/* Platform logo avatar */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-base"
                  style={{ backgroundColor: platform.color }}
                >
                  {platform.letter}
                </div>

                {/* Text */}
                <div className="min-w-0 pr-6">
                  <p className={cn('text-sm font-medium leading-tight', isSelected && 'text-primary')}>{platform.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{platform.description}</p>
                </div>
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
