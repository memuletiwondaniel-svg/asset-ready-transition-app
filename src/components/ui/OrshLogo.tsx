import React, { useId } from 'react';
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
  large: 40,
};

const wrapperHeightClass: Record<NonNullable<OrshLogoProps['size']>, string> = {
  small: 'h-10',
  medium: 'h-12',
  large: 'h-11',
};

const OrshMarkSvg: React.FC<{ height: number; surface?: 'light' | 'dark'; className?: string }> = ({ height, surface = 'light', className }) => {
  const width = height;
  const barGradId = useId();
  const sparkGradId = useId();
  const maskId = useId();
  const ringColor = surface === 'dark' ? 'currentColor' : '#a1a1aa';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={width}
      height={height}
      role="img"
      aria-label="ORSH"
      className={cn('orsh-mark-svg overflow-visible', className)}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={barGradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#6FD4B3" />
          <stop offset="50%" stopColor="#1D9E75" />
          <stop offset="100%" stopColor="#0F7A5C" />
        </linearGradient>
        <linearGradient id={sparkGradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#d8fff0" />
          <stop offset="100%" stopColor="#0B5C44" />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect x="0" y="0" width="48" height="48" fill="black" />
          <path
            className="orsh-ring"
            d="M 29.3 9.44 A 15.5 15.5 0 1 1 18.7 9.44"
            fill="none"
            stroke="white"
            strokeWidth="7"
            strokeLinecap="butt"
            pathLength={100}
          />
        </mask>
      </defs>
      {/* Tapered ring: outer circle r=15.5 centered (24,24); inner circle r=13 shifted down (24,24.6).
          Top thickness ≈ 3.1, bottom thickness ≈ 1.9 → gentle taper top→bottom→top. */}
      <path
        d="M 8.5 24 A 15.5 15.5 0 1 0 39.5 24 A 15.5 15.5 0 1 0 8.5 24 Z M 11.6 24.6 A 13 13 0 1 1 37.6 24.6 A 13 13 0 1 1 11.6 24.6 Z"
        fillRule="evenodd"
        fill={ringColor}
        mask={`url(#${maskId})`}
      />
      <rect x="21.5" y="1.5" width="5" height="24" rx="2.5" fill={`url(#${barGradId})`} />
      <rect
        className="orsh-spark"
        x="21.5"
        y="1.5"
        width="5"
        height="24"
        rx="2.5"
        fill={`url(#${sparkGradId})`}
        style={{
          transformBox: 'fill-box',
          transformOrigin: '50% 100%',
          opacity: 0,
        }}
      />
    </svg>
  );
};

const OrshLogo: React.FC<OrshLogoProps> = ({
  size = 'medium',
  showTagline = false,
  variant = 'full',
  className,
  asLink = true,
  surface = 'light',
}) => {
  const h = heightPx[size];

  const content = (
    <div className="flex flex-col items-center justify-center">
      <div className="flex items-end leading-none">
        <OrshMarkSvg height={h} surface={surface} />
        {variant === 'full' && (
          <span
            className={cn(
              'font-medium tracking-wide',
              surface === 'dark' ? 'text-current' : 'text-[#a1a1aa]'
            )}
            style={{
              fontSize: `${Math.round(h * 0.55)}px`,
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

  const wrapperClass = cn(
    'orsh-logo group flex items-center justify-center text-foreground -ml-1 overflow-visible',
    wrapperHeightClass[size],
    className,
  );

  if (asLink) {
    return (
      <Link to="/" className={cn(wrapperClass, 'cursor-pointer')}>
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
};

export default OrshLogo;
