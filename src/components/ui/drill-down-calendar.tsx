import * as React from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";

type DrillView = "days" | "months" | "years";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface DrillDownCalendarProps extends CalendarProps {
  /** Currently displayed month (controlled externally or internally) */
  month?: Date;
  onMonthChange?: (month: Date) => void;
}

export function DrillDownCalendar({
  className,
  month: controlledMonth,
  onMonthChange,
  ...calendarProps
}: DrillDownCalendarProps) {
  const [view, setView] = useState<DrillView>("days");
  const [internalMonth, setInternalMonth] = useState(controlledMonth ?? new Date());

  const displayMonth = controlledMonth ?? internalMonth;
  const setDisplayMonth = (d: Date) => {
    setInternalMonth(d);
    onMonthChange?.(d);
  };

  const currentYear = displayMonth.getFullYear();
  const currentMonthIdx = displayMonth.getMonth();

  // Year range for the years grid (show 12 years centered around current)
  const startYear = currentYear - (currentYear % 12);
  const years = Array.from({ length: 12 }, (_, i) => startYear + i);

  if (view === "years") {
    return (
      <div className={cn("p-3 pointer-events-auto", className)}>
        {/* Header */}
        <div className="flex justify-center relative items-center pt-1 mb-4">
          <button
            onClick={() => setDisplayMonth(new Date(startYear - 12, currentMonthIdx, 1))}
            className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {startYear} – {startYear + 11}
          </span>
          <button
            onClick={() => setDisplayMonth(new Date(startYear + 12, currentMonthIdx, 1))}
            className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {/* Year grid */}
        <div className="grid grid-cols-4 gap-2">
          {years.map((yr) => (
            <button
              key={yr}
              onClick={() => {
                setDisplayMonth(new Date(yr, currentMonthIdx, 1));
                setView("months");
              }}
              className={cn(
                "h-9 rounded-md text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground",
                yr === new Date().getFullYear() && "bg-accent text-accent-foreground",
                yr === currentYear && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === "months") {
    return (
      <div className={cn("p-3 pointer-events-auto", className)}>
        {/* Header */}
        <div className="flex justify-center relative items-center pt-1 mb-4">
          <button
            onClick={() => setDisplayMonth(new Date(currentYear - 1, currentMonthIdx, 1))}
            className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("years")}
            className="text-sm font-medium hover:text-primary transition-colors cursor-pointer"
          >
            {currentYear}
          </button>
          <button
            onClick={() => setDisplayMonth(new Date(currentYear + 1, currentMonthIdx, 1))}
            className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {/* Month grid */}
        <div className="grid grid-cols-4 gap-2">
          {MONTH_NAMES.map((name, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDisplayMonth(new Date(currentYear, idx, 1));
                setView("days");
              }}
              className={cn(
                "h-9 rounded-md text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground",
                idx === new Date().getMonth() && currentYear === new Date().getFullYear() && "bg-accent text-accent-foreground",
                idx === currentMonthIdx && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Days view — use the standard Calendar but override the caption label to be clickable
  return (
    <Calendar
      {...calendarProps}
      month={displayMonth}
      onMonthChange={setDisplayMonth}
      className={cn("pointer-events-auto", className)}
      classNames={{
        ...calendarProps.classNames,
        caption_label: "text-sm font-medium cursor-pointer hover:text-primary transition-colors",
      }}
      components={{
        ...calendarProps.components,
        CaptionLabel: ({ children, ...props }) => (
          <button
            onClick={() => setView("months")}
            className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
          >
            {children}
          </button>
        ),
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
    />
  );
}
