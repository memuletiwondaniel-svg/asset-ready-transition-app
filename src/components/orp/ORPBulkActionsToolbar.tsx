import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Calendar, Users, X } from 'lucide-react';
import { useProfileUsers } from '@/hooks/useProfileUsers';

interface ORPBulkActionsToolbarProps {
  selectedCount: number;
  onUpdateStatus: (status: string) => void;
  onAssignResource: (userId: string) => void;
  onSetDates: (startDate: string, endDate: string) => void;
  onClearSelection: () => void;
}

export const ORPBulkActionsToolbar: React.FC<ORPBulkActionsToolbarProps> = ({
  selectedCount,
  onUpdateStatus,
  onAssignResource,
  onSetDates,
  onClearSelection
}) => {
  const { data: users } = useProfileUsers();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5">
      <Badge variant="secondary" className="gap-2">
        <CheckSquare className="w-4 h-4" />
        {selectedCount} selected
      </Badge>

      <div className="h-6 w-px bg-border" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Update Status
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <Label>Select Status</Label>
            <Select onValueChange={onUpdateStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            Assign Resource
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <Label>Select Team Member</Label>
            <Select onValueChange={onAssignResource}>
              <SelectTrigger>
                <SelectValue placeholder="Choose user" />
              </SelectTrigger>
              <SelectContent>
                {users?.filter((user) => user.user_id).map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name} - {user.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            Set Dates
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button
              onClick={() => {
                if (startDate && endDate) {
                  onSetDates(startDate, endDate);
                  setStartDate('');
                  setEndDate('');
                }
              }}
              disabled={!startDate || !endDate}
              className="w-full"
            >
              Apply Dates
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="gap-2"
      >
        <X className="w-4 h-4" />
        Clear
      </Button>
    </div>
  );
};
