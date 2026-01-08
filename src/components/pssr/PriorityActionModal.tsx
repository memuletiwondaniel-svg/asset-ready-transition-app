import React, { useState } from 'react';
import { AlertTriangle, User, Calendar, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriorityActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priority: 'A' | 'B';
  onSubmit: (data: {
    description: string;
    actionOwnerId?: string;
    actionOwnerName?: string;
    targetDate?: string;
  }) => void;
  isSubmitting: boolean;
}

const PriorityActionModal: React.FC<PriorityActionModalProps> = ({
  open,
  onOpenChange,
  priority,
  onSubmit,
  isSubmitting,
}) => {
  const [description, setDescription] = useState('');
  const [actionOwnerId, setActionOwnerId] = useState<string>('');
  const [actionOwnerName, setActionOwnerName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);

  // Fetch users for action owner selection
  const { data: users } = useQuery({
    queryKey: ['profiles-for-action-owner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, position')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = () => {
    if (!description.trim()) return;
    
    onSubmit({
      description,
      actionOwnerId: actionOwnerId || undefined,
      actionOwnerName: actionOwnerName || undefined,
      targetDate: targetDate || undefined,
    });
    
    // Reset form
    setDescription('');
    setActionOwnerId('');
    setActionOwnerName('');
    setTargetDate('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setDescription('');
    setActionOwnerId('');
    setActionOwnerName('');
    setTargetDate('');
  };

  const selectedUser = users?.find(u => u.user_id === actionOwnerId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${priority === 'A' ? 'bg-red-100 dark:bg-red-950' : 'bg-orange-100 dark:bg-orange-950'}`}>
              <AlertTriangle className={`h-5 w-5 ${priority === 'A' ? 'text-red-600' : 'text-orange-600'}`} />
            </div>
            Create Priority {priority} Action
          </DialogTitle>
          <DialogDescription>
            {priority === 'A' ? (
              <Badge variant="destructive" className="mt-2">
                Must be completed BEFORE PSSR can be signed off
              </Badge>
            ) : (
              <Badge className="bg-orange-500 mt-2">
                Can be completed AFTER startup
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-4 py-4">
          {/* Action Description */}
          <div className="space-y-2">
            <Label htmlFor="action-description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Action Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="action-description"
              placeholder="Describe the action that needs to be taken..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Action Owner */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Action Owner
            </Label>
            <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={ownerPopoverOpen}
                  className="w-full justify-between"
                >
                  {selectedUser ? selectedUser.full_name || selectedUser.email : 'Select action owner...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      {users?.map((user) => (
                        <CommandItem
                          key={user.user_id}
                          value={`${user.full_name} ${user.email}`}
                          onSelect={() => {
                            setActionOwnerId(user.user_id);
                            setActionOwnerName(user.full_name || user.email);
                            setOwnerPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              actionOwnerId === user.user_id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{user.full_name || 'No name'}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Or enter a name manually if not in the system
            </p>
            <Input
              placeholder="Enter name manually..."
              value={actionOwnerName}
              onChange={(e) => {
                setActionOwnerName(e.target.value);
                setActionOwnerId(''); // Clear user ID if manually entering
              }}
            />
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label htmlFor="target-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Target Completion Date
            </Label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
            className={priority === 'A' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
          >
            {isSubmitting ? 'Creating...' : `Create Priority ${priority} Action`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PriorityActionModal;
