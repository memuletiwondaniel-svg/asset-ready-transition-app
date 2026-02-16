import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ApproverDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrId: string;
  approverRoleName: string;
  approverUserName?: string;
  approverAvatarUrl?: string;
  approverItemCount: number;
  approverAcceptedCount: number;
}

type FilterStatus = 'all' | 'completed' | 'pending' | 'not_submitted';

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  'Design Integrity': { icon: FileText, color: 'text-violet-500' },
  'Technical Integrity': { icon: FileText, color: 'text-blue-500' },
  'Operating Integrity': { icon: FileText, color: 'text-cyan-500' },
  'Management Systems': { icon: FileText, color: 'text-amber-500' },
  'Health & Safety': { icon: FileText, color: 'text-emerald-500' },
};

export const ApproverDetailSheet: React.FC<ApproverDetailSheetProps> = ({
  open,
  onOpenChange,
  vcrId,
  approverRoleName,
  approverUserName,
  approverAvatarUrl,
  approverItemCount,
  approverAcceptedCount,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Fetch VCR items assigned to this approver role, with their prereq status for this VCR
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['approver-vcr-items', vcrId, approverRoleName],
    queryFn: async () => {
      const client = supabase as any;

      // Get the role ID for this role name
      const { data: roles } = await client
        .from('roles')
        .select('id')
        .eq('name', approverRoleName)
        .limit(1);

      const roleId = roles?.[0]?.id;
      if (!roleId) return [];

      // Get all VCR items that have this role in approving_party_role_ids
      const { data: allItems } = await client
        .from('vcr_items')
        .select(`
          id, vcr_item, supporting_evidence, display_order, topic,
          vcr_item_categories!vcr_items_category_id_fkey (name)
        `)
        .eq('is_active', true)
        .contains('approving_party_role_ids', [roleId])
        .order('display_order', { ascending: true });

      if (!allItems?.length) return [];

      // Get prereqs for this VCR to check status
      const { data: prereqs } = await client
        .from('p2a_vcr_prerequisites')
        .select('id, summary, status, submitted_at, reviewed_at')
        .eq('handover_point_id', vcrId);

      const prereqMap = new Map<string, any>();
      if (prereqs) {
        for (const p of prereqs) {
          prereqMap.set(p.summary?.toLowerCase().trim(), p);
        }
      }

      const acceptedStatuses = ['ACCEPTED', 'QUALIFICATION_APPROVED'];
      const reviewStatuses = ['SUBMITTED', 'IN_REVIEW', 'UNDER_REVIEW'];

      return allItems.map((item: any, idx: number) => {
        const prereq = prereqMap.get(item.vcr_item?.toLowerCase().trim());
        let status: 'completed' | 'pending' | 'not_submitted' = 'not_submitted';
        if (prereq) {
          if (acceptedStatuses.includes(prereq.status)) status = 'completed';
          else if (reviewStatuses.includes(prereq.status)) status = 'pending';
          else status = 'not_submitted';
        }
        return {
          id: item.id,
          name: item.vcr_item,
          topic: item.topic,
          category: item.vcr_item_categories?.name || 'Other',
          status,
          submittedAt: prereq?.submitted_at,
          reviewedAt: prereq?.reviewed_at,
          order: item.display_order || idx,
        };
      });
    },
    enabled: open,
  });

  const filteredItems = useMemo(() => {
    let result = items;
    if (filter !== 'all') {
      result = result.filter(i => i.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.topic?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filter, search]);

  const counts = useMemo(() => ({
    all: items.length,
    completed: items.filter(i => i.status === 'completed').length,
    pending: items.filter(i => i.status === 'pending').length,
    not_submitted: items.filter(i => i.status === 'not_submitted').length,
  }), [items]);

  const displayName = approverUserName || approverRoleName;

  const statusConfig = {
    completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    pending: { label: 'In Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
    not_submitted: { label: 'Not Submitted', icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-muted/50 border-border', dot: 'bg-muted-foreground' },
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 shrink-0">
              {approverAvatarUrl && (
                <AvatarImage src={approverAvatarUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-foreground truncate">
                {displayName}
              </SheetTitle>
              <div className="text-sm text-muted-foreground">{approverRoleName}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">
                  {approverAcceptedCount}/{approverItemCount} items
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Filter tabs */}
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
              { key: 'not_submitted' as FilterStatus, label: 'Not Submitted', count: counts.not_submitted },
              { key: 'pending' as FilterStatus, label: 'In Review', count: counts.pending },
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
              filteredItems.map((item, idx) => {
                const sc = statusConfig[item.status];
                const StatusIcon = sc.icon;
                const catMeta = CATEGORY_ICONS[item.category];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      sc.bg
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", sc.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground leading-snug">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-[9px] font-medium", catMeta?.color || 'text-muted-foreground')}>
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
