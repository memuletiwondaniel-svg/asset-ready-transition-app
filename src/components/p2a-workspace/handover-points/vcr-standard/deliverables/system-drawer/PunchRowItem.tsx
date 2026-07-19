import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PunchRow, usePunchComments, useAddPunchComment } from '../useSystemDetail';

const initialsOf = (name: string | null): string => {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
};

// Stable pastel per user id
const AVATAR_BG = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-teal-500'];
const bgFor = (uid: string | null) => {
  if (!uid) return 'bg-slate-400';
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
};

const Monogram: React.FC<{ name: string | null; avatarUrl: string | null; uid: string | null }> = ({
  name,
  avatarUrl,
  uid,
}) => {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name || ''} className="h-6 w-6 rounded-full object-cover" />;
  }
  return (
    <div
      className={cn(
        'h-6 w-6 rounded-full flex items-center justify-center text-[9.5px] font-bold text-white',
        bgFor(uid),
      )}
    >
      {initialsOf(name)}
    </div>
  );
};

const CATEGORY_DEFINITION = {
  A: 'Must be cleared before RFO/RFSU — blocks handover.',
  B: 'May be carried into operations — non-blocking.',
} as const;

interface Props {
  p: PunchRow;
  onDeepLink?: (subsystemCode: string) => void;
}

export const PunchRowItem: React.FC<Props> = ({ p }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { data: comments = [] } = usePunchComments(open ? p.id : undefined);
  const add = useAddPunchComment(p.id);

  // Derived punch chip like "PL-A · 120-01-002"
  // ref: {ORIG}-PL-{A|B}-{sub}-{seq2}-{itemNo3} → take last 3 chunks
  const refParts = (p.ref || '').split('-');
  const shortId = refParts.slice(-3).join('-');
  const punchChip = `PL-${p.category} · ${shortId}`;

  return (
    <div className={cn('border-t first:border-t-0', open && 'bg-muted/20')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full grid grid-cols-[minmax(0,1.2fr)_minmax(0,2.6fr)_44px_84px_20px] items-center gap-3 px-3 py-2 text-left hover:bg-blue-50/50"
      >
        <div className="min-w-0">
          <div className="font-mono text-[11.5px]">{p.subsystem_code}</div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-[10.5px] font-mono px-2 py-0.5">
              {punchChip}
            </span>
            <span className="text-[12.5px] leading-snug text-foreground/90 break-words">{p.description}</span>
          </div>
        </div>
        <div className="text-center text-[12px] font-medium text-muted-foreground">{p.category}</div>
        <div className="text-right">
          {p.status === 'Closed' ? (
            <span className="inline-flex text-[10.5px] font-bold rounded-full border px-2 py-0.5 uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
              Completed
            </span>
          ) : (
            <span className="text-[11.5px] text-muted-foreground">Outstanding</span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-3 pb-4 pt-1 space-y-3">
          <div className="text-[12.5px] leading-relaxed">{p.description}</div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11.5px]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Raised</div>
              <div>{p.raised_at ? format(new Date(p.raised_at), 'd MMM yyyy') : '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Raised by</div>
              <div>{p.raised_by_name ?? '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Cleared</div>
              <div>{p.cleared_at ? format(new Date(p.cleared_at), 'd MMM yyyy') : '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Cleared by</div>
              <div>{p.cleared_by_name ?? '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Category</div>
              <div>
                <span className="font-medium">PL-{p.category}</span>
                <span className="text-muted-foreground"> — {CATEGORY_DEFINITION[p.category]}</span>
              </div>
            </div>
            {p.closure_note && (
              <div className="col-span-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Closure note</div>
                <div className="italic text-foreground/85">{p.closure_note}</div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">
              Comments
            </div>
            <div className="space-y-2">
              {comments.length === 0 && (
                <div className="text-[11.5px] text-muted-foreground italic">No comments yet.</div>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Monogram name={c.author_name} avatarUrl={c.author_avatar_url} uid={c.author_user_id} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px]">
                      <span className="font-semibold">{c.author_name ?? 'Unknown'}</span>
                      <span className="text-muted-foreground"> · {format(new Date(c.created_at), 'd MMM yyyy, HH:mm')}</span>
                    </div>
                    <div className="text-[12.5px] leading-snug whitespace-pre-wrap">{c.body}</div>
                    {c.attachment_url && (
                      <a
                        href={c.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                      >
                        <Paperclip className="h-3 w-3" />
                        {c.attachment_name || 'Attachment'}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                add.mutate(draft.trim(), { onSuccess: () => setDraft('') });
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment"
                className="flex-1 rounded-md border px-2 py-1 text-[12px] bg-background"
              />
              <button
                type="submit"
                disabled={!draft.trim() || add.isPending}
                className="rounded-md bg-foreground text-background text-[11.5px] px-3 py-1 disabled:opacity-40"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
