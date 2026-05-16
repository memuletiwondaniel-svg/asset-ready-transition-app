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
import { Settings2, RotateCcw } from 'lucide-react';
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
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          <span className="text-xs">Columns</span>
        </Button>
      </DropdownMenuTrigger>
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
