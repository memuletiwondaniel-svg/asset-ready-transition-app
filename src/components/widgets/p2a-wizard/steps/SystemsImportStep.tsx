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
  Edit2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CMSImportModal } from './CMSImportModal';
import { ExcelUploadModal } from './ExcelUploadModal';
import { AddSystemModal } from './AddSystemModal';
import { useToast } from '@/components/ui/use-toast';

export interface WizardSystem {
  id: string;
  system_id: string;
  name: string;
  description: string;
  is_hydrocarbon: boolean;
  progress?: number;
}

interface SystemsImportStepProps {
  systems: WizardSystem[];
  onSystemsChange: (systems: WizardSystem[]) => void;
  projectCode?: string;
}

function getProgressTextColor(progress: number): string {
  if (progress >= 100) return 'text-emerald-600';
  if (progress >= 60) return 'text-yellow-600';
  if (progress >= 30) return 'text-orange-600';
  return 'text-red-600';
}

function getSystemIdColor(systemId: string) {
  const str = systemId.replace(/-/g, '').toUpperCase();
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  hash = Math.abs(hash);
  const hueAnchors = [165, 180, 200, 220, 250, 280, 320];
  const hue = (hueAnchors[hash % hueAnchors.length] + (((hash >> 8) % 25) - 12) + 360) % 360;
  const sat = 30 + ((hash >> 12) % 15);
  const light = 50 + ((hash >> 16) % 12);
  return {
    bg: `hsl(${hue}, ${sat}%, ${light}%)`,
    bgEnd: `hsl(${hue}, ${sat + 8}%, ${light - 10}%)`,
  };
}

export const SystemsImportStep: React.FC<SystemsImportStepProps> = ({
  systems,
  onSystemsChange,
  projectCode,
}) => {
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCMSModal, setShowCMSModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  const handleAddSystem = (system: WizardSystem) => {
    onSystemsChange([...systems, system]);
  };

  const handleRemoveSystem = (id: string) => {
    onSystemsChange(systems.filter(s => s.id !== id));
  };

  const handleUpdateSystem = (id: string, updates: Partial<WizardSystem>) => {
    onSystemsChange(systems.map(s => s.id === id ? { ...s, ...updates } : s));
    setEditingId(null);
  };

  const handleCMSImport = (importedSystems: WizardSystem[]) => {
    onSystemsChange([...systems, ...importedSystems]);
    toast({
      title: 'GoHub Import',
      description: `Successfully imported ${importedSystems.length} systems from GoHub`,
    });
  };

  const handleExcelUpload = (file: File) => {
    toast({
      title: 'Excel Upload',
      description: `Processing ${file.name}...`,
    });
    const mockSystems: WizardSystem[] = [
      { id: `excel-${Date.now()}-1`, system_id: 'SYS-XLS-001', name: 'Excel System 1', description: 'From Excel', is_hydrocarbon: false },
    ];
    onSystemsChange([...systems, ...mockSystems]);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Systems</h3>
          <p className="text-xs text-muted-foreground">
            Import or manually add systems for handover
          </p>
        </div>
        <Badge variant="outline">{systems.length} systems</Badge>
      </div>

      {/* Import options - compact */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setShowCMSModal(true)}
          className="group relative flex items-center justify-center gap-2 p-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-200"
        >
          <Database className="h-3.5 w-3.5 text-amber-600" />
          <span className="font-medium text-xs">CMS Import</span>
        </button>
        <button
          onClick={() => setShowExcelModal(true)}
          className="group relative flex items-center justify-center gap-2 p-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-200"
        >
          <Upload className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium text-xs">Upload Excel</span>
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="group relative flex items-center justify-center gap-2 p-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200"
        >
          <Plus className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-medium text-xs">Add Manually</span>
        </button>
      </div>

      {/* Systems List */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[280px]">
          <div className="p-1.5 space-y-1">
            {systems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No systems added yet</p>
                <p className="text-xs mt-0.5">Import or add systems above</p>
              </div>
            ) : (
              systems.map((system) => (
                <SystemListItem
                  key={system.id}
                  system={system}
                  isEditing={editingId === system.id}
                  onEdit={() => setEditingId(system.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={(updates) => handleUpdateSystem(system.id, updates)}
                  onRemove={() => handleRemoveSystem(system.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* CMS Import Modal */}
      <CMSImportModal
        open={showCMSModal}
        onOpenChange={setShowCMSModal}
        onImport={handleCMSImport}
        projectCode={projectCode}
      />

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        open={showExcelModal}
        onOpenChange={setShowExcelModal}
        onUpload={handleExcelUpload}
        title="Upload Systems"
        description="Import systems from an Excel spreadsheet"
      />

      {/* Add System Modal */}
      <AddSystemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={handleAddSystem}
      />
    </div>
  );
};

// ─── Extracted System List Item ──────────────────────────────

interface SystemListItemProps {
  system: WizardSystem;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<WizardSystem>) => void;
  onRemove: () => void;
}

const SystemListItem: React.FC<SystemListItemProps> = ({
  system,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onRemove,
}) => {
  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg border bg-card ring-2 ring-primary")}>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Input
              value={system.system_id}
              onChange={(e) => onUpdate({ system_id: e.target.value })}
              placeholder="System ID"
              className="h-8 text-sm w-24"
            />
            <Input
              value={system.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="System Name"
              className="h-8 text-sm flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={system.is_hydrocarbon}
              onCheckedChange={(checked) => 
                onUpdate({ is_hydrocarbon: checked as boolean })
              }
            />
            <Label className="text-xs">Hydrocarbon System</Label>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasProgress = typeof system.progress === 'number';
  const idColors = getSystemIdColor(system.system_id);

  return (
    <div className="group flex items-center gap-2 py-1.5 px-2.5 rounded-md border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-white shrink-0 leading-none"
          style={{ background: `linear-gradient(to right, ${idColors.bg}, ${idColors.bgEnd})` }}
        >
          {system.system_id}
        </span>
        <span className="font-medium text-xs truncate">{system.name}</span>
        {system.is_hydrocarbon && (
          <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-700 border-orange-200 shrink-0 py-0 px-1">
            HC
          </Badge>
        )}
      </div>
      {hasProgress && (
        <span className={cn("text-[10px] font-semibold tabular-nums shrink-0", getProgressTextColor(system.progress!))}>
          {system.progress!.toFixed(1)}%
        </span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={onEdit}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
