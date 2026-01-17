import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Check, ChevronsUpDown, MapPin, Building, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePSSRReasons } from '@/hooks/usePSSRReasons';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { usePlants } from '@/hooks/usePlants';
import { useFields } from '@/hooks/useFields';
import { useStations } from '@/hooks/useStations';

interface EditPSSRModalProps {
  isOpen: boolean;
  onClose: () => void;
  pssrData: {
    id: string;
    title: string;
    asset: string;
    reason: string;
    projectId: string;
    projectName: string;
    initiator: string;
    scope: string;
    plantId?: string;
    fieldId?: string;
    stationId?: string;
    pssrLeadId?: string;
  };
  onSave: (data: any) => void;
}

export const EditPSSRModal: React.FC<EditPSSRModalProps> = ({
  isOpen,
  onClose,
  pssrData,
  onSave,
}) => {
  const { toast } = useToast();
  
  // Hooks for data fetching
  const { data: pssrReasons, isLoading: reasonsLoading } = usePSSRReasons();
  const { data: profileUsers, isLoading: usersLoading } = useProfileUsers();
  const { plants, isLoading: plantsLoading } = usePlants();
  const { fields, isLoading: fieldsLoading } = useFields();
  const { stations, isLoading: stationsLoading } = useStations();
  
  // Form state
  const [formData, setFormData] = useState({
    title: pssrData.title,
    reason: pssrData.reason,
    pssrLead: pssrData.initiator,
    pssrLeadId: pssrData.pssrLeadId || '',
    scope: pssrData.scope,
  });
  
  // Location hierarchy state
  const [plantId, setPlantId] = useState(pssrData.plantId || '');
  const [fieldId, setFieldId] = useState(pssrData.fieldId || '');
  const [stationId, setStationId] = useState(pssrData.stationId || '');
  
  // Popover state for PSSR Lead
  const [leadPopoverOpen, setLeadPopoverOpen] = useState(false);

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: pssrData.title,
        reason: pssrData.reason,
        pssrLead: pssrData.initiator,
        pssrLeadId: pssrData.pssrLeadId || '',
        scope: pssrData.scope,
      });
      setPlantId(pssrData.plantId || '');
      setFieldId(pssrData.fieldId || '');
      setStationId(pssrData.stationId || '');
    }
  }, [isOpen, pssrData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Build location string from hierarchy
  const getLocationString = () => {
    // Return the lowest level location (most specific)
    const station = stations?.find(s => s.id === stationId);
    if (station) return station.name;
    
    const field = fields?.find(f => f.id === fieldId);
    if (field) return field.name;
    
    const plant = plants?.find(p => p.id === plantId);
    if (plant) return plant.name;
    
    return '';
  };

  const handleSave = () => {
    const locationString = getLocationString();
    onSave({
      ...formData,
      asset: locationString,
      plantId,
      fieldId,
      stationId,
    });
    onClose();
  };

  // Get selected user for display
  const selectedUser = profileUsers?.find(u => u.user_id === formData.pssrLeadId);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-semibold">Edit PSSR Details</SheetTitle>
          <SheetDescription>
            Update the PSSR information below. Changes will be saved when you click Save.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* PSSR ID - Read Only */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">PSSR ID</Label>
            <Input 
              value={pssrData.id} 
              disabled 
              className="bg-muted/50 text-muted-foreground"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter PSSR title"
            />
          </div>

          {/* Location - Asset Hierarchy */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Location</Label>
            </div>
            
            {/* Plant Selection */}
            <div className="space-y-2">
              <Label htmlFor="plant" className="text-xs text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" />
                Plant *
              </Label>
              <Select
                value={plantId}
                onValueChange={(value) => {
                  setPlantId(value);
                  setFieldId('');
                  setStationId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={plantsLoading ? "Loading plants..." : "Select a plant"} />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  {plants?.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field Selection */}
            <div className="space-y-2">
              <Label htmlFor="field" className="text-xs text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Field
              </Label>
              <Select
                value={fieldId}
                onValueChange={(value) => {
                  setFieldId(value);
                  setStationId('');
                }}
                disabled={!plantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !plantId 
                      ? "Select a plant first" 
                      : fieldsLoading 
                        ? "Loading fields..." 
                        : "Select a field (optional)"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  {fields?.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Station Selection */}
            <div className="space-y-2">
              <Label htmlFor="station" className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Station / CS Location
              </Label>
              <Select
                value={stationId}
                onValueChange={setStationId}
                disabled={!plantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !plantId 
                      ? "Select a plant first" 
                      : stationsLoading 
                        ? "Loading stations..." 
                        : "Select a station (optional)"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  {stations?.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project - Read Only */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Project</Label>
            <Input 
              value={`${pssrData.projectId} - ${pssrData.projectName}`} 
              disabled 
              className="bg-muted/50 text-muted-foreground"
            />
          </div>

          {/* Reason - Database driven */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">Reason for PSSR</Label>
            <Select value={formData.reason} onValueChange={(value) => handleChange('reason', value)}>
              <SelectTrigger>
                <SelectValue placeholder={reasonsLoading ? "Loading reasons..." : "Select reason"} />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border max-h-[300px]">
                {pssrReasons?.map((reason) => (
                  <SelectItem key={reason.id} value={reason.name}>
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PSSR Lead - Searchable */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">PSSR Lead</Label>
            <Popover open={leadPopoverOpen} onOpenChange={setLeadPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={leadPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedUser ? (
                    <span className="flex items-center gap-2">
                      <span>{selectedUser.full_name}</span>
                      {selectedUser.position && (
                        <span className="text-muted-foreground text-xs">- {selectedUser.position}</span>
                      )}
                    </span>
                  ) : formData.pssrLead ? (
                    formData.pssrLead
                  ) : (
                    <span className="text-muted-foreground">
                      {usersLoading ? "Loading users..." : "Search and select PSSR lead..."}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or role..." />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {profileUsers?.map((user) => (
                        <CommandItem
                          key={user.user_id}
                          value={`${user.full_name} ${user.role || ''} ${user.position || ''}`}
                          onSelect={() => {
                            handleChange('pssrLeadId', user.user_id);
                            handleChange('pssrLead', user.full_name);
                            setLeadPopoverOpen(false);
                          }}
                          className="flex items-center justify-between py-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{user.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {[user.role, user.position].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                          <Check
                            className={cn(
                              "h-4 w-4",
                              formData.pssrLeadId === user.user_id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Scope Description */}
          <div className="space-y-2">
            <Label htmlFor="scope" className="text-sm font-medium">Scope Description</Label>
            <Textarea
              id="scope"
              value={formData.scope}
              onChange={(e) => handleChange('scope', e.target.value)}
              placeholder="Enter scope description"
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <SheetFooter className="mt-8 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
