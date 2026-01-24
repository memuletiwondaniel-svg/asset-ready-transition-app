import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Flame, 
  Snowflake, 
  X,
  Calendar,
  TrendingUp,
  AlertCircle,
  FileCheck,
  Save,
  RotateCcw
} from 'lucide-react';
import { P2ASystem
} from '../hooks/useP2ASystems';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SystemDetailOverlayProps {
  system: P2ASystem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSystem?: (id: string, updates: Partial<P2ASystem>) => void;
  isUpdating?: boolean;
}

export const SystemDetailOverlay: React.FC<SystemDetailOverlayProps> = ({
  system,
  open,
  onOpenChange,
  onUpdateSystem,
  isUpdating = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: system.name,
    system_id: system.system_id,
    is_hydrocarbon: system.is_hydrocarbon,
    completion_status: system.completion_status,
    completion_percentage: system.completion_percentage,
    target_rfo_date: system.target_rfo_date || '',
    target_rfsu_date: system.target_rfsu_date || '',
    punchlist_a_count: system.punchlist_a_count,
    punchlist_b_count: system.punchlist_b_count,
    itr_a_count: system.itr_a_count,
    itr_b_count: system.itr_b_count,
  });
  
  // Reset form when system changes or dialog opens
  useEffect(() => {
    setEditFormData({
      name: system.name,
      system_id: system.system_id,
      is_hydrocarbon: system.is_hydrocarbon,
      completion_status: system.completion_status,
      completion_percentage: system.completion_percentage,
      target_rfo_date: system.target_rfo_date || '',
      target_rfsu_date: system.target_rfsu_date || '',
      punchlist_a_count: system.punchlist_a_count,
      punchlist_b_count: system.punchlist_b_count,
      itr_a_count: system.itr_a_count,
      itr_b_count: system.itr_b_count,
    });
    setIsEditing(false);
  }, [system, open]);
  
  const handleSaveChanges = () => {
    if (onUpdateSystem) {
      onUpdateSystem(system.id, {
        ...editFormData,
        target_rfo_date: editFormData.target_rfo_date || undefined,
        target_rfsu_date: editFormData.target_rfsu_date || undefined,
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditFormData({
      name: system.name,
      system_id: system.system_id,
      is_hydrocarbon: system.is_hydrocarbon,
      completion_status: system.completion_status,
      completion_percentage: system.completion_percentage,
      target_rfo_date: system.target_rfo_date || '',
      target_rfsu_date: system.target_rfsu_date || '',
      punchlist_a_count: system.punchlist_a_count,
      punchlist_b_count: system.punchlist_b_count,
      itr_a_count: system.itr_a_count,
      itr_b_count: system.itr_b_count,
    });
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RFSU': return 'bg-emerald-500';
      case 'RFO': return 'bg-blue-500';
      case 'IN_PROGRESS': return 'bg-amber-500';
      default: return 'bg-muted-foreground/50';
    }
  };

  const displayData = isEditing ? editFormData : {
    name: system.name,
    system_id: system.system_id,
    is_hydrocarbon: system.is_hydrocarbon,
    completion_status: system.completion_status,
    completion_percentage: system.completion_percentage,
    target_rfo_date: system.target_rfo_date || '',
    target_rfsu_date: system.target_rfsu_date || '',
    punchlist_a_count: system.punchlist_a_count,
    punchlist_b_count: system.punchlist_b_count,
    itr_a_count: system.itr_a_count,
    itr_b_count: system.itr_b_count,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-0 shadow-2xl">
        {/* Header with gradient */}
        <div className={cn(
          'relative px-6 pt-6 pb-8',
          system.is_hydrocarbon 
            ? 'bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent' 
            : 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent'
        )}>
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-background/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* System Type Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
            system.is_hydrocarbon 
              ? 'bg-orange-500/15 text-orange-500' 
              : 'bg-blue-500/15 text-blue-500'
          )}>
            {system.is_hydrocarbon ? (
              <Flame className="w-6 h-6" />
            ) : (
              <Snowflake className="w-6 h-6" />
            )}
          </div>

          {/* Title & ID */}
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="text-xl font-semibold bg-background/50 border-border/50 h-auto py-2"
                placeholder="System Name"
              />
              <Input
                value={editFormData.system_id}
                onChange={(e) => setEditFormData({ ...editFormData, system_id: e.target.value })}
                className="font-mono text-xs bg-background/50 border-border/50 w-fit"
                placeholder="System ID"
              />
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-1">{system.name}</h2>
              <span className="text-xs font-mono text-muted-foreground">{system.system_id}</span>
            </>
          )}

          {/* Progress Ring */}
          <div className="absolute top-6 right-14 text-center">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-muted/30"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(displayData.completion_percentage / 100) * 176} 176`}
                  strokeLinecap="round"
                  className={cn(
                    displayData.completion_percentage >= 100 ? 'text-emerald-500' :
                    displayData.completion_percentage >= 50 ? 'text-amber-500' : 'text-primary'
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">{displayData.completion_percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Status Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Status</span>
            </div>
            {isEditing ? (
              <Select
                value={editFormData.completion_status}
                onValueChange={(value) => setEditFormData({ 
                  ...editFormData, 
                  completion_status: value as P2ASystem['completion_status'] 
                })}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RFO">RFO</SelectItem>
                  <SelectItem value="RFSU">RFSU</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={cn('text-white text-xs', getStatusColor(system.completion_status))}>
                {system.completion_status.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {/* Completion Slider (Edit mode) */}
          {isEditing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Completion</Label>
                <span className="text-xs font-medium">{editFormData.completion_percentage}%</span>
              </div>
              <Input
                type="range"
                min={0}
                max={100}
                value={editFormData.completion_percentage}
                onChange={(e) => setEditFormData({ 
                  ...editFormData, 
                  completion_percentage: parseInt(e.target.value) 
                })}
                className="h-2 cursor-pointer"
              />
            </div>
          )}

          {/* System Type Toggle (Edit mode) */}
          {isEditing && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                {editFormData.is_hydrocarbon ? (
                  <Flame className="w-4 h-4 text-orange-500" />
                ) : (
                  <Snowflake className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-sm">
                  {editFormData.is_hydrocarbon ? 'Hydrocarbon' : 'Non-Hydrocarbon'}
                </span>
              </div>
              <Switch
                checked={editFormData.is_hydrocarbon}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_hydrocarbon: checked })}
              />
            </div>
          )}

          <Separator />

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Punchlist A */}
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs text-muted-foreground">Punchlist A</span>
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  value={editFormData.punchlist_a_count}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    punchlist_a_count: parseInt(e.target.value) || 0 
                  })}
                  className="h-8 text-lg font-bold bg-transparent border-red-500/20"
                />
              ) : (
                <div className="text-xl font-bold text-red-500">{system.punchlist_a_count}</div>
              )}
            </div>

            {/* Punchlist B */}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-muted-foreground">Punchlist B</span>
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  value={editFormData.punchlist_b_count}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    punchlist_b_count: parseInt(e.target.value) || 0 
                  })}
                  className="h-8 text-lg font-bold bg-transparent border-amber-500/20"
                />
              ) : (
                <div className="text-xl font-bold text-amber-500">{system.punchlist_b_count}</div>
              )}
            </div>

            {/* ITR-A */}
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs text-muted-foreground">ITR-A</span>
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  value={editFormData.itr_a_count}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    itr_a_count: parseInt(e.target.value) || 0 
                  })}
                  className="h-8 text-lg font-bold bg-transparent border-blue-500/20"
                />
              ) : (
                <div className="text-xl font-bold text-blue-500">{system.itr_a_count}</div>
              )}
            </div>

            {/* ITR-B */}
            <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs text-muted-foreground">ITR-B</span>
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  min={0}
                  value={editFormData.itr_b_count}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    itr_b_count: parseInt(e.target.value) || 0 
                  })}
                  className="h-8 text-lg font-bold bg-transparent border-purple-500/20"
                />
              ) : (
                <div className="text-xl font-bold text-purple-500">{system.itr_b_count}</div>
              )}
            </div>
          </div>

          <Separator />

          {/* Target Dates */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Target Dates</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">RFO</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editFormData.target_rfo_date}
                    onChange={(e) => setEditFormData({ ...editFormData, target_rfo_date: e.target.value })}
                    className="h-9"
                  />
                ) : (
                  <div className="text-sm font-medium">
                    {system.target_rfo_date 
                      ? format(new Date(system.target_rfo_date), 'dd MMM yyyy')
                      : '—'}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">RFSU</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editFormData.target_rfsu_date}
                    onChange={(e) => setEditFormData({ ...editFormData, target_rfsu_date: e.target.value })}
                    className="h-9"
                  />
                ) : (
                  <div className="text-sm font-medium">
                    {system.target_rfsu_date 
                      ? format(new Date(system.target_rfsu_date), 'dd MMM yyyy')
                      : '—'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-between">
          {isEditing ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancel}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveChanges}
                disabled={isUpdating}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                {system.assigned_vcr_code 
                  ? `Assigned to ${system.assigned_vcr_code}` 
                  : 'Not assigned to VCR'}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
              >
                Edit System
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};