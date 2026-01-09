import { useState, useEffect } from 'react';

interface UseTypingEffectOptions {
  texts: string[];
  typingSpeed?: number;
  pauseBeforeNext?: number;
  pauseBeforeType?: number;
}

export function useTypingEffect({
  texts,
  typingSpeed = 50,
  pauseBeforeNext = 2500,
  pauseBeforeType = 300,
}: UseTypingEffectOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (texts.length === 0) return;
    
    const currentFullText = texts[currentIndex];
    
    if (isTyping) {
      if (displayText.length < currentFullText.length) {
        const timeout = setTimeout(() => {
          setDisplayText(currentFullText.slice(0, displayText.length + 1));
        }, typingSpeed);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsTyping(false);
          setDisplayText('');
          setCurrentIndex((prev) => (prev + 1) % texts.length);
        }, pauseBeforeNext);
        return () => clearTimeout(timeout);
      }
    } else {
      const timeout = setTimeout(() => {
        setIsTyping(true);
      }, pauseBeforeType);
      return () => clearTimeout(timeout);
    }
  }, [displayText, currentIndex, isTyping, texts, typingSpeed, pauseBeforeNext, pauseBeforeType]);

  return {
    displayText,
    isTyping,
  };
}
