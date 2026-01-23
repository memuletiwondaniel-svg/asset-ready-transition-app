import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileUsers, ProfileUser } from '@/hooks/useProfileUsers';
import { SuggestedAttendee } from '@/hooks/useWalkdownSuggestedAttendees';

interface AddAttendeePopoverProps {
  existingAttendeeIds: Set<string>;
  onAddAttendee: (attendee: SuggestedAttendee) => void;
}

export const AddAttendeePopover: React.FC<AddAttendeePopoverProps> = ({
  existingAttendeeIds,
  onAddAttendee,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: profileUsers, isLoading } = useProfileUsers();

  const filteredUsers = useMemo(() => {
    if (!profileUsers) return [];
    
    const searchLower = search.toLowerCase();
    return profileUsers.filter(user => {
      // Filter by search term
      const matchesSearch = !search || 
        user.full_name.toLowerCase().includes(searchLower) ||
        user.position?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
  }, [profileUsers, search]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSelect = (user: ProfileUser) => {
    if (existingAttendeeIds.has(user.user_id)) return;
    
    onAddAttendee({
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      role: user.position || user.role || 'Team Member',
      avatar_url: user.avatar_url,
      source: 'responsible', // Manual additions marked as responsible
      baseRole: user.position || user.role || 'Manual',
    });
    
    setSearch('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Attendee
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search ? 'No users found' : 'Type to search for users'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredUsers.slice(0, 50).map((user) => {
                const isSelected = existingAttendeeIds.has(user.user_id);
                return (
                  <button
                    key={user.user_id}
                    onClick={() => handleSelect(user)}
                    disabled={isSelected}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors',
                      isSelected 
                        ? 'bg-primary/5 cursor-default' 
                        : 'hover:bg-muted cursor-pointer'
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={user.avatar_url} alt={user.full_name} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.position || user.role || 'No role assigned'}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
              {filteredUsers.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing first 50 results. Refine your search.
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
