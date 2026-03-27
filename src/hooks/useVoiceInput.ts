import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

// Extend Window interface for Speech Recognition fallback
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type RecordingState = 'idle' | 'recording' | 'transcribing';

export const useVoiceInput = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onResultRef = useRef<((transcript: string) => void) | null>(null);
  const autoSubmitRef = useRef<(() => void) | null>(null);

  const fallbackToNative = useCallback((onResult: (transcript: string) => void) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input not supported in this browser');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRecordingState('recording');
      toast.info('Listening...');
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setRecordingState('idle');
    };
    recognition.onerror = () => {
      setRecordingState('idle');
      toast.error('Voice input failed');
    };
    recognition.onend = () => setRecordingState('idle');
    recognition.start();
  }, []);

  const startListening = useCallback((onResult: (transcript: string) => void, onAutoSubmit?: () => void) => {
    onResultRef.current = onResult;
    autoSubmitRef.current = onAutoSubmit || null;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        // Determine supported MIME type
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/webm';

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach(t => t.stop());

          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];

          if (audioBlob.size < 1000) {
            setRecordingState('idle');
            toast.error('Recording too short');
            return;
          }

          setRecordingState('transcribing');

          try {
            const formData = new FormData();
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            formData.append('audio', audioBlob, `recording.${ext}`);

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whisper-stt`,
              {
                method: 'POST',
                headers: {
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: formData,
              }
            );

            if (!response.ok) throw new Error(`STT failed: ${response.status}`);
            
            const data = await response.json();
            if (data.text && onResultRef.current) {
              onResultRef.current(data.text);
              // Auto-submit after transcription
              if (autoSubmitRef.current) {
                setTimeout(() => autoSubmitRef.current?.(), 100);
              }
            }
          } catch (err) {
            console.error('Whisper STT error, falling back:', err);
            toast.error('AI transcription failed, using browser fallback');
            fallbackToNative(onResultRef.current!);
          } finally {
            setRecordingState('idle');
          }
        };

        mediaRecorder.start(250); // Collect in 250ms chunks
        setRecordingState('recording');
        toast.info('Recording... Click again to stop');
      })
      .catch((err) => {
        console.error('Microphone access denied:', err);
        toast.error('Microphone access required');
        setRecordingState('idle');
      });
  }, [fallbackToNative]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setRecordingState('idle');
    }
  }, []);

  return {
    isListening: recordingState === 'recording',
    isTranscribing: recordingState === 'transcribing',
    recordingState,
    startListening,
    stopListening,
    isSupported: true, // MediaRecorder is widely supported
  };
};
