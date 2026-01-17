import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ children, className }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [colorPhase, setColorPhase] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Slower color cycling - full cycle in ~3 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setColorPhase((prev) => (prev + 0.2) % 360);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('min-h-screen bg-background relative overflow-hidden', className)}>
      {/* Dynamic Multicolor Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary orb - Top area - Pink/Purple - Drifts */}
        <div 
          className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full opacity-30 dark:opacity-20 will-change-transform animate-drift-1"
          style={{ 
            transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`,
            background: `radial-gradient(circle, hsl(${280 + colorPhase * 0.3}, 80%, 60%), transparent 70%)`,
            filter: 'blur(80px)',
          }}
        />
        
        {/* Secondary orb - Top right area - Blue/Cyan - Drifts */}
        <div 
          className="absolute top-[5%] right-[20%] w-[600px] h-[600px] rounded-full opacity-25 dark:opacity-15 will-change-transform animate-drift-2"
          style={{ 
            transform: `translate(${mousePosition.x * -25}px, ${mousePosition.y * 20}px)`,
            background: `radial-gradient(circle, hsl(${200 + colorPhase * 0.4}, 85%, 55%), transparent 70%)`,
            filter: 'blur(100px)',
          }}
        />
        
        {/* Tertiary orb - Bottom left area - Green/Teal - Drifts */}
        <div 
          className="absolute bottom-[15%] left-[25%] w-[450px] h-[450px] rounded-full opacity-25 dark:opacity-15 will-change-transform animate-drift-3"
          style={{ 
            transform: `translate(${mousePosition.x * 15}px, ${mousePosition.y * -25}px)`,
            background: `radial-gradient(circle, hsl(${160 + colorPhase * 0.5}, 75%, 50%), transparent 70%)`,
            filter: 'blur(90px)',
          }}
        />
        
        {/* Quaternary orb - Bottom right area - Orange/Amber - Drifts */}
        <div 
          className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] rounded-full opacity-30 dark:opacity-20 will-change-transform animate-drift-4"
          style={{ 
            transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -15}px)`,
            background: `radial-gradient(circle, hsl(${30 + colorPhase * 0.3}, 90%, 55%), transparent 70%)`,
            filter: 'blur(70px)',
          }}
        />
        
        {/* Central glow - Subtle primary accent - Slow drift */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 dark:opacity-5 will-change-transform animate-drift-1"
          style={{ 
            background: `radial-gradient(circle, hsl(${240 + colorPhase * 0.2}, 70%, 60%), transparent 60%)`,
            filter: 'blur(120px)',
          }}
        />
        
        {/* Accent orb - Floating across screen - Rose/Pink */}
        <div 
          className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full opacity-20 dark:opacity-10 will-change-transform animate-drift-2 animate-float"
          style={{ 
            transform: `translate(${mousePosition.x * -12}px, ${mousePosition.y * 18}px)`,
            background: `radial-gradient(circle, hsl(${340 + colorPhase * 0.4}, 85%, 60%), transparent 70%)`,
            filter: 'blur(60px)',
          }}
        />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
