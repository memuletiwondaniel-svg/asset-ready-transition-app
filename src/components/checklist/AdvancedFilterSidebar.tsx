import React, { useState, useEffect } from 'react';
import { X, Filter, Save, Trash2, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

export interface ChecklistFilters {
  searchTerm?: string;
  categories?: string[];
  topics?: string[];
  approvers?: string[];
  responsible?: string[];
  dateFrom?: string;
  dateTo?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: ChecklistFilters;
  is_default: boolean;
}

interface AdvancedFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ChecklistFilters;
  onFiltersChange: (filters: ChecklistFilters) => void;
  availableCategories: string[];
  availableTopics: string[];
  availableApprovers: string[];
  availableResponsible: string[];
}

const filterPresetSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
});

export const AdvancedFilterSidebar: React.FC<AdvancedFilterSidebarProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  availableCategories,
  availableTopics,
  availableApprovers,
  availableResponsible,
}) => {
  const queryClient = useQueryClient();
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Fetch filter presets
  const { data: presets = [] } = useQuery({
    queryKey: ['checklist-filter-presets'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('checklist_filter_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FilterPreset[];
    },
  });

  // Save preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async (name: string) => {
      // Validate input
      const validated = filterPresetSchema.parse({ name });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('checklist_filter_presets')
        .insert([{
          name: validated.name,
          user_id: user.id,
          filters: filters as any,
          is_default: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-filter-presets'] });
      toast.success('Filter preset saved successfully');
      setPresetName('');
      setShowSavePreset(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save filter preset');
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('checklist_filter_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-filter-presets'] });
      toast.success('Filter preset deleted');
    },
    onError: () => {
      toast.error('Failed to delete filter preset');
    },
  });

  const handleLoadPreset = (preset: FilterPreset) => {
    onFiltersChange(preset.filters);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleClearFilters = () => {
    onFiltersChange({});
    toast.success('Filters cleared');
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }
    savePresetMutation.mutate(presetName);
  };

  const toggleCategory = (category: string) => {
    const current = filters.categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    onFiltersChange({ ...filters, categories: updated });
  };

  const toggleTopic = (topic: string) => {
    const current = filters.topics || [];
    const updated = current.includes(topic)
      ? current.filter(t => t !== topic)
      : [...current, topic];
    onFiltersChange({ ...filters, topics: updated });
  };

  const toggleApprover = (approver: string) => {
    const current = filters.approvers || [];
    const updated = current.includes(approver)
      ? current.filter(a => a !== approver)
      : [...current, approver];
    onFiltersChange({ ...filters, approvers: updated });
  };

  const toggleResponsible = (responsible: string) => {
    const current = filters.responsible || [];
    const updated = current.includes(responsible)
      ? current.filter(r => r !== responsible)
      : [...current, responsible];
    onFiltersChange({ ...filters, responsible: updated });
  };

  const activeFiltersCount = 
    (filters.categories?.length || 0) +
    (filters.topics?.length || 0) +
    (filters.approvers?.length || 0) +
    (filters.responsible?.length || 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-3">
          <SheetTitle className="text-2xl font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
          </SheetTitle>
          <SheetDescription className="text-base">
            Filter checklist items with advanced criteria
          </SheetDescription>
          {activeFiltersCount > 0 && (
            <Badge className="w-fit">
              {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Saved Presets */}
          {presets.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Saved Presets</Label>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/40 hover:bg-muted transition-colors"
                  >
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors"
                    >
                      {preset.name}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePresetMutation.mutate(preset.id)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-xs text-muted-foreground">To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Categories */}
          {availableCategories.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Categories</Label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <Badge
                    key={category}
                    variant={filters.categories?.includes(category) ? 'default' : 'outline'}
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Topics */}
          {availableTopics.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Topics</Label>
              <div className="flex flex-wrap gap-2">
                {availableTopics.map((topic) => (
                  <Badge
                    key={topic}
                    variant={filters.topics?.includes(topic) ? 'default' : 'outline'}
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Approvers */}
          {availableApprovers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Approvers</Label>
              <div className="flex flex-wrap gap-2">
                {availableApprovers.map((approver) => (
                  <Badge
                    key={approver}
                    variant={filters.approvers?.includes(approver) ? 'default' : 'outline'}
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => toggleApprover(approver)}
                  >
                    {approver}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Responsible */}
          {availableResponsible.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Responsible</Label>
              <div className="flex flex-wrap gap-2">
                {availableResponsible.map((resp) => (
                  <Badge
                    key={resp}
                    variant={filters.responsible?.includes(resp) ? 'default' : 'outline'}
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => toggleResponsible(resp)}
                  >
                    {resp}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 pt-6 pb-4 bg-background border-t mt-6 space-y-3">
          {!showSavePreset ? (
            <>
              <Button
                onClick={() => setShowSavePreset(true)}
                variant="outline"
                className="w-full fluent-button"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Current Filters as Preset
              </Button>
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="w-full fluent-button"
              >
                Clear All Filters
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Enter preset name..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                className="h-10"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSavePreset}
                  disabled={savePresetMutation.isPending}
                  className="flex-1 fluent-button"
                >
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setShowSavePreset(false);
                    setPresetName('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
