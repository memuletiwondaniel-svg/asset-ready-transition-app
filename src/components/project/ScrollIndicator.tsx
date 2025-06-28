
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollIndicatorProps {
  open: boolean;
}

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ open }) => {
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Check for scroll indicator
  useEffect(() => {
    const checkScroll = () => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        const hasScroll = scrollArea.scrollHeight > scrollArea.clientHeight;
        const isAtBottom = scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 10;
        setShowScrollIndicator(hasScroll && !isAtBottom);
      }
    };

    if (open) {
      setTimeout(checkScroll, 100);
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.addEventListener('scroll', checkScroll);
        return () => scrollArea.removeEventListener('scroll', checkScroll);
      }
    }
  }, [open]);

  if (!showScrollIndicator) return null;

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow-lg animate-bounce">
      <ChevronDown className="h-4 w-4 text-gray-600" />
    </div>
  );
};
