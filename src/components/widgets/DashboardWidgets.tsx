import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, GripVertical, Plus, X, Layout } from 'lucide-react';
import { TasksWidget } from './TasksWidget';
import { QuickStatsWidget } from './QuickStatsWidget';
import { RecentActivityWidget } from './RecentActivityWidget';
import { CalendarWidget } from './CalendarWidget';
import { ProjectsOverviewWidget } from './ProjectsOverviewWidget';
import { NotificationsWidget } from './NotificationsWidget';
import { AIAssistantWidget } from './AIAssistantWidget';
import { PSSRStatsWidget } from './PSSRStatsWidget';
import { TeamMembersWidget } from './TeamMembersWidget';
import { WidgetLibrary } from './WidgetLibrary';
import { WidgetSettingsModal } from './WidgetSettingsModal';
import { PresetManager } from './PresetManager';
import { useWidgetConfigs } from '@/hooks/useWidgetConfigs';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WidgetConfig } from '@/hooks/useWidgetConfigs';

interface SortableWidgetProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  onSettings: (widget: WidgetConfig) => void;
  onDelete: (widgetId: string) => void;
  customizeMode: boolean;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ widget, children, onSettings, onDelete, customizeMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={{
        ...style,
        gridColumn: widget.size === 'large' ? 'span 3' : widget.size === 'medium' ? 'span 2' : 'span 1'
      }}
      className={`overflow-hidden transition-all group ${isDragging ? 'opacity-50' : ''} ${widget.is_visible ? '' : 'hidden'}`}
    >
      <div className="relative">
        {customizeMode && (
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <Button
              {...attributes}
              {...listeners}
              variant="ghost"
              size="sm"
              className="cursor-grab active:cursor-grabbing h-8 w-8 p-0 hover:bg-accent/50"
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent/50"
              onClick={() => onSettings(widget)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-destructive/50 text-destructive"
              onClick={() => onDelete(widget.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </Card>
  );
};

export const DashboardWidgets: React.FC = () => {
  const { widgets, loading, reorderWidgets, addWidget, removeWidget, updateWidgetSettings } = useWidgetConfigs();
  const [customizeMode, setCustomizeMode] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsWidget, setSettingsWidget] = useState<WidgetConfig | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      const reordered = arrayMove(widgets, oldIndex, newIndex);
      reorderWidgets(reordered);
    }
  };

  const handleSettingsSave = async (settings: Record<string, any>, size: 'small' | 'medium' | 'large') => {
    if (!settingsWidget) return;
    await updateWidgetSettings(settingsWidget.id, settings, size);
  };

  const handleDelete = async (widgetId: string) => {
    await removeWidget(widgetId);
  };

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.widget_type) {
      case 'tasks':
        return <TasksWidget settings={widget.settings} />;
      case 'quick-stats':
        return <QuickStatsWidget settings={widget.settings} />;
      case 'recent-activity':
        return <RecentActivityWidget settings={widget.settings} />;
      case 'calendar':
        return <CalendarWidget settings={widget.settings} />;
      case 'projects':
        return <ProjectsOverviewWidget settings={widget.settings} />;
      case 'notifications':
        return <NotificationsWidget settings={widget.settings} />;
      case 'ai-assistant':
        return <AIAssistantWidget settings={widget.settings} />;
      case 'pssr-stats':
        return <PSSRStatsWidget settings={widget.settings} />;
      case 'team-members':
        return <TeamMembersWidget settings={widget.settings} />;
      default:
        return null;
    }
  };

  const handleLoadPreset = async (presetWidgets: Omit<WidgetConfig, 'id'>[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete all current widgets
      await supabase
        .from('user_widget_configs')
        .delete()
        .eq('user_id', user.id);

      // Insert preset widgets
      const widgetsToInsert = presetWidgets.map((w, index) => ({
        ...w,
        user_id: user.id,
        position: index
      }));

      await supabase
        .from('user_widget_configs')
        .insert(widgetsToInsert);

      // Refresh widget list
      window.location.reload();
    } catch (error) {
      console.error('Error loading preset:', error);
    }
  };

  const visibleWidgets = widgets.filter(w => w.is_visible);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
          <PresetManager 
            currentWidgets={widgets}
            onLoadPreset={handleLoadPreset}
          />
          <Button
            variant={customizeMode ? "default" : "outline"}
            size="sm"
            onClick={() => setCustomizeMode(!customizeMode)}
          >
            <Layout className="w-4 h-4 mr-2" />
            {customizeMode ? 'Done' : 'Customize'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLibraryOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Widget
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : visibleWidgets.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <Layout className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <h3 className="text-xl font-semibold">No Widgets Yet</h3>
              <p className="text-muted-foreground">
                Add widgets to customize your dashboard and view important information at a glance.
              </p>
              <Button onClick={() => setLibraryOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Widget
              </Button>
            </div>
          </Card>
        ) : (
          <SortableContext
            items={visibleWidgets.map(w => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {visibleWidgets.map((widget) => (
                <SortableWidget 
                  key={widget.id} 
                  widget={widget}
                  onSettings={setSettingsWidget}
                  onDelete={handleDelete}
                  customizeMode={customizeMode}
                >
                  {renderWidget(widget)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        )}
      </DndContext>

      <WidgetLibrary
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onAddWidget={addWidget}
        existingWidgets={widgets.map(w => w.widget_type)}
      />

      <WidgetSettingsModal
        widget={settingsWidget}
        open={!!settingsWidget}
        onOpenChange={(open) => !open && setSettingsWidget(null)}
        onSave={handleSettingsSave}
        onDelete={() => {
          if (settingsWidget) {
            handleDelete(settingsWidget.id);
            setSettingsWidget(null);
          }
        }}
      />
    </div>
  );
};
