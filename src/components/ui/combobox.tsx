import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Option type used by some components
export interface ComboboxOption { 
  value: string; 
  label: string 
}

interface ComboboxProps {
  value?: string
  onValueChange?: (value: string) => void
  items?: string[]
  // Also support option objects used elsewhere in the app
  options?: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  allowCustom?: boolean
  onAddCustom?: (value: string) => void
  className?: string
}

export function Combobox({
  value,
  onValueChange,
  items,
  options,
  placeholder = "Select item...",
  searchPlaceholder = "Search items...",
  emptyText = "No items found.",
  allowCustom = false,
  onAddCustom,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const sourceItems = React.useMemo(() => {
    if (options && options.length) return options.map(o => o.label)
    return items || []
  }, [items, options])

  const filteredItems = sourceItems.filter(item =>
    item.toLowerCase().includes(searchValue.toLowerCase())
  )

  const handleSelect = (selectedLabel: string) => {
    // If options provided, resolve the value from the label
    const resolvedValue = options?.find(o => o.label === selectedLabel)?.value || selectedLabel
    if (resolvedValue === value) {
      onValueChange?.("")
    } else {
      onValueChange?.(resolvedValue)
    }
    setOpen(false)
    setSearchValue("")
  }

  const handleAddCustom = () => {
    if (searchValue.trim() && !sourceItems.includes(searchValue.trim())) {
      onAddCustom?.(searchValue.trim())
      onValueChange?.(searchValue.trim())
      setOpen(false)
      setSearchValue("")
    }
  }

  const showAddCustomOption = allowCustom && 
    searchValue.trim() && 
    !sourceItems.some(item => item.toLowerCase() === searchValue.toLowerCase()) &&
    onAddCustom

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {options && value
            ? (options.find(o => o.value === value)?.label || placeholder)
            : (value || placeholder)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50 bg-popover border shadow-lg">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-48 overflow-auto">
            <CommandEmpty>
              {showAddCustomOption ? (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left"
                    onClick={handleAddCustom}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add "{searchValue}"
                  </Button>
                </div>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredItems.map((label) => (
                <CommandItem
                  key={label}
                  value={label}
                  onSelect={() => handleSelect(label)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      (options ? options.find(o => o.value === value)?.label === label : value === label) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {label}
                </CommandItem>
              ))}
              {showAddCustomOption && filteredItems.length > 0 && (
                <CommandItem
                  onSelect={handleAddCustom}
                  className="cursor-pointer border-t mt-1 pt-2"
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
  )
}

// Multi-select combobox used by some modals
interface MultiSelectProps {
  value: string[]
  onValueChange: (values: string[]) => void
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
}

export function MultiSelectCombobox({ 
  value, 
  onValueChange, 
  options, 
  placeholder = "Select...", 
  searchPlaceholder = "Search...", 
  className 
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (v: string) => {
    if (value.includes(v)) onValueChange(value.filter(x => x !== v))
    else onValueChange([...value, v])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("w-full justify-between", className)}>
          {value.length ? `${value.length} selected` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50 bg-popover border shadow-lg">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList className="max-h-48 overflow-auto">
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem key={opt.value} value={opt.value} onSelect={() => toggle(opt.value)} className="cursor-pointer">
                  <Check className={cn("mr-2 h-4 w-4", value.includes(opt.value) ? "opacity-100" : "opacity-0")} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}