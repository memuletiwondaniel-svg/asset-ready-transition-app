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
        {/* Modern minimalist logo with tighter spacing */}
        <div className="flex items-center gap-0">
          <span 
            className={cn(
              sizeClasses[size],
              'font-bold bg-gradient-to-br from-primary via-primary/95 to-primary/80 bg-clip-text text-transparent',
              'transition-all duration-300 drop-shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]'
            )}
            style={{ letterSpacing: '-0.02em' }}
          >
            O
          </span>
          <span 
            className={cn(
              sizeClasses[size],
              'font-bold bg-gradient-to-br from-primary/95 via-primary to-primary/90 bg-clip-text text-transparent',
              'transition-all duration-300 drop-shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]'
            )}
            style={{ letterSpacing: '-0.02em' }}
          >
            R
          </span>
          <span 
            className={cn(
              sizeClasses[size],
              'font-bold bg-gradient-to-br from-primary to-primary/95 bg-clip-text text-transparent',
              'transition-all duration-300 drop-shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]'
            )}
            style={{ letterSpacing: '-0.02em' }}
          >
            S
          </span>
          <span 
            className={cn(
              sizeClasses[size],
              'font-bold bg-gradient-to-br from-primary/90 via-primary/85 to-primary/80 bg-clip-text text-transparent',
              'transition-all duration-300 drop-shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]'
            )}
            style={{ letterSpacing: '-0.02em' }}
          >
            H
          </span>
        </div>
        
        {/* Subtle animated underline */}
        <div className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Ambient glow effect */}
        <div className="absolute -inset-3 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 rounded-lg opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-500 -z-10" />
      </div>
      {showTagline && (
        <p className="text-[9px] text-muted-foreground/70 tracking-[0.15em] mt-1.5 uppercase font-medium">
          Operation Readiness
        </p>
      )}
    </div>
  );
};

export default OrshLogo;
