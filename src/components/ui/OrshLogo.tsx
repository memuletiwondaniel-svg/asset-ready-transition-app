import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface OrshLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  className?: string;
  status?: 'ready' | 'error' | 'warning' | 'info';
}

const OrshLogo: React.FC<OrshLogoProps> = ({ 
  size = 'medium', 
  showTagline = false,
  className,
  status = 'ready'
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

  // Status color mapping with HSL values for smooth transitions
  const statusColors = {
    ready: {
      gradient: 'radial-gradient(circle at 30% 30%, hsl(142, 76%, 45%), hsl(142, 76%, 36%))',
      glow: 'hsla(142, 76%, 45%, 0.4)'
    },
    error: {
      gradient: 'radial-gradient(circle at 30% 30%, hsl(0, 84%, 60%), hsl(0, 84%, 50%))',
      glow: 'hsla(0, 84%, 60%, 0.4)'
    },
    warning: {
      gradient: 'radial-gradient(circle at 30% 30%, hsl(45, 93%, 47%), hsl(45, 93%, 37%))',
      glow: 'hsla(45, 93%, 47%, 0.4)'
    },
    info: {
      gradient: 'radial-gradient(circle at 30% 30%, hsl(217, 91%, 60%), hsl(217, 91%, 50%))',
      glow: 'hsla(217, 91%, 60%, 0.4)'
    }
  };

  const currentColor = statusColors[status];

  return (
    <Link to="/" className={cn('flex flex-col items-center justify-center group/logo cursor-pointer', heightClasses[size], className)}>
      <div className="relative group">
        {/* Modern minimalist logo with tighter spacing */}
        <div className="flex items-center gap-0">
          <span 
            className={cn(
              sizeClasses[size],
              'font-bold bg-gradient-to-br from-primary via-primary/95 to-primary/80 bg-clip-text text-transparent',
              'transition-all duration-300 drop-shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]',
              'relative inline-block group-hover/logo:scale-110'
            )}
            style={{ letterSpacing: '-0.02em' }}
          >
            O
            {/* 3D Status Dot */}
            <span 
              className={cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse',
                size === 'small' && 'w-2 h-2',
                size === 'medium' && 'w-2.5 h-2.5',
                size === 'large' && 'w-3 h-3'
              )}
              style={{
                background: currentColor.gradient,
                boxShadow: `
                  inset -1px -1px 2px rgba(0, 0, 0, 0.3),
                  inset 1px 1px 2px rgba(255, 255, 255, 0.4),
                  0 2px 4px rgba(0, 0, 0, 0.2),
                  0 0 8px ${currentColor.glow}
                `,
                borderRadius: '50%',
                animationDuration: '2s',
                transition: 'all 0.5s ease-in-out'
              }}
            />
          </span>
          <span 
            className={cn(
              sizeClasses[size],
              'font-bold bg-gradient-to-br from-primary/95 via-primary to-primary/90 bg-clip-text text-transparent',
              'transition-all duration-300 drop-shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]',
              'group-hover/logo:scale-110'
            )}
            style={{ letterSpacing: '-0.02em' }}
          >
            R
          </span>
          <span 
            className={cn(
              sizeClasses[size],
              'font-bold bg-gradient-to-br from-primary to-primary/95 bg-clip-text text-transparent',
              'transition-all duration-300 drop-shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]',
              'group-hover/logo:scale-110'
            )}
            style={{ letterSpacing: '-0.02em' }}
          >
            S
          </span>
          <span 
            className={cn(
              sizeClasses[size],
              'font-bold bg-gradient-to-br from-primary/90 via-primary/85 to-primary/80 bg-clip-text text-transparent',
              'transition-all duration-300 drop-shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]',
              'group-hover/logo:scale-110'
            )}
            style={{ letterSpacing: '-0.02em' }}
          >
            H
          </span>
        </div>
        
        {/* Subtle animated underline */}
        <div className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-70 group-hover/logo:opacity-100 transition-opacity duration-300" />
        
        {/* Ambient glow effect */}
        <div className="absolute -inset-3 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 rounded-lg opacity-0 group-hover/logo:opacity-100 blur-2xl transition-all duration-500 -z-10" />
      </div>
      {showTagline && (
        <p className="text-[9px] text-muted-foreground/70 tracking-[0.15em] mt-1.5 uppercase font-medium">
          Operation Readiness
        </p>
      )}
    </Link>
  );
};

export default OrshLogo;
