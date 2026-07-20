/**
 * P4-2: quiet thumb-up/down chip for the Insights strip header.
 *
 * - Keyed on (user_id, inputs_hash) — writes to public.vcr_insight_feedback.
 * - Same-thumb click toggles off; opposite thumb switches.
 * - Thumb-down opens an optional comment box (Skip / Send feedback).
 * - Muted styling — filled only when active or hovered.
 */
import React, { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Thumb = -1 | 1 | null;

interface Props {
  vcrId?: string;
  vcrItemId?: string;
  inputsHash?: string;
  insightState?: string | null;
  signalIds?: number[];
}

export const InsightFeedbackChip: React.FC<Props> = ({
  vcrId,
  vcrItemId,
  inputsHash,
  insightState,
  signalIds,
}) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [thumb, setThumb] = useState<Thumb>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Resolve current user + hydrate existing vote for this fingerprint.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid || !inputsHash) return;
      const { data } = await supabase
        .from('vcr_insight_feedback')
        .select('id, thumb')
        .eq('user_id', uid)
        .eq('inputs_hash', inputsHash)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setThumb((data as { thumb?: number }).thumb === 1 ? 1 : -1);
        setRowId((data as { id?: string }).id ?? null);
      } else {
        setThumb(null);
        setRowId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inputsHash]);

  if (!inputsHash || !vcrId || !vcrItemId) return null;

  const clearVote = async () => {
    if (!rowId) return;
    setBusy(true);
    const { error } = await supabase.from('vcr_insight_feedback').delete().eq('id', rowId);
    setBusy(false);
    if (error) {
      toast({ title: 'Could not clear feedback', description: error.message, variant: 'destructive' });
      return;
    }
    setThumb(null);
    setRowId(null);
    setShowComment(false);
    setComment('');
  };

  const castVote = async (next: -1 | 1) => {
    if (!userId) return;
    setBusy(true);
    // Delete any prior row for this fingerprint (unique on user_id + inputs_hash),
    // then insert the new thumb. Simpler than upsert given the unique constraint.
    if (rowId) {
      await supabase.from('vcr_insight_feedback').delete().eq('id', rowId);
    }
    const { data, error } = await supabase
      .from('vcr_insight_feedback')
      .insert({
        user_id: userId,
        vcr_id: vcrId,
        vcr_item_id: vcrItemId,
        inputs_hash: inputsHash,
        insight_state: insightState ?? null,
        signal_ids: signalIds ?? null,
        thumb: next,
      })
      .select('id')
      .maybeSingle();
    setBusy(false);
    if (error) {
      toast({ title: 'Could not save feedback', description: error.message, variant: 'destructive' });
      return;
    }
    setThumb(next);
    setRowId((data as { id?: string })?.id ?? null);
    if (next === -1) {
      setShowComment(true);
    } else {
      setShowComment(false);
      setComment('');
    }
  };

  const handleThumb = async (next: -1 | 1) => {
    if (busy) return;
    if (thumb === next) {
      await clearVote();
      return;
    }
    await castVote(next);
  };

  const submitComment = async () => {
    if (!rowId || !comment.trim()) {
      setShowComment(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('vcr_insight_feedback')
      .update({ comment: comment.trim() })
      .eq('id', rowId);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save comment', description: error.message, variant: 'destructive' });
      return;
    }
    setShowComment(false);
    setComment('');
    toast({ title: 'Thanks — feedback saved' });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => handleThumb(1)}
          disabled={busy}
          aria-label={thumb === 1 ? 'Remove thumbs up' : 'Thumbs up'}
          className={cn(
            'p-1 rounded transition-colors',
            thumb === 1
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground/50 hover:text-foreground',
          )}
        >
          <ThumbsUp className={cn('h-3.5 w-3.5', thumb === 1 && 'fill-current')} />
        </button>
        <button
          type="button"
          onClick={() => handleThumb(-1)}
          disabled={busy}
          aria-label={thumb === -1 ? 'Remove thumbs down' : 'Thumbs down'}
          className={cn(
            'p-1 rounded transition-colors',
            thumb === -1
              ? 'text-red-500 dark:text-red-400'
              : 'text-muted-foreground/50 hover:text-foreground',
          )}
        >
          <ThumbsDown className={cn('h-3.5 w-3.5', thumb === -1 && 'fill-current')} />
        </button>
      </div>

      {showComment && thumb === -1 && (
        <div className="flex items-center gap-1.5 max-w-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was off? (optional)"
            className="flex-1 h-7 px-2 text-[11.5px] rounded-md border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitComment();
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setShowComment(false);
              setComment('');
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-1"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={submitComment}
            disabled={saving}
            aria-label="Send feedback"
            className="p-1 text-primary hover:text-primary/80 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </button>
        </div>
      )}
    </div>
  );
};
