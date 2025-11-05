import React from 'react';
import { cn } from '@/lib/utils';

interface OrshLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  className?: string;
}

const OrshLogo: React.FC<OrshLogoProps> = ({ 
  size = 'medium', 
  showTagline = false,
  className 
}) => {
  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-3xl',
    large: 'text-4xl'
  };

  const heightClasses = {
    small: 'h-10',
    medium: 'h-12',
    large: 'h-16'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', heightClasses[size], className)}>
      <div className="relative group">
        <h1 
          className={cn(
            sizeClasses[size],
            'font-bold tracking-[0.2em] bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent',
            'transition-all duration-300 hover:scale-105 hover:tracking-[0.25em]',
            'drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]'
          )}
        >
          ORSH
        </h1>
        {/* Animated glowing line */}
        <div className="absolute -bottom-1 left-0 right-0 h-[2px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute h-full w-1/3 bg-gradient-to-r from-transparent via-primary/80 to-transparent animate-[slide-in-right_2s_ease-in-out_infinite]" />
        </div>
        {/* Glowing effect on hover */}
        <div className="absolute -inset-2 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 rounded-lg opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10" />
      </div>
      {showTagline && (
        <p className="text-[10px] text-muted-foreground tracking-wider mt-1 uppercase">
          Operation Readiness
        </p>
      )}
    </div>
  );
};

export default OrshLogo;
