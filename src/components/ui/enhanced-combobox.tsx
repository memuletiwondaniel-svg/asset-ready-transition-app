import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface EnhancedComboboxOption {
  value: string
  label: string
  description?: string
}

interface EnhancedComboboxProps {
  options: EnhancedComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  onCreateNew?: (newValue: string) => Promise<any>
  placeholder?: string
  emptyText?: string
  createText?: string
  allowCreate?: boolean
  className?: string
  disabled?: boolean
  showSearch?: boolean
}

export function EnhancedCombobox({
  options,
  value,
  onValueChange,
  onCreateNew,
  placeholder = "Select option...",
  emptyText = "No option found.",
  createText = "Create",
  allowCreate = true,
  className,
  disabled = false,
  showSearch = true
}: EnhancedComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)

  const selectedOption = options.find(option => option.value === value)

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  )

  const shouldShowCreateOption = allowCreate && 
    onCreateNew && 
    searchValue.trim() && 
    !filteredOptions.some(option => 
      option.label.toLowerCase() === searchValue.toLowerCase()
    )

  const handleCreateNew = async () => {
    if (!onCreateNew || !searchValue.trim()) return
    
    setIsCreating(true)
    try {
      await onCreateNew(searchValue.trim())
      setSearchValue("")
      setOpen(false)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          {showSearch && (
            <CommandInput 
              placeholder="Search..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
          )}
          <CommandList className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
            <CommandEmpty>
              {emptyText}
              {shouldShowCreateOption && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleCreateNew}
                    disabled={isCreating}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isCreating ? "Creating..." : `${createText} "${searchValue}"`}
                  </Button>
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                    setSearchValue("")
                  }}
                  className="flex flex-col items-start py-2"
                >
                  <div className="flex items-center w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium">{option.label}</span>
                  </div>
                  {option.description && (
                    <span className="text-xs text-muted-foreground ml-6 mt-0.5">
                      {option.description}
                    </span>
                  )}
                </CommandItem>
              ))}
              {shouldShowCreateOption && filteredOptions.length > 0 && (
                <CommandItem
                  onSelect={handleCreateNew}
                  className="border-t border-border mt-1 pt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isCreating ? "Creating..." : `${createText} "${searchValue}"`}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}