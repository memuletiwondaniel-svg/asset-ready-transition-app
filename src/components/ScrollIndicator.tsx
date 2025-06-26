
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollIndicatorProps {
  showFade?: boolean;
}

const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ showFade = true }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [showFloatingButton, setShowFloatingButton] = useState(true);

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      
      console.log('Scroll progress:', { scrollTop, docHeight, progress });
      
      setScrollProgress(progress);
      setIsVisible(progress < 95); // Hide progress when near bottom
      setShowFloatingButton(progress < 85); // Hide floating button earlier when near bottom
    };

    window.addEventListener('scroll', updateScrollProgress);
    updateScrollProgress(); // Initial call

    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  const handleFloatingButtonClick = () => {
    console.log('Floating button clicked, scrolling...');
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  };

  return (
    <>
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200/50 z-50">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Enhanced Bottom Fade Gradient */}
      {showFade && (
        <div className="fixed bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none z-30" />
      )}

      {/* Floating Scroll Indicator - Only show when not near bottom */}
      {showFloatingButton && scrollProgress < 15 && (
        <div className="fixed bottom-8 right-8 z-40 animate-bounce">
          <div 
            className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors cursor-pointer"
            onClick={handleFloatingButtonClick}
          >
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      )}

      {/* Side Scroll Progress Indicator */}
      {isVisible && (
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40">
          <div className="w-1 h-32 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="w-full bg-blue-600 transition-all duration-150 ease-out rounded-full"
              style={{ height: `${scrollProgress}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ScrollIndicator;
