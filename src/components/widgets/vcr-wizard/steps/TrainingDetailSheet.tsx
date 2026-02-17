import React, { useState, useEffect } from 'react';
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
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
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
}) => {
  const queryClient = useQueryClient();

  // Editing state per field
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editDelivery, setEditDelivery] = useState<string[]>([]);
  const [editAudience, setEditAudience] = useState<string[]>([]);
  const [showAddAudience, setShowAddAudience] = useState(false);
  const [customAudience, setCustomAudience] = useState('');

  useEffect(() => {
    if (item) {
      setEditingField(null);
      setShowAddAudience(false);
    }
  }, [item?.id]);

  if (!item) return null;

  const durationDays = item.duration_hours ? Math.round(item.duration_hours / 8) : null;

  const saveField = async (field: string, value: any) => {
    try {
      const { error } = await (supabase as any)
        .from('p2a_vcr_training')
        .update(value)
        .eq('id', item.id);
      if (error) throw error;
      // Merge locally so sheet reflects change immediately
      Object.assign(item, value);
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-training'] });
      setEditingField(null);
      toast.success('Updated');
    } catch (e: any) {
      console.error('Update failed:', e);
      toast.error('Failed to update');
    }
  };

  const startEdit = (field: string) => {
    if (field === 'description') {
      setEditDescription(item.description || '');
    } else if (field === 'provider') {
      setEditProvider(item.training_provider || '');
    } else if (field === 'duration') {
      setEditDuration(durationDays?.toString() || '');
    } else if (field === 'delivery') {
      setEditDelivery(item.delivery_method || []);
    }
    setEditingField(field);
  };

  const toggleDelivery = (id: string) => {
    setEditDelivery(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const removeAudience = async (a: string) => {
    const updated = (item.target_audience || []).filter((x: string) => x !== a);
    await saveField('target_audience', { target_audience: updated });
  };

  const addAudienceItem = async (a: string) => {
    if (!a.trim() || (item.target_audience || []).includes(a.trim())) return;
    const updated = [...(item.target_audience || []), a.trim()];
    await saveField('target_audience', { target_audience: updated });
    setCustomAudience('');
    setShowAddAudience(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-500/5 via-violet-500/5 to-transparent border-b">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-500" />
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
            onClick={() => editingField !== 'description' && startEdit('description')}
          >
            {editingField === 'description' ? (
              <div className="space-y-2 mt-1">
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="text-sm resize-none border-foreground/20"
                  autoFocus
                />
                <div className="flex gap-1.5 justify-end">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingField(null)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => saveField('description', { description: editDescription.trim() || null })}>
                    <Check className="w-3 h-3" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {item.description || <span className="italic text-muted-foreground/60">Click to add objective...</span>}
              </p>
            )}
          </DetailRow>
          <Separator />

          {/* Provider */}
          <DetailRow
            icon={Building}
            label="Training Provider"
            clickable={editingField !== 'provider'}
            onClick={() => editingField !== 'provider' && startEdit('provider')}
          >
            {editingField === 'provider' ? (
              <div className="flex gap-1.5 items-center mt-1">
                <Input
                  value={editProvider}
                  onChange={(e) => setEditProvider(e.target.value)}
                  className="text-sm h-8 border-foreground/20 flex-1"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveField('provider', { training_provider: editProvider.trim() || null })}
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingField(null)}><X className="w-3.5 h-3.5" /></Button>
                <Button size="sm" className="h-8 w-8 p-0" onClick={() => saveField('provider', { training_provider: editProvider.trim() || null })}><Check className="w-3.5 h-3.5" /></Button>
              </div>
            ) : (
              <span>{item.training_provider || <span className="italic text-muted-foreground/60">Click to add provider...</span>}</span>
            )}
          </DetailRow>

          {/* Duration */}
          <DetailRow
            icon={Clock}
            label="Duration"
            clickable={editingField !== 'duration'}
            onClick={() => editingField !== 'duration' && startEdit('duration')}
          >
            {editingField === 'duration' ? (
              <div className="flex gap-1.5 items-center mt-1">
                <Input
                  type="number"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  className="text-sm h-8 border-foreground/20 w-24"
                  autoFocus
                  min={1}
                  onKeyDown={(e) => e.key === 'Enter' && saveField('duration', { duration_hours: editDuration ? parseFloat(editDuration) * 8 : null })}
                />
                <span className="text-xs text-muted-foreground">days</span>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 ml-auto" onClick={() => setEditingField(null)}><X className="w-3.5 h-3.5" /></Button>
                <Button size="sm" className="h-8 w-8 p-0" onClick={() => saveField('duration', { duration_hours: editDuration ? parseFloat(editDuration) * 8 : null })}><Check className="w-3.5 h-3.5" /></Button>
              </div>
            ) : (
              <span>
                {durationDays
                  ? `${durationDays} day${durationDays !== 1 ? 's' : ''}`
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
                  {item.tentative_date
                    ? formatDate(item.tentative_date)
                    : <span className="italic text-muted-foreground/60">Click to pick a date...</span>
                  }
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={item.tentative_date ? new Date(item.tentative_date) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      saveField('tentative_date', { tentative_date: dateStr });
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
            onClick={() => editingField !== 'delivery' && startEdit('delivery')}
          >
            {editingField === 'delivery' ? (
              <div className="space-y-2 mt-1">
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_METHODS_OPTIONS.map((dm) => {
                    const Icon = dm.icon;
                    const isSelected = editDelivery.includes(dm.id);
                    return (
                      <button
                        key={dm.id}
                        onClick={(e) => { e.stopPropagation(); toggleDelivery(dm.id); }}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          isSelected
                            ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'border-border hover:bg-accent/50 text-muted-foreground'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {dm.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 justify-end">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingField(null)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => saveField('delivery', { delivery_method: editDelivery.length > 0 ? editDelivery : null })}>
                    <Check className="w-3 h-3" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {item.delivery_method?.length > 0 ? item.delivery_method.map((dm: string) => {
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
              {(item.target_audience || []).map((a: string) => (
                <div key={a} className="relative group/chip">
                  <Badge variant="secondary" className="text-[11px] pr-2 transition-all group-hover/chip:pr-6">
                    {a}
                  </Badge>
                  <button
                    onClick={() => removeAudience(a)}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/chip:opacity-100 transition-opacity w-4 h-4 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5 text-destructive-foreground" />
                  </button>
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
                        .filter(a => !(item.target_audience || []).includes(a))
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
        </div>
      </SheetContent>
    </Sheet>
  );
};
