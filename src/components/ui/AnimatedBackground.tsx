import React from 'react';
import { useBackgroundTheme } from '@/contexts/BackgroundThemeContext';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ children, className }) => {
  const { config } = useBackgroundTheme();

  return (
    <div className={cn(`min-h-screen bg-gradient-to-br ${config.baseGradient} relative overflow-hidden animate-smooth-in`, className)}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute top-0 -left-4 w-96 h-96 bg-gradient-to-r ${config.gradients.orb1} rounded-full mix-blend-multiply filter blur-3xl animate-pulse`}
        />
        <div 
          className={`absolute top-0 -right-4 w-96 h-96 bg-gradient-to-l ${config.gradients.orb2} rounded-full mix-blend-multiply filter blur-3xl animate-pulse`}
          style={{ animationDelay: '700ms' }}
        />
        <div 
          className={`absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-t ${config.gradients.orb3} rounded-full mix-blend-multiply filter blur-3xl animate-pulse`}
          style={{ animationDelay: '1400ms' }}
        />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
