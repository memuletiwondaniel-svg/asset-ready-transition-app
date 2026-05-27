import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Columns, RotateCcw } from 'lucide-react';
import { PROJECTS_TABLE_COLUMNS } from './ProjectsTable';
import type { TablePreferences } from '@/hooks/useTablePreferences';

interface Props {
  prefs: TablePreferences;
  setPrefs: React.Dispatch<React.SetStateAction<TablePreferences>>;
  reset: () => void;
}

export function ProjectColumnsMenu({ prefs, setPrefs, reset }: Props) {
  const toggle = (id: string) =>
    setPrefs((p) => ({
      ...p,
      hidden: p.hidden.includes(id) ? p.hidden.filter((x) => x !== id) : [...p.hidden, id],
    }));

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" aria-label="Columns">
                <Columns className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Columns</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PROJECTS_TABLE_COLUMNS.filter((c) => c.hideable).map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={!prefs.hidden.includes(c.id)}
            onCheckedChange={() => toggle(c.id)}
          >
            {c.icon && <c.icon className="h-3.5 w-3.5 mr-2" />}
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={reset} className="text-xs">
          <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset layout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
