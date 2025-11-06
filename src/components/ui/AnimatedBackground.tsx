import React, { useState, useEffect } from 'react';
import { useBackgroundTheme } from '@/contexts/BackgroundThemeContext';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ children, className }) => {
  const { config } = useBackgroundTheme();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position to -1 to 1 range for subtle movement
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={cn(`min-h-screen bg-gradient-to-br ${config.baseGradient} relative overflow-hidden animate-smooth-in`, className)}>
      {/* Animated Background Elements with Mouse Following */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute top-0 -left-4 w-96 h-96 bg-gradient-to-r ${config.gradients.orb1} rounded-full mix-blend-multiply filter blur-3xl animate-pulse transition-transform duration-1000 ease-out`}
          style={{ 
            transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`,
            animationDelay: '0ms'
          }}
        />
        <div 
          className={`absolute top-0 -right-4 w-96 h-96 bg-gradient-to-l ${config.gradients.orb2} rounded-full mix-blend-multiply filter blur-3xl animate-pulse transition-transform duration-1000 ease-out`}
          style={{ 
            transform: `translate(${mousePosition.x * -15}px, ${mousePosition.y * 15}px)`,
            animationDelay: '700ms'
          }}
        />
        <div 
          className={`absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-t ${config.gradients.orb3} rounded-full mix-blend-multiply filter blur-3xl animate-pulse transition-transform duration-1000 ease-out`}
          style={{ 
            transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * -20}px)`,
            animationDelay: '1400ms'
          }}
        />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
