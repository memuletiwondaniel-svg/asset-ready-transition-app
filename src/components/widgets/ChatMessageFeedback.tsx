import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessageFeedbackProps {
  messageIndex: number;
  conversationId: string | null;
  agentName?: string;
  feedbackGiven?: 'positive' | 'negative' | null;
  onFeedbackChange: (index: number, rating: 'positive' | 'negative') => void;
}

export const ChatMessageFeedback: React.FC<ChatMessageFeedbackProps> = ({
  messageIndex,
  conversationId,
  agentName = 'bob',
  feedbackGiven,
  onFeedbackChange,
}) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (rating: 'positive' | 'negative', text?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase.from('ai_feedback' as any).insert({
        user_id: user.id,
        session_id: conversationId,
        message_id: `msg-${messageIndex}`,
        rating,
        feedback_text: text || null,
        agent_name: agentName,
      }) as any);
    } catch (err) {
      console.error('Feedback submission error:', err);
    }
  };

  const handleThumbsUp = async () => {
    if (feedbackGiven === 'positive') return;
    onFeedbackChange(messageIndex, 'positive');
    setShowTextInput(false);
    await submitFeedback('positive');
  };

  const handleThumbsDown = async () => {
    if (feedbackGiven === 'negative') return;
    onFeedbackChange(messageIndex, 'negative');
    setShowTextInput(true);
    await submitFeedback('negative');
  };

  const handleSendText = async () => {
    if (!feedbackText.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update existing feedback with text
      await (supabase.from('ai_feedback' as any)
        .update({ feedback_text: feedbackText.trim() })
        .eq('user_id', user.id)
        .eq('message_id', `msg-${messageIndex}`)
        .eq('session_id', conversationId) as any);
    } catch (err) {
      console.error('Feedback text error:', err);
    }
    setShowTextInput(false);
    setFeedbackText('');
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex items-center gap-1">
        <button
          onClick={handleThumbsUp}
          className={cn(
            "p-1 rounded-md transition-colors",
            feedbackGiven === 'positive'
              ? "text-green-600 dark:text-green-400"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          )}
          aria-label="Thumbs up"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleThumbsDown}
          className={cn(
            "p-1 rounded-md transition-colors",
            feedbackGiven === 'negative'
              ? "text-red-500 dark:text-red-400"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          )}
          aria-label="Thumbs down"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {showTextInput && feedbackGiven === 'negative' && (
        <div className="flex items-center gap-1.5 max-w-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <input
            type="text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="What went wrong?"
            className="flex-1 h-7 px-2 text-xs rounded-md border border-border/50 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            autoFocus
          />
          <button
            onClick={() => { setShowTextInput(false); setFeedbackText(''); }}
            className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-1"
          >
            Skip
          </button>
          <button
            onClick={handleSendText}
            disabled={!feedbackText.trim() || submitting}
            className="p-1 text-primary hover:text-primary/80 disabled:opacity-40"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};
