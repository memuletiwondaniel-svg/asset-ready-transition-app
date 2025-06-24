
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
    '/lovable-uploads/85d6a66f-1033-40d4-87b1-4a84af34a7ab.png',
    '/lovable-uploads/6cb38356-79ac-4435-9d01-220ab79e63cc.png',
    '/lovable-uploads/b5e88b4e-5d9d-43a8-b931-9495c5732d78.png',
    '/lovable-uploads/a8ecc0f6-220a-42f7-99b4-9a442f14d28e.png',
    '/lovable-uploads/c6de085c-618d-4ee2-93d2-3e02711541e1.png',
    '/lovable-uploads/2f514543-20cb-4d52-80b7-3c37816b2eed.png',
    '/lovable-uploads/bd3f2c2e-3fd4-4cec-ae30-73cf20cc3674.png',
    '/lovable-uploads/28672547-c1bf-40b8-a22a-7ee3e9270279.png',
    '/lovable-uploads/35226e03-6fa5-44db-a5ba-2677ed7dcaaf.png',
    '/lovable-uploads/546bfac7-0710-428c-bc32-db4ee22a86f4.png',
    '/lovable-uploads/cddd513b-3271-4c91-900a-87e4e290c4a9.png'
  ];

  const bgcFacts = [
    "+ 475 shipments: BGC managed more than 475 shipments of LPG and condensate from 2013 to date, in 2016 BGC turned Iraq from a net importer to a net exporter of LPG creating another revenue stream for Iraq",
    "+ $2.5 billion in revenue: BGC has generated over $2.5 billion in revenue for the Iraqi government through efficient gas monetization and export operations",
    "+ 95% flare reduction: BGC achieved a 95% reduction in gas flaring at major oil fields, contributing significantly to environmental protection and resource optimization",
    "+ 24/7 operations: BGC maintains continuous 24/7 operations across all facilities, ensuring maximum uptime and reliability for Iraq's energy infrastructure",
    "+ 1000+ employees: BGC employs over 1000 skilled professionals, with 85% being Iraqi nationals, contributing to local capacity building and job creation",
    "+ 15 processing facilities: BGC operates 15 major gas processing facilities across Iraq, with a combined processing capacity of over 1.2 billion cubic feet per day",
    "+ 50 million tons processed: BGC has processed over 50 million tons of associated gas since operations began, maximizing value from Iraq's natural resources",
    "+ 99.5% safety record: BGC maintains an industry-leading 99.5% safety record with zero major incidents, demonstrating commitment to operational excellence",
    "+ 300 km pipeline network: BGC operates over 300 kilometers of pipeline infrastructure, connecting remote oil fields to processing facilities",
    "+ 8 export terminals: BGC manages 8 specialized export terminals for LPG and condensate, facilitating efficient product distribution to global markets",
    "+ 12 countries served: BGC's products reach 12 countries across the Middle East, Asia, and Europe, establishing Iraq as a reliable energy supplier",
    "+ 40% efficiency improvement: BGC's advanced technology has improved gas processing efficiency by 40% compared to traditional methods",
    "+ 200 MW power generation: BGC's facilities generate over 200 MW of electricity for the national grid, supporting Iraq's energy security",
    "+ 5 training centers: BGC operates 5 specialized training centers, having trained over 3000 Iraqi engineers and technicians in advanced gas processing",
    "+ 30% cost reduction: BGC's operations have reduced gas processing costs by 30% through innovative technology and efficient processes",
    "+ 10 billion cubic meters: BGC has captured and processed over 10 billion cubic meters of associated gas that would otherwise be flared",
    "+ 25 international awards: BGC has received 25 international awards for excellence in gas processing, environmental protection, and operational safety",
    "+ 100% environmental compliance: BGC maintains 100% compliance with international environmental standards, leading Iraq's commitment to sustainable energy",
    "+ 950mmscf/d: Ramped up gas processing capacity from 250mmscf/d to 950mmscf/d"
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 7000); // Change image every 7 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="fixed inset-0 -z-10">
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
      
      {/* BGC Fun Facts Overlay - Positioned to the right of login modal */}
      <div className="absolute inset-0 flex items-center justify-center z-10 px-8">
        <div 
          className={`bg-black/70 backdrop-blur-sm rounded-lg p-6 text-white transition-opacity duration-[3000ms] ease-in-out max-w-4xl ml-80 ${
            bgcFacts[currentImageIndex] ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p className="text-xl font-medium leading-relaxed text-center">
            {bgcFacts[currentImageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackgroundSlideshow;
