import { useState, useEffect } from 'react';

interface UseRotatingTextOptions {
  texts: string[];
  interval?: number;
}

export function useRotatingText({ texts, interval = 4000 }: UseRotatingTextOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (texts.length <= 1) return;

    const rotateInterval = setInterval(() => {
      // Fade out
      setIsVisible(false);
      
      // After fade out, change text and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % texts.length);
        setIsVisible(true);
      }, 300);
    }, interval);

    return () => clearInterval(rotateInterval);
  }, [texts, interval]);

  return {
    currentText: texts[currentIndex],
    isVisible,
  };
}
