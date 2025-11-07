import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DateRangeFilter {
  created?: { from?: Date; to?: Date };
  nextReview?: { from?: Date; to?: Date };
  completed?: { from?: Date; to?: Date };
}

interface PSSRDateRangeFilterProps {
  value: DateRangeFilter;
  onChange: (value: DateRangeFilter) => void;
}

const PSSRDateRangeFilter: React.FC<PSSRDateRangeFilterProps> = ({ value, onChange }) => {
  const updateDateRange = (
    field: keyof DateRangeFilter,
    range: { from?: Date; to?: Date }
  ) => {
    onChange({
      ...value,
      [field]: range
    });
  };

  const clearDateRange = (field: keyof DateRangeFilter) => {
    const newValue = { ...value };
    delete newValue[field];
    onChange(newValue);
  };

  const hasActiveFilters = () => {
    return value.created || value.nextReview || value.completed;
  };

  const clearAllDateFilters = () => {
    onChange({});
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Date Filters</Label>
        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllDateFilters}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Created Date Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Created Date</Label>
          {value.created && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearDateRange('created')}
              className="h-auto p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value.created && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.created?.from ? (
                value.created.to ? (
                  <>
                    {format(value.created.from, "LLL dd, y")} -{" "}
                    {format(value.created.to, "LLL dd, y")}
                  </>
                ) : (
                  format(value.created.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value.created?.from}
              selected={{ from: value.created?.from, to: value.created?.to }}
              onSelect={(range) => updateDateRange('created', range || {})}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Next Review Date Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Next Review Date</Label>
          {value.nextReview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearDateRange('nextReview')}
              className="h-auto p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value.nextReview && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.nextReview?.from ? (
                value.nextReview.to ? (
                  <>
                    {format(value.nextReview.from, "LLL dd, y")} -{" "}
                    {format(value.nextReview.to, "LLL dd, y")}
                  </>
                ) : (
                  format(value.nextReview.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value.nextReview?.from}
              selected={{ from: value.nextReview?.from, to: value.nextReview?.to }}
              onSelect={(range) => updateDateRange('nextReview', range || {})}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Completed Date Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Completed Date</Label>
          {value.completed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearDateRange('completed')}
              className="h-auto p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value.completed && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.completed?.from ? (
                value.completed.to ? (
                  <>
                    {format(value.completed.from, "LLL dd, y")} -{" "}
                    {format(value.completed.to, "LLL dd, y")}
                  </>
                ) : (
                  format(value.completed.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value.completed?.from}
              selected={{ from: value.completed?.from, to: value.completed?.to }}
              onSelect={(range) => updateDateRange('completed', range || {})}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default PSSRDateRangeFilter;
