import * as React from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

type DrillView = "days" | "months" | "years";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface DrillDownCalendarProps {
  mode?: "range" | "single";
  selected?: DateRange | Date | undefined;
  onSelect?: (range: DateRange | undefined) => void;
  numberOfMonths?: number;
  initialFocus?: boolean;
  className?: string;
}

export function DrillDownCalendar({
  className,
  ...calendarProps
}: DrillDownCalendarProps) {
  const [view, setView] = useState<DrillView>("days");
  const [displayMonth, setDisplayMonth] = useState(new Date());

  const currentYear = displayMonth.getFullYear();
  const currentMonthIdx = displayMonth.getMonth();

  const startYear = currentYear - (currentYear % 12);
  const years = Array.from({ length: 12 }, (_, i) => startYear + i);

  const navBtnClass = cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute");

  if (view === "years") {
    return (
      <div className={cn("p-3 pointer-events-auto w-full", className)}>
        <div className="flex justify-center relative items-center pt-1 mb-4">
          <button onClick={() => setDisplayMonth(new Date(startYear - 12, currentMonthIdx, 1))} className={cn(navBtnClass, "left-1")}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{startYear} – {startYear + 11}</span>
          <button onClick={() => setDisplayMonth(new Date(startYear + 12, currentMonthIdx, 1))} className={cn(navBtnClass, "right-1")}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {years.map((yr) => (
            <button
              key={yr}
              onClick={() => { setDisplayMonth(new Date(yr, currentMonthIdx, 1)); setView("months"); }}
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
      <div className={cn("p-3 pointer-events-auto w-full", className)}>
        <div className="flex justify-center relative items-center pt-1 mb-4">
          <button onClick={() => setDisplayMonth(new Date(currentYear - 1, currentMonthIdx, 1))} className={cn(navBtnClass, "left-1")}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setView("years")} className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">
            {currentYear}
          </button>
          <button onClick={() => setDisplayMonth(new Date(currentYear + 1, currentMonthIdx, 1))} className={cn(navBtnClass, "right-1")}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {MONTH_NAMES.map((name, idx) => (
            <button
              key={idx}
              onClick={() => { setDisplayMonth(new Date(currentYear, idx, 1)); setView("days"); }}
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

  // Days view with clickable caption
  return (
    <div className={cn("pointer-events-auto w-full", className)}>
      {/* Custom caption header */}
      <div className="flex justify-center relative items-center pt-1 px-3 mb-1">
        <button
          onClick={() => setDisplayMonth(new Date(currentYear, currentMonthIdx - 1, 1))}
          className={cn(navBtnClass, "left-3")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setView("months")}
          className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
        >
          {displayMonth.toLocaleString("default", { month: "long" })} {currentYear}
        </button>
        <button
          onClick={() => setDisplayMonth(new Date(currentYear, currentMonthIdx + 1, 1))}
          className={cn(navBtnClass, "right-3")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <Calendar
        {...calendarProps as any}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        className="p-3 pt-0 pointer-events-auto"
        classNames={{
          caption: "hidden",
        }}
      />
    </div>
  );
}
