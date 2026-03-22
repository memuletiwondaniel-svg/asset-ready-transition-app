import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedSearchableComboboxOption {
  value: string;
  label: string;
  displayValue?: string;
}

interface EnhancedSearchableComboboxProps {
  options: EnhancedSearchableComboboxOption[];
  value?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  onValueChange: (value: string) => void;
  onCreateNew?: (value: string) => void;
  allowCreate?: boolean;
  className?: string;
  disabled?: boolean;
}

export const EnhancedSearchableCombobox: React.FC<EnhancedSearchableComboboxProps> = ({
  options,
  value,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  onValueChange,
  onCreateNew,
  allowCreate = false,
  className,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const showCreateOption = allowCreate && 
    searchValue && 
    !filteredOptions.some(option => option.label.toLowerCase() === searchValue.toLowerCase());

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleCreate = () => {
    if (onCreateNew && searchValue) {
      onCreateNew(searchValue);
      onValueChange(searchValue);
      setOpen(false);
      setSearchValue("");
    }
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-background/95 backdrop-blur-sm hover:bg-accent/10 hover:border-primary/30 transition-all duration-300",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? (selectedOption.displayValue || selectedOption.label) : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover/95 backdrop-blur-lg border border-border/40 shadow-lg pointer-events-auto z-[200]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
            className="border-0 focus:ring-0"
          />
          <CommandList className="max-h-[240px] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  title={option.label}
                  className="cursor-pointer hover:bg-accent/10 transition-colors duration-200 h-9 min-h-[36px] max-h-[36px] text-[13px] whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
              {showCreateOption && (
                <CommandItem
                  onSelect={handleCreate}
                  className="cursor-pointer text-primary hover:bg-primary/10 border-t border-border/40 mt-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add "{searchValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};