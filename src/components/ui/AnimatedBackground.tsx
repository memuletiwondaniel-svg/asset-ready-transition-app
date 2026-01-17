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
      {/* Dynamic Multicolor Animated Background - Softer, Corner-to-Center Movement */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary orb - Starts top-left, journeys toward center */}
        <div 
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-[0.15] dark:opacity-[0.08] will-change-transform animate-journey-tl"
          style={{ 
            background: `radial-gradient(circle, hsl(${280 + colorPhase * 0.3}, 50%, 70%), transparent 70%)`,
            filter: 'blur(100px)',
          }}
        />
        
        {/* Secondary orb - Starts top-right, journeys toward center */}
        <div 
          className="absolute top-0 right-0 w-[650px] h-[650px] rounded-full opacity-[0.12] dark:opacity-[0.07] will-change-transform animate-journey-tr"
          style={{ 
            background: `radial-gradient(circle, hsl(${200 + colorPhase * 0.4}, 55%, 68%), transparent 70%)`,
            filter: 'blur(110px)',
          }}
        />
        
        {/* Tertiary orb - Starts bottom-left, journeys toward center */}
        <div 
          className="absolute bottom-0 left-0 w-[550px] h-[550px] rounded-full opacity-[0.14] dark:opacity-[0.08] will-change-transform animate-journey-bl"
          style={{ 
            background: `radial-gradient(circle, hsl(${160 + colorPhase * 0.5}, 48%, 65%), transparent 70%)`,
            filter: 'blur(100px)',
          }}
        />
        
        {/* Quaternary orb - Starts bottom-right, journeys toward center */}
        <div 
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.16] dark:opacity-[0.09] will-change-transform animate-journey-br"
          style={{ 
            background: `radial-gradient(circle, hsl(${30 + colorPhase * 0.3}, 52%, 68%), transparent 70%)`,
            filter: 'blur(90px)',
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
