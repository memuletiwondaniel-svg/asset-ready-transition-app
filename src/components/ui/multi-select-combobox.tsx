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
  multiColorBadges?: boolean
}

// Light pastel colors for multi-color badges
const pastelColors = [
  { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', close: 'text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200' },
  { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', close: 'text-sky-500 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-200' },
  { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', close: 'text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', close: 'text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-200' },
  { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800', close: 'text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-200' },
  { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800', close: 'text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-200' },
  { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', close: 'text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-200' },
  { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', close: 'text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200' },
];

const getColorForIndex = (index: number) => pastelColors[index % pastelColors.length];

export function MultiSelectCombobox({
  options,
  selectedValues,
  onValueChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  maxHeight = "200px",
  multiColorBadges = false
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
          {selectedValues.map((value, index) => {
            const color = multiColorBadges ? getColorForIndex(index) : null;
            return (
              <Badge 
                key={value} 
                variant={multiColorBadges ? 'outline' : 'secondary'} 
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1",
                  multiColorBadges && color && `${color.bg} ${color.text} ${color.border}`
                )}
              >
                {getSelectedLabel(value)}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-auto p-0 hover:bg-transparent",
                    multiColorBadges && color ? color.close : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => handleRemove(value)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
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