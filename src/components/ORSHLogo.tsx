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
            <linearGradient id={`orsh-gradient-outer-${currentVariant}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.start} stopOpacity="0.9">
                {dynamicColors && (
                  <animate
                    attributeName="stop-opacity"
                    values="0;0.9;0"
                    dur="6s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="50%" stopColor={colors.mid} stopOpacity="0.8">
                {dynamicColors && (
                  <animate
                    attributeName="stop-opacity"
                    values="0;0.8;0"
                    dur="6s"
                    begin="1s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="100%" stopColor={colors.end} stopOpacity="0.7">
                {dynamicColors && (
                  <animate
                    attributeName="stop-opacity"
                    values="0;0.7;0"
                    dur="6s"
                    begin="2s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
            </linearGradient>
            
            <linearGradient id={`orsh-gradient-inner-${currentVariant}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.mid} stopOpacity="0.8">
                {dynamicColors && (
                  <animate
                    attributeName="stop-opacity"
                    values="0;0.8;0"
                    dur="6s"
                    begin="0.5s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="100%" stopColor={colors.end} stopOpacity="0.6">
                {dynamicColors && (
                  <animate
                    attributeName="stop-opacity"
                    values="0;0.6;0"
                    dur="6s"
                    begin="1.5s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
            </linearGradient>
            
            <filter id="orsh-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Outer circular layer */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={`url(#orsh-gradient-outer-${currentVariant})`}
            strokeWidth="16"
            strokeDasharray="0 66 200 66"
            filter="url(#orsh-glow)"
            transform="rotate(-90 50 50)"
          >
            {dynamicColors && (
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur="6s"
                repeatCount="indefinite"
              />
            )}
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-90 50 50;270 50 50;-90 50 50"
              dur="12s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Middle circular layer */}
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke={`url(#orsh-gradient-inner-${currentVariant})`}
            strokeWidth="12"
            strokeDasharray="0 47 150 47"
            filter="url(#orsh-glow)"
            transform="rotate(90 50 50)"
          >
            {dynamicColors && (
              <animate
                attributeName="opacity"
                values="0;0.8;0"
                dur="6s"
                begin="1s"
                repeatCount="indefinite"
              />
            )}
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="90 50 50;-270 50 50;90 50 50"
              dur="15s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Inner solid circle */}
          <circle
            cx="50"
            cy="50"
            r="18"
            fill={`url(#orsh-gradient-inner-${currentVariant})`}
            filter="url(#orsh-glow)"
          >
            {dynamicColors && (
              <animate
                attributeName="opacity"
                values="0;0.9;0"
                dur="6s"
                begin="2s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span 
            className="font-bold tracking-tight leading-none transition-all duration-[6000ms] ease-in-out"
            style={{ 
              fontSize: `${textSize}px`,
              color: dynamicColors ? colors.end : textColor,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: '700'
            }}
          >
            RSH
            {dynamicColors && (
              <span className="inline-block">
                <animate
                  attributeName="fill"
                  values={`${colors.start};${colors.mid};${colors.end};${colors.start}`}
                  dur="8s"
                  repeatCount="indefinite"
                />
              </span>
            )}
          </span>
          <span 
            className="text-xs opacity-70 leading-tight max-w-32 transition-all duration-[6000ms] ease-in-out"
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