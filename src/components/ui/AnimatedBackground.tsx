import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ children, className }) => {
  const [colorPhase, setColorPhase] = useState(0);

  // Slower color cycling - full cycle in ~3 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setColorPhase((prev) => (prev + 0.2) % 360);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('h-full bg-background relative overflow-hidden', className)}>
      {/* Dynamic Multicolor Animated Background - Full screen movement */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary orb - Purple/Magenta - Starts top-left */}
        <div 
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-[0.15] dark:opacity-[0.08] will-change-transform animate-journey-tl"
          style={{ 
            background: `radial-gradient(circle, hsl(${280 + colorPhase * 0.3}, 55%, 65%), transparent 70%)`,
            filter: 'blur(100px)',
          }}
        />
        
        {/* Secondary orb - Blue - Starts top-right */}
        <div 
          className="absolute top-0 right-0 w-[650px] h-[650px] rounded-full opacity-[0.18] dark:opacity-[0.10] will-change-transform animate-journey-tr"
          style={{ 
            background: `radial-gradient(circle, hsl(${200 + colorPhase * 0.4}, 70%, 60%), transparent 70%)`,
            filter: 'blur(110px)',
          }}
        />
        
        {/* Tertiary orb - Teal/Cyan - Starts bottom-left */}
        <div 
          className="absolute bottom-0 left-0 w-[550px] h-[550px] rounded-full opacity-[0.14] dark:opacity-[0.08] will-change-transform animate-journey-bl"
          style={{ 
            background: `radial-gradient(circle, hsl(${170 + colorPhase * 0.5}, 55%, 60%), transparent 70%)`,
            filter: 'blur(100px)',
          }}
        />
        
        {/* Quaternary orb - Yellow/Gold - Starts bottom-right (more intense) */}
        <div 
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.24] dark:opacity-[0.14] will-change-transform animate-journey-br"
          style={{ 
            background: `radial-gradient(circle, hsl(${45 + colorPhase * 0.3}, 85%, 58%), transparent 70%)`,
            filter: 'blur(90px)',
          }}
        />
        
        {/* New orb - Rose/Pink - Roaming from center */}
        <div 
          className="absolute top-1/2 left-1/4 w-[450px] h-[450px] rounded-full opacity-[0.16] dark:opacity-[0.09] will-change-transform animate-journey-center"
          style={{ 
            background: `radial-gradient(circle, hsl(${330 + colorPhase * 0.4}, 60%, 65%), transparent 70%)`,
            filter: 'blur(95px)',
          }}
        />
        
        {/* Central glow - Subtle pulsing accent */}
        <div 
          className="absolute top-1/2 left-1/2 w-[700px] h-[700px] rounded-full opacity-[0.06] dark:opacity-[0.04] will-change-transform animate-pulse-center"
          style={{ 
            background: `radial-gradient(circle, hsl(${240 + colorPhase * 0.2}, 45%, 70%), transparent 60%)`,
            filter: 'blur(130px)',
          }}
        />
      </div>
      
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};
