import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PSSRApproverItemsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  roleName: string;
  userName?: string;
  avatarUrl?: string | null;
  itemCount: number;
  partyType: 'delivering' | 'approving';
}

type FilterStatus = 'all' | 'completed' | 'in_review' | 'not_started';

const CATEGORY_COLORS: Record<string, string> = {
  'Design Integrity': 'text-violet-500',
  'Technical Integrity': 'text-blue-500',
  'Operating Integrity': 'text-cyan-500',
  'Management Systems': 'text-amber-500',
  'Health & Safety': 'text-emerald-500',
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

function deriveStatus(response: string | null, status: string | null): 'completed' | 'in_review' | 'not_started' {
  const s = (status || '').toLowerCase();
  const r = (response || '').toUpperCase();
  if (s === 'approved' || r === 'YES' || r === 'NA' || r === 'N/A') return 'completed';
  if (s === 'submitted' || s === 'in_review' || s === 'under_review') return 'in_review';
  if (response && response.trim() !== '') return 'in_review'; // has response but not approved
  return 'not_started';
}

const statusConfig = {
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  in_review: { label: 'In Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  not_started: { label: 'Not Started', icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-muted/50 border-border', dot: 'bg-muted-foreground' },
};

export const PSSRApproverItemsSheet: React.FC<PSSRApproverItemsSheetProps> = ({
  open,
  onOpenChange,
  pssrId,
  roleName,
  userName,
  avatarUrl,
  itemCount,
  partyType,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pssr-approver-items', pssrId, roleName, partyType],
    queryFn: async () => {
      const client = supabase as any;

      // Step 1: Fetch responses matching this role
      let query = client
        .from('pssr_checklist_responses')
        .select('id, response, status, checklist_item_id, approving_role, delivering_role')
        .eq('pssr_id', pssrId);

      if (partyType === 'approving') {
        query = query.ilike('approving_role', `%${roleName}%`);
      } else {
        query = query.eq('delivering_role', roleName);
      }

      const { data: responses, error } = await query;
      if (error) throw error;
      if (!responses?.length) return [];

      // Step 2: Batch-fetch checklist item details (checklist_item_id is text, pssr_checklist_items.id is uuid)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const standardIds = [...new Set(responses.map((r: any) => r.checklist_item_id).filter((id: any) => id && uuidRegex.test(id)))];

      let itemMap: Record<string, { description: string; category: string; topic: string | null; sequence_number: number | null }> = {};

      if (standardIds.length > 0) {
        // Use RPC or direct query — category is a UUID FK, need to resolve name
        const { data: stdItems } = await client
          .from('pssr_checklist_items')
          .select('id, description, category, topic, sequence_number')
          .in('id', standardIds);

        // Collect category UUIDs to resolve names
        const catIds = [...new Set((stdItems || []).map((i: any) => i.category).filter((c: any) => c && uuidRegex.test(c)))];
        let catMap: Record<string, string> = {};
        if (catIds.length > 0) {
          const { data: cats } = await client
            .from('pssr_checklist_categories')
            .select('id, name')
            .in('id', catIds);
          (cats || []).forEach((c: any) => { catMap[c.id] = c.name; });
        }

        (stdItems || []).forEach((i: any) => {
          itemMap[i.id] = {
            description: i.description,
            category: catMap[i.category] || 'Other',
            topic: i.topic,
            sequence_number: i.sequence_number,
          };
        });
      }

      // Step 3: Merge
      return responses.map((r: any) => {
        const itemId = r.checklist_item_id;
        const detail = itemMap[itemId];
        return {
          id: r.id,
          description: detail?.description || 'Unknown item',
          category: detail?.category || 'Other',
          topic: detail?.topic || null,
          sequence_number: detail?.sequence_number || null,
          status: deriveStatus(r.response, r.status),
        };
      });
    },
    enabled: open,
  });

  const filteredItems = useMemo(() => {
    let result = items;
    if (filter !== 'all') result = result.filter(i => i.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.description?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.topic?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filter, search]);

  const counts = useMemo(() => ({
    all: items.length,
    completed: items.filter(i => i.status === 'completed').length,
    in_review: items.filter(i => i.status === 'in_review').length,
    not_started: items.filter(i => i.status === 'not_started').length,
  }), [items]);

  const displayName = userName || roleName;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-foreground truncate">
                {displayName}
              </SheetTitle>
              <div className="text-sm text-muted-foreground">{roleName}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">
                  {counts.completed}/{itemCount} items
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize">
                  {partyType}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Search & filter tabs */}
        <div className="px-6 py-3 border-b shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {([
              { key: 'all' as FilterStatus, label: 'All', count: counts.all },
              { key: 'not_started' as FilterStatus, label: 'Not Started', count: counts.not_started },
              { key: 'in_review' as FilterStatus, label: 'In Review', count: counts.in_review },
              { key: 'completed' as FilterStatus, label: 'Completed', count: counts.completed },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* Items list */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-muted-foreground">No items found</div>
              </div>
            ) : (
              filteredItems.map((item) => {
                const sc = statusConfig[item.status];
                const StatusIcon = sc.icon;
                const catColor = CATEGORY_COLORS[item.category] || 'text-muted-foreground';
                return (
                  <div
                    key={item.id}
                    className={cn("rounded-xl border p-3 transition-colors", sc.bg)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", sc.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground leading-snug">
                          {item.description}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-[9px] font-medium", catColor)}>
                            {item.category}
                          </span>
                          {item.topic && (
                            <>
                              <span className="text-[8px] text-muted-foreground">·</span>
                              <span className="text-[9px] text-muted-foreground truncate">{item.topic}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusIcon className={cn("w-3.5 h-3.5", sc.color)} />
                        <span className={cn("text-[9px] font-medium", sc.color)}>{sc.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
