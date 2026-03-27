import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send, Volume2, Loader2, Square, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Strip markdown/emojis for clean TTS text */
function stripMarkdownForTTS(text: string): string {
  return text
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    // Remove table pipes and formatting
    .replace(/\|/g, ' ')
    .replace(/^[\s-:]+$/gm, '')
    // Remove leading bullet dashes
    .replace(/^\s*[-•]\s+/gm, '')
    // Remove emojis (common unicode ranges)
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]|[✅⚠️📄🔍📅❌🟢🟡🔴]/gu, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Clean up multiple spaces/newlines
    .replace(/\n{3,}/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim();
}

interface ChatMessageFeedbackProps {
  messageIndex: number;
  conversationId: string | null;
  agentName?: string;
  feedbackGiven?: 'positive' | 'negative' | null;
  onFeedbackChange: (index: number, rating: 'positive' | 'negative') => void;
  messageContent?: string;
}

export const ChatMessageFeedback: React.FC<ChatMessageFeedbackProps> = ({
  messageIndex,
  conversationId,
  agentName = 'bob',
  feedbackGiven,
  onFeedbackChange,
  messageContent,
}) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

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

  const handleTTS = async () => {
    // If currently playing, stop
    if (ttsState === 'playing' && currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setTtsState('idle');
      setCurrentAudio(null);
      return;
    }

    if (!messageContent || ttsState === 'loading') return;

    const cleanText = stripMarkdownForTTS(messageContent);
    if (!cleanText) {
      toast.error('No text to read aloud');
      return;
    }

    setTtsState('loading');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: cleanText }),
        }
      );

      if (!response.ok) throw new Error(`TTS failed: ${response.status}`);

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setTtsState('idle');
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setTtsState('idle');
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
        toast.error('Audio playback failed');
      };

      setCurrentAudio(audio);
      await audio.play();
      setTtsState('playing');
    } catch (err) {
      console.error('ElevenLabs TTS error, falling back to browser:', err);
      // Fallback to browser speechSynthesis
      try {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = 1.0;
          utterance.onend = () => setTtsState('idle');
          utterance.onerror = () => setTtsState('idle');
          window.speechSynthesis.speak(utterance);
          setTtsState('playing');
        } else {
          toast.error('Text-to-speech unavailable');
          setTtsState('idle');
        }
      } catch {
        toast.error('Text-to-speech failed');
        setTtsState('idle');
      }
    }
  };

  const handleCopy = () => {
    if (!messageContent) return;
    navigator.clipboard.writeText(messageContent).then(() => {
      toast.success('Copied to clipboard');
    });
  };

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex items-center gap-0.5">
        {/* Feedback buttons */}
        <button
          onClick={handleThumbsUp}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            feedbackGiven === 'positive'
              ? "text-green-600 dark:text-green-400"
              : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
          aria-label="Thumbs up"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleThumbsDown}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            feedbackGiven === 'negative'
              ? "text-red-500 dark:text-red-400"
              : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
          aria-label="Thumbs down"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>

        {/* Separator */}
        <div className="w-px h-4 bg-border/50 mx-1" />

        {/* TTS Button - always visible */}
        {messageContent && (
          <button
            onClick={handleTTS}
            disabled={ttsState === 'loading'}
            className={cn(
              "p-1.5 rounded-md transition-all",
              ttsState === 'playing'
                ? "text-primary bg-primary/10 animate-pulse"
                : ttsState === 'loading'
                  ? "text-muted-foreground/50"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
            )}
            aria-label={ttsState === 'playing' ? 'Stop reading' : 'Read aloud'}
            title={ttsState === 'playing' ? 'Stop reading' : 'Read aloud'}
          >
            {ttsState === 'loading' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : ttsState === 'playing' ? (
              <Square className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Copy Button */}
        {messageContent && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            aria-label="Copy message"
            title="Copy message"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
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
