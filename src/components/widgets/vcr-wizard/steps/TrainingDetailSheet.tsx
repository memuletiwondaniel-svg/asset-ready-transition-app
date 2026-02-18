import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  GraduationCap,
  Building,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  Globe,
  Monitor,
  Users,
  FileText,
  X,
  Plus,
  Layers,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const DELIVERY_METHODS_OPTIONS = [
  { id: 'Onsite', label: 'Onsite', icon: MapPin },
  { id: 'Offsite (Out-of-Country)', label: 'Offsite (Out-of-Country)', icon: Globe },
  { id: 'Online', label: 'Online', icon: Monitor },
];

const DELIVERY_ICONS: Record<string, React.ElementType> = {
  'Onsite': MapPin,
  'Offsite (Out-of-Country)': Globe,
  'Online': Monitor,
};

const SUGGESTED_AUDIENCES = [
  'Operations Team',
  'Maintenance – Electrical',
  'Maintenance – Mechanical',
  'Maintenance – Instrumentation',
  'Operations Supervisors',
  'Site Engineers',
  'HSE Team',
  'Process Engineering',
  'Control Room Operators',
  'Management',
  'Contractors',
];

interface TrainingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
  systems?: any[]; // all available systems for the handover point
}

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'do MMM yyyy');
  } catch {
    return dateStr;
  }
};

const DetailRow: React.FC<{
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  clickable?: boolean;
}> = ({ icon: Icon, label, children, onClick, clickable }) => (
  <div
    className={cn(
      'flex items-start gap-3 py-3 rounded-lg px-1 -mx-1 transition-colors',
      clickable && 'cursor-pointer hover:bg-muted/40'
    )}
    onClick={onClick}
  >
    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  </div>
);

export const TrainingDetailSheet: React.FC<TrainingDetailSheetProps> = ({
  open,
  onOpenChange,
  item,
  systems = [],
}) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Local editable state - initialized from item
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [tentativeDate, setTentativeDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [linkedSystemIds, setLinkedSystemIds] = useState<string[]>([]);

  // UI state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAddAudience, setShowAddAudience] = useState(false);
  const [customAudience, setCustomAudience] = useState('');
  const [showAddSystem, setShowAddSystem] = useState(false);

  // Fetch system mappings for this training item
  const { data: systemMappings = [] } = useQuery({
    queryKey: ['training-system-mappings', item?.id],
    queryFn: async () => {
      if (!item?.id) return [];
      const { data, error } = await (supabase as any)
        .from('ora_training_system_mappings')
        .select('id, system_id')
        .eq('training_item_id', item.id);
      if (error) return [];
      return data || [];
    },
    enabled: open && !!item?.id,
  });

  // Initialize local state from item
  useEffect(() => {
    if (item) {
      setDescription(item.description || '');
      setProvider(item.training_provider || '');
      const days = item.duration_hours ? Math.round(item.duration_hours / 8) : '';
      setDurationDays(days.toString());
      setTentativeDate(item.tentative_date || '');
      setDeliveryMethod(item.delivery_method || []);
      setTargetAudience(item.target_audience || []);
      setEditingField(null);
      setShowAddAudience(false);
      setShowAddSystem(false);
      setCustomAudience('');
    }
  }, [item?.id, open]);

  // Sync linked system IDs from fetched mappings
  useEffect(() => {
    setLinkedSystemIds(systemMappings.map((m: any) => m.system_id));
  }, [systemMappings]);

  // Compute dirty state
  const origSystemIds = useMemo(() => systemMappings.map((m: any) => m.system_id).sort(), [systemMappings]);

  const isDirty = useMemo(() => {
    if (!item) return false;
    const origDesc = item.description || '';
    const origProvider = item.training_provider || '';
    const origDays = item.duration_hours ? Math.round(item.duration_hours / 8).toString() : '';
    const origDate = item.tentative_date || '';
    const origDelivery = item.delivery_method || [];
    const origAudience = item.target_audience || [];

    return (
      description !== origDesc ||
      provider !== origProvider ||
      durationDays !== origDays ||
      tentativeDate !== origDate ||
      JSON.stringify(deliveryMethod) !== JSON.stringify(origDelivery) ||
      JSON.stringify(targetAudience) !== JSON.stringify(origAudience) ||
      JSON.stringify([...linkedSystemIds].sort()) !== JSON.stringify(origSystemIds)
    );
  }, [item, description, provider, durationDays, tentativeDate, deliveryMethod, targetAudience, linkedSystemIds, origSystemIds]);

  const saveAllChanges = useCallback(async () => {
    if (!item) return;
    setSaving(true);
    try {
      // Save training fields
      const update: any = {
        description: description.trim() || null,
        training_provider: provider.trim() || null,
        duration_hours: durationDays ? parseFloat(durationDays) * 8 : null,
        tentative_date: tentativeDate || null,
        delivery_method: deliveryMethod.length > 0 ? deliveryMethod : null,
        target_audience: targetAudience,
      };
      const { error } = await (supabase as any)
        .from('p2a_vcr_training')
        .update(update)
        .eq('id', item.id);
      if (error) throw error;
      Object.assign(item, update);

      // Sync system mappings: delete removed, insert added
      const toAdd = linkedSystemIds.filter(id => !origSystemIds.includes(id));
      const toRemove = origSystemIds.filter(id => !linkedSystemIds.includes(id));

      if (toRemove.length > 0) {
        await (supabase as any)
          .from('ora_training_system_mappings')
          .delete()
          .eq('training_item_id', item.id)
          .in('system_id', toRemove);
      }
      if (toAdd.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase as any)
          .from('ora_training_system_mappings')
          .insert(toAdd.map((sid: string) => ({
            training_item_id: item.id,
            system_id: sid,
            handover_point_id: item.handover_point_id,
            created_by: user?.id || null,
          })));
      }

      queryClient.invalidateQueries({ queryKey: ['vcr-exec-training'] });
      queryClient.invalidateQueries({ queryKey: ['training-system-mappings', item.id] });
      setEditingField(null);
      toast.success('Changes saved');
    } catch (e: any) {
      console.error('Update failed:', e);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [item, description, provider, durationDays, tentativeDate, deliveryMethod, targetAudience, linkedSystemIds, origSystemIds, queryClient]);

  if (!item) return null;

  const toggleDelivery = (id: string) => {
    setDeliveryMethod(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const removeAudience = (a: string) => {
    setTargetAudience(prev => prev.filter(x => x !== a));
  };

  const addAudienceItem = (a: string) => {
    if (!a.trim() || targetAudience.includes(a.trim())) return;
    setTargetAudience(prev => [...prev, a.trim()]);
    setCustomAudience('');
    setShowAddAudience(false);
  };

  const removeSystem = (sid: string) => {
    setLinkedSystemIds(prev => prev.filter(id => id !== sid));
  };

  const addSystem = (sid: string) => {
    if (linkedSystemIds.includes(sid)) return;
    setLinkedSystemIds(prev => [...prev, sid]);
    setShowAddSystem(false);
  };


  const currentDurationDays = durationDays ? parseInt(durationDays) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent border-b">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base font-semibold truncate">{item.title}</SheetTitle>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {/* Description */}
          <DetailRow
            icon={FileText}
            label="Objective & Justification"
            clickable={editingField !== 'description'}
            onClick={() => editingField !== 'description' && setEditingField('description')}
          >
            {editingField === 'description' ? (
              <div className="space-y-2 mt-1">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="text-sm resize-none border-foreground/20"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {description || <span className="italic text-muted-foreground/60">Click to add objective...</span>}
              </p>
            )}
          </DetailRow>
          <Separator />

          {/* Provider */}
          <DetailRow
            icon={Building}
            label="Training Provider"
            clickable={editingField !== 'provider'}
            onClick={() => editingField !== 'provider' && setEditingField('provider')}
          >
            {editingField === 'provider' ? (
              <div className="flex gap-1.5 items-center mt-1">
                <Input
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="text-sm h-8 border-foreground/20 flex-1"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                />
              </div>
            ) : (
              <span>{provider || <span className="italic text-muted-foreground/60">Click to add provider...</span>}</span>
            )}
          </DetailRow>

          {/* Duration */}
          <DetailRow
            icon={Clock}
            label="Duration"
            clickable={editingField !== 'duration'}
            onClick={() => editingField !== 'duration' && setEditingField('duration')}
          >
            {editingField === 'duration' ? (
              <div className="flex gap-1.5 items-center mt-1">
                <Input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="text-sm h-8 border-foreground/20 w-24"
                  autoFocus
                  min={1}
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                />
                <span className="text-xs text-muted-foreground">days</span>
              </div>
            ) : (
              <span>
                {currentDurationDays
                  ? `${currentDurationDays} day${currentDurationDays !== 1 ? 's' : ''}`
                  : <span className="italic text-muted-foreground/60">Click to set duration...</span>
                }
              </span>
            )}
          </DetailRow>

          {/* Tentative Date */}
          <DetailRow icon={CalendarIcon} label="Tentative Start Date">
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-sm hover:text-primary transition-colors text-left">
                  {tentativeDate
                    ? formatDate(tentativeDate)
                    : <span className="italic text-muted-foreground/60">Click to pick a date...</span>
                  }
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={tentativeDate ? new Date(tentativeDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setTentativeDate(format(date, 'yyyy-MM-dd'));
                    }
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </DetailRow>

          {/* Delivery Methods */}
          <Separator />
          <DetailRow
            icon={MapPin}
            label="Delivery Format"
            clickable={editingField !== 'delivery'}
            onClick={() => editingField !== 'delivery' && setEditingField('delivery')}
          >
            {editingField === 'delivery' ? (
              <div className="space-y-2 mt-1">
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_METHODS_OPTIONS.map((dm) => {
                    const Icon = dm.icon;
                    const isSelected = deliveryMethod.includes(dm.id);
                    return (
                      <button
                        key={dm.id}
                        onClick={(e) => { e.stopPropagation(); toggleDelivery(dm.id); }}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          isSelected
                            ? 'border-primary/50 bg-primary/10 text-primary'
                            : 'border-border hover:bg-accent/50 text-muted-foreground'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {dm.label}
                      </button>
                    );
                  })}
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingField(null)}>Done</Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {deliveryMethod.length > 0 ? deliveryMethod.map((dm: string) => {
                  const Icon = DELIVERY_ICONS[dm] || MapPin;
                  return (
                    <div key={dm} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs font-medium">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {dm}
                    </div>
                  );
                }) : (
                  <span className="italic text-muted-foreground/60 text-sm">Click to set delivery format...</span>
                )}
              </div>
            )}
          </DetailRow>

          {/* Target Audience */}
          <Separator />
          <DetailRow icon={Users} label="Target Audience">
            <div className="flex flex-wrap gap-1.5 mt-1 group/audience">
              {targetAudience.map((a: string) => (
                <div key={a} className="relative group/chip">
                  <Badge
                    variant="secondary"
                    className="text-[11px] flex items-center gap-1 pr-1.5 transition-colors group-hover/chip:bg-muted"
                  >
                    {a}
                    <button
                      onClick={() => removeAudience(a)}
                      className="opacity-0 group-hover/chip:opacity-100 transition-opacity ml-0.5 rounded-sm hover:bg-destructive/10 p-0.5"
                    >
                      <X className="w-2.5 h-2.5 text-destructive" />
                    </button>
                  </Badge>
                </div>
              ))}

              {showAddAudience ? (
                <div className="flex items-center gap-1 w-full mt-1">
                  <Popover open={true}>
                    <PopoverTrigger asChild>
                      <Input
                        value={customAudience}
                        onChange={(e) => setCustomAudience(e.target.value)}
                        placeholder="Type or select..."
                        className="text-xs h-7 border-foreground/20 flex-1"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && addAudienceItem(customAudience)}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1 max-h-48 overflow-auto" align="start">
                      {SUGGESTED_AUDIENCES
                        .filter(a => !targetAudience.includes(a))
                        .filter(a => !customAudience || a.toLowerCase().includes(customAudience.toLowerCase()))
                        .map(a => (
                          <button
                            key={a}
                            onClick={() => addAudienceItem(a)}
                            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors"
                          >
                            {a}
                          </button>
                        ))}
                    </PopoverContent>
                  </Popover>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setShowAddAudience(false); setCustomAudience(''); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddAudience(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-muted-foreground/30 text-[11px] text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
          </DetailRow>

          {/* Applicable Systems */}
          <>
            <Separator />
            <DetailRow icon={Layers} label="Applicable Systems">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {linkedSystemIds.length === 0 && (
                  <span className="italic text-muted-foreground/60 text-sm">No systems linked</span>
                )}
                {linkedSystemIds.map((sid: string) => {
                  const sys = systems.find((s: any) => s.id === sid);
                  if (!sys) return null;
                  return (
                    <div key={sid} className="relative group/sysChip">
                      <Badge variant="outline" className="text-[11px] font-normal gap-1 pr-2 transition-all group-hover/sysChip:pr-6">
                        <Layers className="w-3 h-3 text-muted-foreground" />
                        {sys.name}
                      </Badge>
                      <button
                        onClick={() => removeSystem(sid)}
                        className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/sysChip:opacity-100 transition-opacity w-4 h-4 rounded-full bg-destructive flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 text-destructive-foreground" />
                      </button>
                    </div>
                  );
                })}

                {/* Add system button */}
                {showAddSystem ? (
                  <Popover open={true} onOpenChange={setShowAddSystem}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-muted-foreground/30 text-[11px] text-muted-foreground hover:bg-muted/40 transition-colors">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-1 max-h-52 overflow-auto" align="start">
                      {systems
                        .filter((s: any) => !linkedSystemIds.includes(s.id))
                        .map((s: any) => (
                          <button
                            key={s.id}
                            onClick={() => addSystem(s.id)}
                            className="w-full text-left flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{s.name}</span>
                          </button>
                        ))}
                      {systems.filter((s: any) => !linkedSystemIds.includes(s.id)).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">All systems linked</p>
                      )}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <button
                    onClick={() => setShowAddSystem(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-muted-foreground/30 text-[11px] text-muted-foreground hover:bg-muted/40 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
            </DetailRow>
          </>
        </div>

        {/* Save Footer - only shown when dirty */}
        {isDirty && (
          <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-end gap-2 animate-in slide-in-from-bottom-2 duration-200">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                if (item) {
                  setDescription(item.description || '');
                  setProvider(item.training_provider || '');
                  const days = item.duration_hours ? Math.round(item.duration_hours / 8) : '';
                  setDurationDays(days.toString());
                  setTentativeDate(item.tentative_date || '');
                  setDeliveryMethod(item.delivery_method || []);
                  setTargetAudience(item.target_audience || []);
                  setLinkedSystemIds(systemMappings.map((m: any) => m.system_id));
                }
              }}
            >
              Discard
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={saveAllChanges}
              disabled={saving}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
