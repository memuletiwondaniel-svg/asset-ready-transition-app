import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface WidgetConfig {
  id: string;
  widget_type: string;
  position: number;
  size: 'small' | 'medium' | 'large';
  settings: Record<string, any>;
  is_visible: boolean;
}

const DEFAULT_WIDGETS: Omit<WidgetConfig, 'id'>[] = [
  { widget_type: 'tasks', position: 0, size: 'medium', settings: {}, is_visible: true },
  { widget_type: 'quick-stats', position: 1, size: 'small', settings: {}, is_visible: true },
  { widget_type: 'recent-activity', position: 2, size: 'medium', settings: {}, is_visible: true },
];

export const useWidgetConfigs = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_widget_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('position');

      if (error) throw error;

      if (!data || data.length === 0) {
        // Initialize with default widgets
        await initializeDefaultWidgets(user.id);
      } else {
        setWidgets(data as WidgetConfig[]);
      }
    } catch (error) {
      console.error('Error fetching widgets:', error);
      toast({
        title: "Error",
        description: "Failed to load widget configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultWidgets = async (userId: string) => {
    try {
      const widgetsToInsert = DEFAULT_WIDGETS.map(w => ({
        ...w,
        user_id: userId
      }));

      const { data, error } = await supabase
        .from('user_widget_configs')
        .insert(widgetsToInsert)
        .select();

      if (error) throw error;
      setWidgets(data as WidgetConfig[]);
    } catch (error) {
      console.error('Error initializing widgets:', error);
    }
  };

  const updateWidgetPosition = async (widgetId: string, newPosition: number) => {
    try {
      const { error } = await supabase
        .from('user_widget_configs')
        .update({ position: newPosition })
        .eq('id', widgetId);

      if (error) throw error;

      setWidgets(prev =>
        prev.map(w => w.id === widgetId ? { ...w, position: newPosition } : w)
          .sort((a, b) => a.position - b.position)
      );
    } catch (error) {
      console.error('Error updating widget position:', error);
    }
  };

  const toggleWidgetVisibility = async (widgetId: string) => {
    try {
      const widget = widgets.find(w => w.id === widgetId);
      if (!widget) return;

      const { error } = await supabase
        .from('user_widget_configs')
        .update({ is_visible: !widget.is_visible })
        .eq('id', widgetId);

      if (error) throw error;

      setWidgets(prev =>
        prev.map(w => w.id === widgetId ? { ...w, is_visible: !w.is_visible } : w)
      );
    } catch (error) {
      console.error('Error toggling widget visibility:', error);
    }
  };

  const updateWidgetSettings = async (widgetId: string, settings: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('user_widget_configs')
        .update({ settings })
        .eq('id', widgetId);

      if (error) throw error;

      setWidgets(prev =>
        prev.map(w => w.id === widgetId ? { ...w, settings } : w)
      );
    } catch (error) {
      console.error('Error updating widget settings:', error);
    }
  };

  const reorderWidgets = async (reorderedWidgets: WidgetConfig[]) => {
    try {
      const updates = reorderedWidgets.map((widget, index) => ({
        id: widget.id,
        position: index
      }));

      for (const update of updates) {
        await supabase
          .from('user_widget_configs')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      setWidgets(reorderedWidgets);
    } catch (error) {
      console.error('Error reordering widgets:', error);
    }
  };

  return {
    widgets,
    loading,
    updateWidgetPosition,
    toggleWidgetVisibility,
    updateWidgetSettings,
    reorderWidgets
  };
};
