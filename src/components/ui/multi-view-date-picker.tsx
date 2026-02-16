import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MultiViewDatePickerProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type View = 'days' | 'months' | 'years';

export const MultiViewDatePicker: React.FC<MultiViewDatePickerProps> = ({ selected, onSelect }) => {
  const now = new Date();
  const [viewDate, setViewDate] = useState(selected || now);
  const [view, setView] = useState<View>('days');

  const month = viewDate.getMonth();
  const year = viewDate.getFullYear();
  const decadeStart = Math.floor(year / 10) * 10;

  const navigate = (dir: -1 | 1) => {
    const d = new Date(viewDate);
    if (view === 'days') d.setMonth(d.getMonth() + dir);
    else if (view === 'months') d.setFullYear(d.getFullYear() + dir);
    else d.setFullYear(d.getFullYear() + dir * 10);
    setViewDate(d);
  };

  const headerLabel = view === 'days'
    ? `${MONTHS[month]} ${year}`
    : view === 'months'
      ? `${year}`
      : `${decadeStart} – ${decadeStart + 9}`;

  // Days grid
  const getDaysGrid = () => {
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay() - 1; // Monday = 0
    if (startDay < 0) startDay = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { day: number; month: number; year: number; outside: boolean }[] = [];
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, month: month - 1, year, outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, month, year, outside: false });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, month: month + 1, year, outside: true });
    }
    return cells;
  };

  const isSelected = (d: number, m: number, y: number) =>
    selected && selected.getDate() === d && selected.getMonth() === m && selected.getFullYear() === y;

  const isToday = (d: number, m: number, y: number) =>
    now.getDate() === d && now.getMonth() === m && now.getFullYear() === y;

  return (
    <div className="w-[280px] p-3 pointer-events-auto bg-popover rounded-lg border shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          className="text-sm font-semibold text-foreground hover:bg-muted rounded-md px-3 py-1 transition-colors"
          onClick={() => setView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'years')}
        >
          {headerLabel}
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days View */}
      {view === 'days' && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {getDaysGrid().map((cell, i) => (
              <button
                key={i}
                className={cn(
                  "h-8 w-full rounded-md text-xs transition-colors",
                  cell.outside && "text-muted-foreground/40",
                  !cell.outside && "text-foreground hover:bg-muted",
                  isToday(cell.day, cell.month, cell.year) && !isSelected(cell.day, cell.month, cell.year) && "bg-accent text-accent-foreground font-semibold",
                  isSelected(cell.day, cell.month, cell.year) && "bg-primary text-primary-foreground font-semibold hover:bg-primary"
                )}
                onClick={() => {
                  const d = new Date(cell.year, cell.month, cell.day);
                  onSelect?.(d);
                }}
              >
                {cell.day}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Months View */}
      {view === 'months' && (
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              className={cn(
                "h-10 rounded-md text-sm transition-colors hover:bg-muted",
                selected && selected.getMonth() === i && selected.getFullYear() === year
                  ? "bg-primary text-primary-foreground font-semibold hover:bg-primary"
                  : "text-foreground",
                now.getMonth() === i && now.getFullYear() === year && !(selected && selected.getMonth() === i && selected.getFullYear() === year)
                  && "bg-accent text-accent-foreground font-semibold"
              )}
              onClick={() => {
                const d = new Date(viewDate);
                d.setMonth(i);
                setViewDate(d);
                setView('days');
              }}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Years View */}
      {view === 'years' && (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i).map(y => (
            <button
              key={y}
              className={cn(
                "h-10 rounded-md text-sm transition-colors hover:bg-muted",
                (y < decadeStart || y > decadeStart + 9) && "text-muted-foreground/40",
                selected && selected.getFullYear() === y
                  ? "bg-primary text-primary-foreground font-semibold hover:bg-primary"
                  : "text-foreground",
                now.getFullYear() === y && !(selected && selected.getFullYear() === y)
                  && "bg-accent text-accent-foreground font-semibold"
              )}
              onClick={() => {
                const d = new Date(viewDate);
                d.setFullYear(y);
                setViewDate(d);
                setView('months');
              }}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Today shortcut */}
      <div className="mt-2 pt-2 border-t border-border">
        <button
          className="w-full text-xs text-primary hover:underline py-1"
          onClick={() => onSelect?.(new Date())}
        >
          Today
        </button>
      </div>
    </div>
  );
};
