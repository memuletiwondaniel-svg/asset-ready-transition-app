import React, { useState, useEffect, useCallback } from 'react';

interface BackgroundSlideshowProps {
  showFunFacts?: boolean;
}

const BackgroundSlideshow: React.FC<BackgroundSlideshowProps> = ({ showFunFacts = false }) => {
  const images = [
    '/lovable-uploads/6e7690dd-d946-4f2a-96b7-f91c6a67c6ea.png',
    '/lovable-uploads/1603b99b-2f9f-47bc-afc2-caba228eff09.png',
    '/lovable-uploads/c6de085c-618d-4ee2-93d2-3e02711541e1.png',
    '/lovable-uploads/bd3f2c2e-3fd4-4cec-ae30-73cf20cc3674.png'
  ];

  const bgcFactsSets = [
    [
      "ONE OF THE WORLD'S LARGEST",
      "GAS FLARING REDUCTION PROJECT",
      "POWERING PROGRESS IN IRAQ"
    ],
    [
      "TRANSFORMING WASTED GAS",
      "INTO VALUABLE ENERGY",
      "FOR A SUSTAINABLE FUTURE"
    ],
    [
      "CAPTURING 300 MILLION",
      "CUBIC FEET PER DAY",
      "OF ASSOCIATED GAS"
    ],
    [
      "REDUCING CO2 EMISSIONS",
      "BY 9 MILLION TONS",
      "ANNUALLY"
    ],
    [
      "POWERING 3 MILLION",
      "IRAQI HOMES",
      "WITH CLEAN ENERGY"
    ],
    [
      "CREATING THOUSANDS",
      "OF LOCAL JOBS",
      "IN BASRAH REGION"
    ],
    [
      "WORLD-CLASS TECHNOLOGY",
      "FOR GAS PROCESSING",
      "AND POWER GENERATION"
    ],
    [
      "PARTNERSHIP BETWEEN",
      "SHELL AND GOVERNMENT",
      "OF IRAQ"
    ],
    [
      "REDUCING GAS FLARING",
      "BY 60% IN IRAQ",
      "SINCE OPERATIONS BEGAN"
    ],
    [
      "SUPPLYING CLEAN FUEL",
      "TO IRAQI NATIONAL",
      "ELECTRICITY GRID"
    ],
    [
      "ENVIRONMENTAL PROTECTION",
      "THROUGH ADVANCED",
      "GAS CAPTURE TECHNOLOGY"
    ],
    [
      "CONTRIBUTING TO IRAQ'S",
      "ENERGY INDEPENDENCE",
      "AND ECONOMIC GROWTH"
    ],
    [
      "STATE-OF-THE-ART",
      "GAS PROCESSING FACILITY",
      "IN KHOR AL-ZUBAIR"
    ],
    [
      "SUPPORTING IRAQ'S",
      "CLIMATE CHANGE",
      "COMMITMENTS"
    ],
    [
      "CONVERTING FLARED GAS",
      "INTO ELECTRICITY",
      "AND LPG PRODUCTS"
    ],
    [
      "OPERATIONAL EXCELLENCE",
      "IN MIDDLE EAST",
      "GAS PROCESSING"
    ],
    [
      "BUILDING SUSTAINABLE",
      "ENERGY INFRASTRUCTURE",
      "FOR FUTURE GENERATIONS"
    ],
    [
      "MAXIMIZING VALUE",
      "FROM IRAQ'S",
      "NATURAL RESOURCES"
    ]
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previousImageIndex, setPreviousImageIndex] = useState<number | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const fadeTimeoutRef = React.useRef<number | null>(null);
  // Preload all images on mount
  useEffect(() => {
    images.forEach((src, index) => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, index]));
      };
      img.onerror = () => {
        // Still mark as "loaded" to not block the slideshow
        setLoadedImages(prev => new Set([...prev, index]));
      };
      // Set high priority for first image
      if (index === 0) {
        img.fetchPriority = 'high';
      }
      img.src = src;
    });
  }, []);

  // Slideshow interval
  useEffect(() => {
    const FADE_MS = 2500;

    const interval = window.setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % images.length;

        // Kick off crossfade: first paint (prev=1, current=0), next frame transition (prev=0, current=1)
        setPreviousImageIndex(prevIndex);
        setIsCrossfading(false);
        window.requestAnimationFrame(() => setIsCrossfading(true));

        if (fadeTimeoutRef.current) window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = window.setTimeout(() => {
          setPreviousImageIndex(null);
        }, FADE_MS);

        return nextIndex;
      });
    }, 7000); // Change image every 7 seconds

    return () => {
      window.clearInterval(interval);
      if (fadeTimeoutRef.current) window.clearTimeout(fadeTimeoutRef.current);
    };
  }, [images.length]);

  const isFirstImageLoaded = loadedImages.has(0);

  const currentFacts = bgcFactsSets[currentImageIndex] || bgcFactsSets[0];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Fallback gradient background while images load */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-opacity duration-700 ${
          isFirstImageLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Slideshow images (true crossfade: force initial opacity, then transition next frame) */}
      {(() => {
        const FADE_MS = 2500;

        const currentSrc = images[currentImageIndex];
        const prevSrc = previousImageIndex !== null ? images[previousImageIndex] : null;

        const currentLoaded = loadedImages.has(currentImageIndex);
        const prevLoaded = previousImageIndex !== null ? loadedImages.has(previousImageIndex) : false;

        const fadeStyle: React.CSSProperties = {
          transitionProperty: 'opacity',
          transitionDuration: `${FADE_MS}ms`,
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'opacity',
        };

        const showPrev = Boolean(prevSrc && prevLoaded);
        const prevOpacity = isCrossfading ? 0 : 1;
        const currentOpacity = isCrossfading ? 1 : 0;

        return (
          <>
            {showPrev && (
              <div
                className="absolute inset-0"
                style={{ ...fadeStyle, opacity: prevOpacity }}
              >
                <img
                  src={prevSrc as string}
                  alt=""
                  loading={previousImageIndex === 0 ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            )}

            {/* Current layer */}
            <div
              className="absolute inset-0"
              style={{ ...fadeStyle, opacity: currentLoaded ? currentOpacity : 0 }}
            >
              <img
                src={currentSrc}
                alt=""
                loading={currentImageIndex === 0 ? 'eager' : 'lazy'}
                className="w-full h-full object-cover object-center"
              />
            </div>
          </>
        );
      })()}
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* BGC Fun Facts Overlay - Only show when showFunFacts is true */}
      {showFunFacts && (
        <div className="absolute inset-0 flex items-center justify-center z-10 px-8">
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-12 text-white max-w-5xl ml-80">
            <div className="text-left space-y-2">
              {currentFacts.map((fact, index) => (
                <p key={index} className="text-4xl font-bold leading-tight tracking-wide text-white uppercase">
                  {fact}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundSlideshow;
