import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import type { WidgetConfig } from './useWidgetConfigs';

export interface WidgetPreset {
  id: string;
  name: string;
  description: string | null;
  preset_type: string;
  is_default: boolean;
  layout_config: {
    widgets: Omit<WidgetConfig, 'id'>[];
  };
  created_at: string;
}

export const useWidgetPresets = () => {
  const [presets, setPresets] = useState<WidgetPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('widget_layout_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresets((data || []) as unknown as WidgetPreset[]);
    } catch (error) {
      console.error('Error fetching presets:', error);
      toast({
        title: "Error",
        description: "Failed to load layout presets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreset = async (name: string, description: string, widgets: WidgetConfig[], presetType = 'custom') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const layoutConfig = {
        widgets: widgets.map(({ id, ...rest }) => rest)
      };

      const { error } = await supabase
        .from('widget_layout_presets')
        .insert({
          user_id: user.id,
          name,
          description,
          preset_type: presetType,
          layout_config: layoutConfig
        });

      if (error) throw error;

      await fetchPresets();
      toast({
        title: "Preset Saved",
        description: `Layout preset "${name}" has been saved.`,
      });
    } catch (error) {
      console.error('Error saving preset:', error);
      toast({
        title: "Error",
        description: "Failed to save layout preset",
        variant: "destructive",
      });
    }
  };

  const deletePreset = async (presetId: string) => {
    try {
      const { error } = await supabase
        .from('widget_layout_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;

      setPresets(prev => prev.filter(p => p.id !== presetId));
      toast({
        title: "Preset Deleted",
        description: "Layout preset has been deleted.",
      });
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast({
        title: "Error",
        description: "Failed to delete preset",
        variant: "destructive",
      });
    }
  };

  const setDefaultPreset = async (presetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove default from all presets
      await supabase
        .from('widget_layout_presets')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set new default
      const { error } = await supabase
        .from('widget_layout_presets')
        .update({ is_default: true })
        .eq('id', presetId);

      if (error) throw error;

      await fetchPresets();
      toast({
        title: "Default Preset Updated",
        description: "This preset will be loaded automatically.",
      });
    } catch (error) {
      console.error('Error setting default preset:', error);
      toast({
        title: "Error",
        description: "Failed to set default preset",
        variant: "destructive",
      });
    }
  };

  return {
    presets,
    loading,
    savePreset,
    deletePreset,
    setDefaultPreset,
    refreshPresets: fetchPresets
  };
};
