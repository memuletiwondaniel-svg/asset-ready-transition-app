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

interface ComboboxProps {
  value?: string
  onValueChange?: (value: string) => void
  items: string[]
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
  placeholder = "Select item...",
  searchPlaceholder = "Search items...",
  emptyText = "No items found.",
  allowCustom = false,
  onAddCustom,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(searchValue.toLowerCase())
  )

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === value) {
      onValueChange?.("")
    } else {
      onValueChange?.(selectedValue)
    }
    setOpen(false)
    setSearchValue("")
  }

  const handleAddCustom = () => {
    if (searchValue.trim() && !items.includes(searchValue.trim())) {
      onAddCustom?.(searchValue.trim())
      onValueChange?.(searchValue.trim())
      setOpen(false)
      setSearchValue("")
    }
  }

  const showAddCustomOption = allowCustom && 
    searchValue.trim() && 
    !items.some(item => item.toLowerCase() === searchValue.toLowerCase()) &&
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
          {value || placeholder}
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
          <CommandList>
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
              {filteredItems.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={() => handleSelect(item)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item}
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