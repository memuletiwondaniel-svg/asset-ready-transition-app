import * as React from "react"
import { X, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MultiSelectComboboxProps {
  options: { value: string; label: string }[]
  selectedValues: string[]
  onValueChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  maxHeight?: string
  badgeVariant?: 'default' | 'delivering' | 'receiving'
}

const getBadgeClasses = (variant?: string) => {
  switch (variant) {
    case 'delivering':
      return 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
    case 'receiving':
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    default:
      return '';
  }
};

export function MultiSelectCombobox({
  options,
  selectedValues,
  onValueChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  maxHeight = "200px",
  badgeVariant = 'default'
}: MultiSelectComboboxProps) {
  const [inputValue, setInputValue] = React.useState("")

  const availableOptions = options.filter(
    option => !selectedValues.includes(option.value)
  )

  const handleSelect = (value: string) => {
    if (value && !selectedValues.includes(value)) {
      onValueChange([...selectedValues, value])
    }
    setInputValue("")
  }

  const handleRemove = (valueToRemove: string) => {
    onValueChange(selectedValues.filter(value => value !== valueToRemove))
  }

  const getSelectedLabel = (value: string) => {
    return options.find(option => option.value === value)?.label || value
  }

  return (
    <div className={className}>
      {/* Selected items */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedValues.map((value) => (
            <Badge 
              key={value} 
              variant={badgeVariant === 'default' ? 'secondary' : 'outline'} 
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1",
                getBadgeClasses(badgeVariant)
              )}
            >
              {getSelectedLabel(value)}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-auto p-0 hover:bg-transparent",
                  badgeVariant === 'delivering' && "text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-200",
                  badgeVariant === 'receiving' && "text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200",
                  badgeVariant === 'default' && "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleRemove(value)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add new selection */}
      <div className="flex items-center gap-2">
        <Combobox
          options={availableOptions}
          value={inputValue}
          onValueChange={handleSelect}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-3"
          disabled={availableOptions.length === 0}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}