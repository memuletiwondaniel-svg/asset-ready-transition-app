import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  AlertTriangle, 
  FileText, 
  StickyNote, 
  CalendarIcon,
  MapPin,
  Camera,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useWalkdownObservations, OBSERVATION_CATEGORIES, type ObservationType } from '@/hooks/useWalkdownObservations';
import type { PriorityLevel } from '@/hooks/usePSSRPriorityActions';

interface WalkdownObservationCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walkdownEventId: string;
  pssrId: string;
}

const OBSERVATION_TYPES: { value: ObservationType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'finding', 
    label: 'Finding', 
    icon: <FileText className="h-4 w-4" />,
    description: 'General observation or finding during walkdown'
  },
  { 
    value: 'action_required', 
    label: 'Action Required', 
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Issue requiring follow-up action'
  },
  { 
    value: 'note', 
    label: 'Note', 
    icon: <StickyNote className="h-4 w-4" />,
    description: 'General note for documentation'
  },
];

export const WalkdownObservationCapture: React.FC<WalkdownObservationCaptureProps> = ({
  open,
  onOpenChange,
  walkdownEventId,
  pssrId,
}) => {
  const { createObservation } = useWalkdownObservations(walkdownEventId, pssrId);

  const [observationType, setObservationType] = useState<ObservationType>('finding');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [priority, setPriority] = useState<PriorityLevel | ''>('');
  const [createPriorityAction, setCreatePriorityAction] = useState(true);
  const [actionOwnerName, setActionOwnerName] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>();

  const handleSubmit = async () => {
    if (!description.trim()) return;

    await createObservation.mutateAsync({
      observationType,
      category: category || undefined,
      description: description.trim(),
      locationDetails: locationDetails || undefined,
      priority: priority as PriorityLevel | undefined,
      createPriorityAction: observationType === 'action_required' && !!priority && createPriorityAction,
      actionOwnerName: actionOwnerName || undefined,
      targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : undefined,
    });

    // Reset form
    setObservationType('finding');
    setCategory('');
    setDescription('');
    setLocationDetails('');
    setPriority('');
    setCreatePriorityAction(true);
    setActionOwnerName('');
    setTargetDate(undefined);
    onOpenChange(false);
  };

  const showPrioritySection = observationType === 'action_required';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Capture Observation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Observation Type */}
          <div className="space-y-2">
            <Label>Observation Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {OBSERVATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setObservationType(type.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                    observationType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-full',
                    observationType === type.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {type.icon}
                  </div>
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {OBSERVATION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the observation..."
              rows={3}
            />
          </div>

          {/* Location Details */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              Location Details
            </Label>
            <Input
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
              placeholder="e.g., Area 4, near pump P-401"
            />
          </div>

          {/* Photo Upload Placeholder */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-3.5 w-3.5" />
              Photos
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Photo upload coming soon
              </p>
            </div>
          </div>

          {/* Priority Section - Only for Action Required */}
          {showPrioritySection && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label>Priority Classification</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPriority('A')}
                    className={cn(
                      'flex-1 p-3 rounded-lg border-2 transition-all',
                      priority === 'A'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                        : 'border-border hover:border-red-300'
                    )}
                  >
                    <Badge className="bg-red-500 text-white mb-1">Priority A</Badge>
                    <p className="text-xs text-muted-foreground">Must close before startup</p>
                  </button>
                  <button
                    onClick={() => setPriority('B')}
                    className={cn(
                      'flex-1 p-3 rounded-lg border-2 transition-all',
                      priority === 'B'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                        : 'border-border hover:border-amber-300'
                    )}
                  >
                    <Badge className="bg-amber-500 text-white mb-1">Priority B</Badge>
                    <p className="text-xs text-muted-foreground">Can close after startup</p>
                  </button>
                </div>
              </div>

              {priority && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Create Priority Action</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically add to priority action tracker
                      </p>
                    </div>
                    <Switch
                      checked={createPriorityAction}
                      onCheckedChange={setCreatePriorityAction}
                    />
                  </div>

                  {createPriorityAction && (
                    <>
                      <div className="space-y-2">
                        <Label>Action Owner</Label>
                        <Input
                          value={actionOwnerName}
                          onChange={(e) => setActionOwnerName(e.target.value)}
                          placeholder="Enter action owner name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Target Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !targetDate && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {targetDate ? format(targetDate, 'PPP') : 'Select target date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={targetDate}
                              onSelect={setTargetDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!description.trim() || createObservation.isPending}
          >
            {createObservation.isPending ? 'Saving...' : 'Save Observation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
