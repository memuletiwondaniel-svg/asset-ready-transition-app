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
      <div className="relative">
        <h1 
          className={cn(
            sizeClasses[size],
            'font-bold tracking-[0.2em] bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent',
            'transition-all duration-300 hover:scale-105 hover:tracking-[0.25em]'
          )}
        >
          ORSH
        </h1>
        <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
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
