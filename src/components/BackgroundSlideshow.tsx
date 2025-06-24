
import React, { useState, useEffect } from 'react';

const BackgroundSlideshow: React.FC = () => {
  const images = [
    '/lovable-uploads/760b8313-c785-4c51-b0d5-afe7bf6eaeca.png',
    '/lovable-uploads/16bc5478-aecb-4b44-82d1-0ff41eb10dbb.png',
    '/lovable-uploads/f183d942-af72-43b6-8db2-66997da17688.png',
    '/lovable-uploads/6e7690dd-d946-4f2a-96b7-f91c6a67c6ea.png',
    '/lovable-uploads/5e0b3393-8ea6-4c88-9cf7-a5ff3ed6da05.png',
    '/lovable-uploads/b229716e-e39e-41cb-91d3-2c30dd517fa8.png',
    '/lovable-uploads/1603b99b-2f9f-47bc-afc2-caba228eff09.png',
    '/lovable-uploads/85d6a66f-1033-40d4-87b1-4a84af34a7ab.png'
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="fixed inset-0 -z-10">
      {images.map((image, index) => (
        <div
          key={image}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
            index === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${image})`,
          }}
        />
      ))}
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
};

export default BackgroundSlideshow;
