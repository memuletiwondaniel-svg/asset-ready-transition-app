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

  // Dynamic color cycling effect with slower transitions
  useEffect(() => {
    if (!dynamicColors) return;
    
    const variants: (keyof typeof gradientColors)[] = ['primary', 'energy', 'success', 'ocean'];
    let currentIndex = variants.indexOf(variant);
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % variants.length;
      setCurrentVariant(variants[currentIndex]);
    }, 8000); // Change color every 8 seconds for slower transitions

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
          className="transition-all duration-[6000ms] ease-in-out"
        >
          <defs>
            <linearGradient id={`orsh-gradient-${currentVariant}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.start}>
                {dynamicColors && (
                  <animate
                    attributeName="stop-opacity"
                    values="0;1;0"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="50%" stopColor={colors.mid}>
                {dynamicColors && (
                  <animate
                    attributeName="stop-opacity"
                    values="0;1;0"
                    dur="8s"
                    begin="1s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="100%" stopColor={colors.end}>
                {dynamicColors && (
                  <animate
                    attributeName="stop-opacity"
                    values="0;1;0"
                    dur="8s"
                    begin="2s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
            </linearGradient>
            
            <filter id="orsh-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Swirl shape matching the reference design */}
          <path
            d="M50 10 
               C 30 10, 10 30, 10 50
               C 10 70, 30 90, 50 90
               C 65 90, 77 78, 77 63
               C 77 48, 65 36, 50 36
               C 42 36, 36 42, 36 50
               C 36 58, 42 64, 50 64
               L 50 50
               L 50 10"
            fill={`url(#orsh-gradient-${currentVariant})`}
            filter="url(#orsh-glow)"
          >
            {dynamicColors && (
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur="8s"
                repeatCount="indefinite"
              />
            )}
          </path>

          {/* Inner swirl detail */}
          <path
            d="M50 25
               C 37 25, 25 37, 25 50
               C 25 63, 37 75, 50 75
               C 58 75, 65 68, 65 60
               C 65 52, 58 45, 50 45
               L 50 25"
            fill="none"
            stroke={colors.end}
            strokeWidth="2"
            opacity="0.6"
          >
            {dynamicColors && (
              <animate
                attributeName="opacity"
                values="0;0.6;0"
                dur="8s"
                begin="1s"
                repeatCount="indefinite"
              />
            )}
          </path>
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span 
            className="font-bold tracking-tight leading-none transition-all duration-[8000ms] ease-in-out"
            style={{ 
              fontSize: `${textSize}px`,
              color: dynamicColors ? colors.end : textColor,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: '900'
            }}
          >
            RSH
          </span>
          <span 
            className="text-xs opacity-70 leading-tight max-w-32 transition-all duration-[8000ms] ease-in-out"
            style={{ 
              color: dynamicColors ? colors.mid : textColor,
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