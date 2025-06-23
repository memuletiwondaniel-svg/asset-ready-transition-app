
import React from 'react';

interface P2ALogoProps {
  className?: string;
  size?: number;
}

const P2ALogo: React.FC<P2ALogoProps> = ({ className = "", size = 48 }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className="mr-4 bg-blue-600 rounded-full flex items-center justify-center relative overflow-hidden"
        style={{ width: size, height: size }}
      >
        <img 
          src="/lovable-uploads/a115d6ee-9a4b-412e-993e-37839ae158ea.png" 
          alt="Key handover" 
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0) invert(1)' }}
          onError={(e) => {
            console.log('Image failed to load:', e);
          }}
        />
      </div>
      
      <div className="flex flex-col">
        <span className="text-3xl font-bold text-gray-900">P2A</span>
        <span className="text-xs text-gray-600 max-w-48 leading-tight">
          ...ensuring seamless Project-to-Asset Handover...
        </span>
      </div>
    </div>
  );
};

export default P2ALogo;
