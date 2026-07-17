import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, X, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export interface ReviewerPick {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role_label?: string | null;
}

const initialsOf = (name: string | null | undefined) =>
  (name || '?').split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const resolveAvatar = (u: string | null | undefined) => {
  if (!u) return null;
  if (u.startsWith('http')) return u;
  return supabase.storage.from('user-avatars').getPublicUrl(u).data.publicUrl;
};

interface Props {
  value: ReviewerPick[];
  onChange: (next: ReviewerPick[]) => void;
  disabled?: boolean;
}

/**
 * Hover-X reviewer cards + an "Add reviewer" picker (popover search).
 * Uses the profiles table directly for search.
 */
export const ReviewerPickerList: React.FC<Props> = ({ value, onChange, disabled }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ReviewerPick[]>([]);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const client = supabase as any;
      let query = client
        .from('profiles')
        .select('user_id, full_name, avatar_url, user_position')
        .not('full_name', 'is', null)
        .limit(20);
      if (q.trim()) query = query.ilike('full_name', `%${q.trim()}%`);
      const { data } = await query;
      if (cancelled) return;
      const rows: ReviewerPick[] = (data || [])
        .filter((p: any) => !value.some((v) => v.user_id === p.user_id))
        .map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          role_label: p.user_position || null,
        }));
      setResults(rows);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, pickerOpen, value]);

  const remove = (userId: string) => onChange(value.filter((r) => r.user_id !== userId));
  const add = (r: ReviewerPick) => {
    onChange([...value, r]);
    setQ('');
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((r) => {
            const av = resolveAvatar(r.avatar_url);
            return (
              <div
                key={r.user_id}
                className="group flex items-center gap-2.5 rounded-md border bg-background px-2.5 py-1.5"
              >
                <Avatar className="h-6 w-6">
                  {av && <AvatarImage src={av} alt={r.full_name || ''} />}
                  <AvatarFallback className="text-[9px] bg-muted">{initialsOf(r.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium leading-tight truncate">
                    {r.full_name || 'Unknown'}
                  </div>
                  {r.role_label && (
                    <div className="text-[10.5px] text-muted-foreground truncate">{r.role_label}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.user_id)}
                  aria-label="Remove reviewer"
                  disabled={disabled}
                  className={cn(
                    'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity',
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            disabled={disabled}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add reviewer
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2 pointer-events-auto z-[1420]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people…"
              className="pl-7 h-8 text-[12.5px]"
              autoFocus
            />
          </div>
          <div className="mt-2 max-h-56 overflow-auto">
            {results.length === 0 ? (
              <div className="py-4 text-center text-[11.5px] text-muted-foreground">No people found.</div>
            ) : (
              results.map((r) => {
                const av = resolveAvatar(r.avatar_url);
                return (
                  <button
                    key={r.user_id}
                    type="button"
                    onClick={() => add(r)}
                    className="w-full flex items-center gap-2 px-1.5 py-1.5 text-left rounded hover:bg-accent"
                  >
                    <Avatar className="h-6 w-6">
                      {av && <AvatarImage src={av} alt={r.full_name || ''} />}
                      <AvatarFallback className="text-[9px] bg-muted">{initialsOf(r.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium leading-tight truncate">
                        {r.full_name || 'Unknown'}
                      </div>
                      {r.role_label && (
                        <div className="text-[10.5px] text-muted-foreground truncate">{r.role_label}</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
