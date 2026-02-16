import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { WizardActivity, catalogToWizardActivity } from './types';
import { useORAActivityCatalog } from '@/hooks/useORAActivityCatalog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingIds: string[];
  onAdd: (activities: WizardActivity[]) => void;
}

export const AddFromCatalogDialog: React.FC<Props> = ({ open, onOpenChange, existingIds, onAdd }) => {
  const { activities: catalogActivities } = useORAActivityCatalog();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const available = catalogActivities.filter(a => !existingIds.includes(a.id));
  const filtered = available.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const toAdd = catalogActivities.filter(a => selected.has(a.id)).map(catalogToWizardActivity);
    onAdd(toAdd);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add from Activity Catalog</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search catalog..." className="pl-9" />
        </div>
        <ScrollArea className="flex-1 max-h-[40vh]">
          <div className="space-y-1 pr-3">
            {filtered.map(a => (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => toggleSelect(a.id)}>
                <Checkbox checked={selected.has(a.id)} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{a.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{a.phase}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selected.size === 0}>
            Add {selected.size} Activities
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
