import React from 'react';

interface ORSHLogoProps {
  className?: string;
  size?: number;
  variant?: 'primary' | 'energy' | 'success' | 'ocean';
  showText?: boolean;
  animated?: boolean;
  darkMode?: boolean;
}

const ORSHLogo: React.FC<ORSHLogoProps> = ({
  className = "",
  size = 48,
  variant = 'primary',
  showText = true,
  animated = false,
  darkMode = false
}) => {
  const gradientColors = {
    primary: {
      start: '#00D4FF',
      mid: '#0066FF', 
      end: '#003399'
    },
    energy: {
      start: '#FFB800',
      mid: '#FF6B00',
      end: '#CC0066'
    },
    success: {
      start: '#00FFB3',
      mid: '#00B366',
      end: '#006633'
    },
    ocean: {
      start: '#00E6CC',
      mid: '#0099CC',
      end: '#004D66'
    }
  };

  const colors = gradientColors[variant];
  const textColor = darkMode ? '#FFFFFF' : '#1A1A1A';
  const logoSize = showText ? size : size;
  const textSize = size * 0.6;

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className="relative mr-3"
        style={{ width: logoSize, height: logoSize }}
      >
        <svg
          width={logoSize}
          height={logoSize}
          viewBox="0 0 100 100"
          className={animated ? 'animate-spin-slow' : ''}
          style={{ animationDuration: animated ? '6s' : undefined }}
        >
          <defs>
            <linearGradient id={`orsh-gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.start} />
              <stop offset="50%" stopColor={colors.mid} />
              <stop offset="100%" stopColor={colors.end} />
            </linearGradient>
            <filter id="orsh-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor={colors.end} floodOpacity="0.3"/>
            </filter>
          </defs>
          
          {/* Outer ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={`url(#orsh-gradient-${variant})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="240 50"
            transform="rotate(-90 50 50)"
            filter="url(#orsh-shadow)"
          >
            {animated && (
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from="0 50 50"
                to="360 50 50"
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          
          {/* Inner swirl */}
          <path
            d="M 50 20 
               A 15 15 0 1 1 35 50
               A 7 7 0 1 0 50 43
               A 3 3 0 1 1 47 50"
            fill={`url(#orsh-gradient-${variant})`}
            strokeWidth="2"
            stroke={colors.start}
            opacity="0.9"
          >
            {animated && (
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from="0 50 50"
                to="-360 50 50"
                dur="4s"
                repeatCount="indefinite"
              />
            )}
          </path>
          
          {/* Center highlight */}
          <circle
            cx="50"
            cy="50"
            r="8"
            fill={colors.start}
            opacity="0.8"
          >
            {animated && (
              <animate
                attributeName="r"
                values="6;10;6"
                dur="2s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span 
            className="font-bold tracking-tight leading-none"
            style={{ 
              fontSize: `${textSize}px`,
              color: textColor,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: '700'
            }}
          >
            ORSH
          </span>
          <span 
            className="text-xs opacity-70 leading-tight max-w-32"
            style={{ 
              color: textColor,
              fontSize: `${size * 0.2}px`
            }}
          >
            Operation Readiness & Start-up Handover
          </span>
        </div>
      )}
    </div>
  );
};

export default ORSHLogo;