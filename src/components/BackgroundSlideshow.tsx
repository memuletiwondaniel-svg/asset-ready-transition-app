import React, { useState, useEffect, useRef, useCallback } from 'react';

interface BackgroundSlideshowProps {
  showFunFacts?: boolean;
}

// Timing constants
const DISPLAY_MS = 7000; // How long each image is shown
const FADE_MS = 4000;    // Crossfade duration

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

  // Core slideshow state
  const [activeIndex, setActiveIndex] = useState(0);
  const [layers, setLayers] = useState<{ index: number; opacity: number; key: number }[]>([
    { index: 0, opacity: 1, key: 0 }
  ]);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  
  // Refs for cleanup
  const intervalRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const keyCounterRef = useRef(1);
  const isFadingRef = useRef(false);

  // Preload all images on mount
  useEffect(() => {
    images.forEach((src, index) => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, index]));
      };
      img.onerror = () => {
        setLoadedImages(prev => new Set([...prev, index]));
      };
      if (index === 0) {
        img.fetchPriority = 'high';
      }
      img.src = src;
    });
  }, []);

  // Start transition to next image
  const startTransition = useCallback(() => {
    if (isFadingRef.current) return; // Don't overlap transitions
    
    const nextIndex = (activeIndex + 1) % images.length;
    
    // Check if next image is loaded
    if (!loadedImages.has(nextIndex)) {
      // Skip if not loaded yet - will try again next interval
      return;
    }

    isFadingRef.current = true;
    const newKey = keyCounterRef.current++;

    // Add new layer at opacity 0
    setLayers(prev => [
      ...prev,
      { index: nextIndex, opacity: 0, key: newKey }
    ]);

    // Next frame: trigger fade (incoming to 1, outgoing to 0)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLayers(prev => prev.map((layer, i) => ({
          ...layer,
          opacity: i === prev.length - 1 ? 1 : 0
        })));
      });
    });

    // After fade completes, clean up old layers
    if (fadeTimeoutRef.current) {
      window.clearTimeout(fadeTimeoutRef.current);
    }
    fadeTimeoutRef.current = window.setTimeout(() => {
      setActiveIndex(nextIndex);
      setLayers([{ index: nextIndex, opacity: 1, key: newKey }]);
      isFadingRef.current = false;
    }, FADE_MS);
  }, [activeIndex, images.length, loadedImages]);

  // Slideshow interval
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      startTransition();
    }, DISPLAY_MS);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      if (fadeTimeoutRef.current) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [startTransition]);

  const isFirstImageLoaded = loadedImages.has(0);
  const currentFacts = bgcFactsSets[activeIndex] || bgcFactsSets[0];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Fallback gradient background while images load */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-opacity duration-700 ${
          isFirstImageLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Slideshow layers with crossfade and Ken Burns */}
      {layers.map((layer) => {
        const isLoaded = loadedImages.has(layer.index);
        if (!isLoaded) return null;

        return (
          <div
            key={layer.key}
            className="absolute inset-0"
            style={{
              opacity: layer.opacity,
              transition: `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              willChange: 'opacity',
            }}
          >
            <img
              src={images[layer.index]}
              alt=""
              className="w-full h-full object-cover object-center animate-ken-burns"
            />
          </div>
        );
      })}
      
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
