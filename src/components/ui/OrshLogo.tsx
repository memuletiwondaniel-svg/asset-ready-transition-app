import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface OrshLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  variant?: 'full' | 'mark';
  className?: string;
  asLink?: boolean;
  surface?: 'light' | 'dark';
}

const heightPx: Record<NonNullable<OrshLogoProps['size']>, number> = {
  small: 28,
  medium: 36,
  large: 48,
};

const wrapperHeightClass: Record<NonNullable<OrshLogoProps['size']>, string> = {
  small: 'h-10',
  medium: 'h-12',
  large: 'h-16',
};

const OrshMarkSvg: React.FC<{ height: number; className?: string }> = ({ height, className }) => {
  // Glyph viewBox 48x48
  const width = height;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={width}
      height={height}
      role="img"
      aria-label="ORSH"
      className={className}
    >
      <path
        d="M30.16 7.09 A18 18 0 1 1 17.84 7.09 L19.55 9.78 A13 13 0 1 0 28.45 9.78 Z"
        fill="currentColor"
      />
      <circle cx="24" cy="2.5" r="2.5" fill="#6FD4B3" />
      <circle cx="24" cy="9.5" r="2.5" fill="#34B88E" />
      <circle cx="24" cy="16.5" r="2.5" fill="#1D9E75" />
      <circle cx="24" cy="23.5" r="2.5" fill="#0F7A5C" />
    </svg>
  );
};

const OrshLogo: React.FC<OrshLogoProps> = ({
  size = 'medium',
  showTagline = false,
  variant = 'full',
  className,
  asLink = true,
}) => {
  const h = heightPx[size];

  const content = (
    <div className="flex flex-col items-center justify-center">
      <div className="flex items-end leading-none">
        <OrshMarkSvg height={h} />
        {variant === 'full' && (
          <span
            className="font-medium tracking-wide text-current"
            style={{
              fontSize: `${Math.round(h * 0.7)}px`,
              lineHeight: 1,
              letterSpacing: '0.04em',
              marginBottom: `${Math.round(h * 0.06)}px`,
              marginLeft: `-${Math.max(2, Math.round(h * 0.06))}px`,
            }}
          >
            RSH
          </span>
        )}
      </div>
      {showTagline && (
        <p className="text-[9px] text-muted-foreground/70 tracking-[0.15em] mt-1.5 uppercase font-medium">
          Operation Readiness
        </p>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link
        to="/"
        className={cn(
          'flex items-center justify-center cursor-pointer text-foreground',
          wrapperHeightClass[size],
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center text-foreground',
        wrapperHeightClass[size],
        className,
      )}
    >
      {content}
    </div>
  );
};

export default OrshLogo;
