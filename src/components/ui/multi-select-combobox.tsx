import * as React from "react"
import { X, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"

interface MultiSelectComboboxProps {
  options: { value: string; label: string }[]
  selectedValues: string[]
  onValueChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  maxHeight?: string
}

export function MultiSelectCombobox({
  options,
  selectedValues,
  onValueChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  maxHeight = "200px"
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
            <Badge key={value} variant="secondary" className="flex items-center gap-1">
              {getSelectedLabel(value)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
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