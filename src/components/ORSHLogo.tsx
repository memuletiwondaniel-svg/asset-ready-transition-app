import React, { useState, useEffect } from 'react';
import { removeBackground, loadImage } from '@/utils/backgroundRemoval';
import orshLogoOriginal from '@/assets/orsh-logo-original.png';

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
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);

  // Process the image to remove background on component mount
  useEffect(() => {
    const processImage = async () => {
      try {
        const response = await fetch(orshLogoOriginal);
        const blob = await response.blob();
        const image = await loadImage(blob);
        const processedBlob = await removeBackground(image);
        const url = URL.createObjectURL(processedBlob);
        setProcessedImageUrl(url);
      } catch (error) {
        console.error('Failed to process image:', error);
        // Fallback to original image if processing fails
        setProcessedImageUrl(orshLogoOriginal);
      }
    };

    processImage();

    // Cleanup function to revoke object URL
    return () => {
      if (processedImageUrl) {
        URL.revokeObjectURL(processedImageUrl);
      }
    };
  }, []);

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
        {processedImageUrl ? (
          <img
            src={processedImageUrl}
            alt="ORSH Logo"
            width={logoSize}
            height={logoSize}
            className="w-full h-full object-contain transition-all duration-[8000ms] ease-in-out"
            style={{
              filter: dynamicColors ? `hue-rotate(${currentVariant === 'energy' ? '45deg' : currentVariant === 'success' ? '90deg' : currentVariant === 'ocean' ? '180deg' : '0deg'})` : 'none'
            }}
          />
        ) : (
          <div 
            className="w-full h-full bg-muted animate-pulse rounded-full"
            style={{ width: logoSize, height: logoSize }}
          />
        )}
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