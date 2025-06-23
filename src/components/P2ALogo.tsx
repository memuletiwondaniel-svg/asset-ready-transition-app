
import React from 'react';

interface P2ALogoProps {
  className?: string;
  size?: number;
}

const P2ALogo: React.FC<P2ALogoProps> = ({ className = "", size = 48 }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className="mr-4 bg-blue-600 rounded-full flex items-center justify-center relative"
        style={{ width: size, height: size }}
      >
        {/* Key handover silhouette - simplified version inspired by the uploaded image */}
        <svg 
          width={size * 0.7} 
          height={size * 0.7} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Upper hand giving */}
          <path 
            d="M20 35 C22 32 28 32 32 35 L40 40 C38 43 32 43 28 40 Z" 
            fill="white"
          />
          
          {/* Lower hand receiving */}
          <path 
            d="M60 65 C62 62 68 62 72 65 L80 70 C78 73 72 73 68 70 Z" 
            fill="white"
          />
          
          {/* Key being transferred */}
          <circle cx="35" cy="42" r="3" fill="none" stroke="white" strokeWidth="1.5"/>
          <rect x="38" y="41" width="15" height="2" rx="1" fill="white"/>
          <rect x="51" y="42" width="2" height="1" fill="white"/>
          <rect x="49" y="41" width="1" height="2" fill="white"/>
          
          {/* Transfer motion line */}
          <path 
            d="M45 50 Q50 55 55 60" 
            stroke="white" 
            strokeWidth="1" 
            fill="none" 
            strokeDasharray="2,1"
            opacity="0.7"
          />
        </svg>
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
