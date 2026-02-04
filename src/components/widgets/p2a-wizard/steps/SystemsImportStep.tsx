import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Database, 
  Box,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardSystem {
  id: string;
  system_id: string;
  name: string;
  description: string;
  is_hydrocarbon: boolean;
}

interface SystemsImportStepProps {
  systems: WizardSystem[];
  onSystemsChange: (systems: WizardSystem[]) => void;
}

export const SystemsImportStep: React.FC<SystemsImportStepProps> = ({
  systems,
  onSystemsChange,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSystem, setNewSystem] = useState<Partial<WizardSystem>>({
    system_id: '',
    name: '',
    description: '',
    is_hydrocarbon: false,
  });

  const handleAddSystem = () => {
    if (!newSystem.system_id?.trim() || !newSystem.name?.trim()) return;

    const system: WizardSystem = {
      id: `temp-${Date.now()}`,
      system_id: newSystem.system_id.trim(),
      name: newSystem.name.trim(),
      description: newSystem.description?.trim() || '',
      is_hydrocarbon: newSystem.is_hydrocarbon || false,
    };

    onSystemsChange([...systems, system]);
    setNewSystem({ system_id: '', name: '', description: '', is_hydrocarbon: false });
    setShowAddForm(false);
  };

  const handleRemoveSystem = (id: string) => {
    onSystemsChange(systems.filter(s => s.id !== id));
  };

  const handleUpdateSystem = (id: string, updates: Partial<WizardSystem>) => {
    onSystemsChange(systems.map(s => s.id === id ? { ...s, ...updates } : s));
    setEditingId(null);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Systems</h3>
          <p className="text-xs text-muted-foreground">
            Import or manually add systems for handover
          </p>
        </div>
        <Badge variant="outline">{systems.length} systems</Badge>
      </div>

      {/* Import options */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled
          className="gap-2"
        >
          <Database className="h-4 w-4" />
          Import from GoCompletions
          <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Excel
          <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
        </Button>
      </div>

      {/* Systems List */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-2">
            {systems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Box className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No systems added yet</p>
                <p className="text-xs mt-1">Add systems manually or import from external sources</p>
              </div>
            ) : (
              systems.map((system) => (
                <div
                  key={system.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
                    editingId === system.id && "ring-2 ring-primary"
                  )}
                >
                  {editingId === system.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={system.system_id}
                          onChange={(e) => handleUpdateSystem(system.id, { system_id: e.target.value })}
                          placeholder="System ID"
                          className="h-8 text-sm w-24"
                        />
                        <Input
                          value={system.name}
                          onChange={(e) => handleUpdateSystem(system.id, { name: e.target.value })}
                          placeholder="System Name"
                          className="h-8 text-sm flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={system.is_hydrocarbon}
                          onCheckedChange={(checked) => 
                            handleUpdateSystem(system.id, { is_hydrocarbon: checked as boolean })
                          }
                        />
                        <Label className="text-xs">Hydrocarbon System</Label>
                        <div className="flex-1" />
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Box className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{system.name}</span>
                          {system.is_hydrocarbon && (
                            <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                              HC
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {system.system_id}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setEditingId(system.id)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive shrink-0"
                        onClick={() => handleRemoveSystem(system.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Add Form */}
      {showAddForm ? (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="flex gap-2">
            <div className="w-28">
              <Label className="text-xs">System ID</Label>
              <Input
                value={newSystem.system_id || ''}
                onChange={(e) => setNewSystem(prev => ({ ...prev, system_id: e.target.value }))}
                placeholder="e.g., SYS-001"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">System Name</Label>
              <Input
                value={newSystem.name || ''}
                onChange={(e) => setNewSystem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Power Generation System"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description (Optional)</Label>
            <Input
              value={newSystem.description || ''}
              onChange={(e) => setNewSystem(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description..."
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={newSystem.is_hydrocarbon || false}
                onCheckedChange={(checked) => 
                  setNewSystem(prev => ({ ...prev, is_hydrocarbon: checked as boolean }))
                }
              />
              <Label className="text-xs">Hydrocarbon System (targets RFSU)</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleAddSystem}
                disabled={!newSystem.system_id?.trim() || !newSystem.name?.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add System Manually
        </Button>
      )}
    </div>
  );
};
