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

  // Smooth color cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setColorPhase((prev) => (prev + 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('min-h-screen bg-background relative overflow-hidden', className)}>
      {/* Dynamic Multicolor Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary orb - Top left - Pink/Purple */}
        <div 
          className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full opacity-15 dark:opacity-10 transition-transform duration-1000 ease-out will-change-transform"
          style={{ 
            transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`,
            background: `radial-gradient(circle, hsl(${280 + colorPhase * 0.3}, 70%, 60%), transparent 70%)`,
            filter: 'blur(80px)',
          }}
        />
        
        {/* Secondary orb - Top right - Blue/Cyan */}
        <div 
          className="absolute -top-10 -right-32 w-[600px] h-[600px] rounded-full opacity-12 dark:opacity-8 transition-transform duration-1200 ease-out will-change-transform"
          style={{ 
            transform: `translate(${mousePosition.x * -25}px, ${mousePosition.y * 20}px)`,
            background: `radial-gradient(circle, hsl(${200 + colorPhase * 0.4}, 75%, 55%), transparent 70%)`,
            filter: 'blur(100px)',
            animationDelay: '500ms'
          }}
        />
        
        {/* Tertiary orb - Bottom left - Green/Teal */}
        <div 
          className="absolute -bottom-32 -left-10 w-[450px] h-[450px] rounded-full opacity-12 dark:opacity-8 transition-transform duration-1500 ease-out will-change-transform"
          style={{ 
            transform: `translate(${mousePosition.x * 15}px, ${mousePosition.y * -25}px)`,
            background: `radial-gradient(circle, hsl(${160 + colorPhase * 0.5}, 65%, 50%), transparent 70%)`,
            filter: 'blur(90px)',
          }}
        />
        
        {/* Quaternary orb - Bottom right - Orange/Amber */}
        <div 
          className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full opacity-15 dark:opacity-10 transition-transform duration-1300 ease-out will-change-transform"
          style={{ 
            transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -15}px)`,
            background: `radial-gradient(circle, hsl(${30 + colorPhase * 0.3}, 80%, 55%), transparent 70%)`,
            filter: 'blur(70px)',
          }}
        />
        
        {/* Central glow - Subtle primary accent */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5 dark:opacity-[0.03] transition-transform duration-2000 ease-out will-change-transform"
          style={{ 
            transform: `translate(calc(-50% + ${mousePosition.x * 10}px), calc(-50% + ${mousePosition.y * 10}px))`,
            background: `radial-gradient(circle, hsl(${240 + colorPhase * 0.2}, 60%, 60%), transparent 60%)`,
            filter: 'blur(120px)',
          }}
        />
        
        {/* Accent orb - Floating - Rose/Pink */}
        <div 
          className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-10 dark:opacity-5 transition-transform duration-1400 ease-out will-change-transform animate-float"
          style={{ 
            transform: `translate(${mousePosition.x * -12}px, ${mousePosition.y * 18}px)`,
            background: `radial-gradient(circle, hsl(${340 + colorPhase * 0.4}, 75%, 60%), transparent 70%)`,
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
