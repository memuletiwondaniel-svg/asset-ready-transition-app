import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BookmarkPlus, ChevronDown, Star, Trash2, Check } from 'lucide-react';
import { useWidgetPresets } from '@/hooks/useWidgetPresets';
import type { WidgetConfig } from '@/hooks/useWidgetConfigs';

interface PresetManagerProps {
  currentWidgets: WidgetConfig[];
  onLoadPreset: (widgets: Omit<WidgetConfig, 'id'>[]) => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({ currentWidgets, onLoadPreset }) => {
  const { presets, savePreset, deletePreset, setDefaultPreset } = useWidgetPresets();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    
    await savePreset(presetName, presetDescription, currentWidgets);
    setPresetName('');
    setPresetDescription('');
    setSaveDialogOpen(false);
  };

  const handleLoadPreset = (widgets: Omit<WidgetConfig, 'id'>[]) => {
    onLoadPreset(widgets);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <BookmarkPlus className="w-4 h-4 mr-2" />
            Presets
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5 text-sm font-semibold">Load Layout Preset</div>
          <DropdownMenuSeparator />
          
          {presets.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No saved presets
            </div>
          ) : (
            presets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleLoadPreset(preset.layout_config.widgets)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{preset.name}</span>
                    {preset.is_default && (
                      <Star className="w-3 h-3 text-warning fill-current" />
                    )}
                  </div>
                  {preset.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {preset.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {!preset.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDefaultPreset(preset.id);
                      }}
                    >
                      <Star className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(preset.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <BookmarkPlus className="w-4 h-4 mr-2" />
            Save Current Layout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Layout Preset</DialogTitle>
            <DialogDescription>
              Save your current widget layout for quick access later
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name *</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Safety Manager View"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preset-description">Description (Optional)</Label>
              <Textarea
                id="preset-description"
                placeholder="Brief description of this layout..."
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="rounded-lg border border-border/40 p-3 bg-muted/20">
              <div className="text-sm font-medium mb-2">Current Layout</div>
              <div className="text-xs text-muted-foreground">
                {currentWidgets.length} widget{currentWidgets.length !== 1 ? 's' : ''} will be saved
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {currentWidgets.slice(0, 5).map((widget) => (
                  <Badge key={widget.id} variant="secondary" className="text-xs">
                    {widget.widget_type}
                  </Badge>
                ))}
                {currentWidgets.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{currentWidgets.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              <Check className="w-4 h-4 mr-2" />
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
