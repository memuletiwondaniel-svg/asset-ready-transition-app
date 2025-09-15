import React, { useState, useEffect } from 'react';

interface ORSHLogoProps {
  className?: string;
  size?: number;
  variant?: 'primary' | 'energy' | 'success' | 'ocean';
  showText?: boolean;
  animated?: boolean;
  darkMode?: boolean;
  dynamicColors?: boolean;
}

const ORSHLogo: React.FC<ORSHLogoProps> = ({
  className = "",
  size = 48,
  variant = 'primary',
  showText = true,
  animated = false,
  darkMode = false,
  dynamicColors = true
}) => {
  const [currentVariant, setCurrentVariant] = useState(variant);

  const gradientColors = {
    primary: {
      start: '#00E5FF',
      mid: '#2196F3', 
      end: '#1565C0'
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

  // Dynamic color cycling effect
  useEffect(() => {
    if (!dynamicColors) return;
    
    const variants: (keyof typeof gradientColors)[] = ['primary', 'energy', 'success', 'ocean'];
    let currentIndex = variants.indexOf(variant);
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % variants.length;
      setCurrentVariant(variants[currentIndex]);
    }, 3000); // Change color every 3 seconds

    return () => clearInterval(interval);
  }, [variant, dynamicColors]);

  const colors = gradientColors[currentVariant];
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
          className={animated ? 'animate-spin-slow' : 'transition-all duration-1000 ease-in-out'}
        >
          <defs>
            <linearGradient id={`orsh-gradient-${currentVariant}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.start}>
                {dynamicColors && (
                  <animate
                    attributeName="stop-color"
                    values={`${colors.start};${colors.mid};${colors.start}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="50%" stopColor={colors.mid}>
                {dynamicColors && (
                  <animate
                    attributeName="stop-color"
                    values={`${colors.mid};${colors.end};${colors.mid}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="100%" stopColor={colors.end}>
                {dynamicColors && (
                  <animate
                    attributeName="stop-color"
                    values={`${colors.end};${colors.start};${colors.end}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
            </linearGradient>
            <filter id="orsh-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={colors.end} floodOpacity="0.2"/>
            </filter>
          </defs>
          
          {/* Modern circular swirl - outer ring */}
          <path
            d="M 50 10 
               A 40 40 0 1 1 10 50 
               A 30 30 0 1 0 50 20
               A 20 20 0 1 1 30 50
               A 10 10 0 1 0 50 40"
            fill={`url(#orsh-gradient-${currentVariant})`}
            filter="url(#orsh-shadow)"
            opacity="0.95"
          >
            {animated && (
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from="0 50 50"
                to="360 50 50"
                dur="8s"
                repeatCount="indefinite"
              />
            )}
          </path>

          {/* Inner flowing element */}
          <path
            d="M 50 25
               A 25 25 0 1 1 25 50
               A 15 15 0 1 0 50 35
               A 8 8 0 1 1 42 50"
            fill={colors.start}
            opacity="0.7"
          >
            {animated && (
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from="0 50 50"
                to="-360 50 50"
                dur="6s"
                repeatCount="indefinite"
              />
            )}
          </path>
          
          {/* Center highlight */}
          <circle
            cx="50"
            cy="50"
            r="6"
            fill={colors.mid}
            opacity="0.9"
          >
            {animated && (
              <animate
                attributeName="opacity"
                values="0.6;1;0.6"
                dur="3s"
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