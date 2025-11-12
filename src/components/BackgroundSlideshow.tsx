import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 7000); // Change image every 7 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const currentFacts = bgcFactsSets[currentImageIndex] || bgcFactsSets[0];

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[3000ms] ease-in-out ${
            index === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${image})`,
          }}
        />
      ))}
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* BGC Logo moved 75% to the right */}
      <div className="absolute top-6 left-3/4 transform -translate-x-1/2 z-20">
        <img 
          src="/lovable-uploads/421778ce-4ffe-4e3b-b370-8d1bb24a3d51.png" 
          alt="BGC Logo" 
          className="h-16 w-auto drop-shadow-lg"
        />
      </div>
      
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
