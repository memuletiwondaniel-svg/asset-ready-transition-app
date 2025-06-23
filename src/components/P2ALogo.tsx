
import React from 'react';

interface P2ALogoProps {
  className?: string;
  size?: number;
}

const P2ALogo: React.FC<P2ALogoProps> = ({ className = "", size = 48 }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="mr-3"
      >
        {/* Background circle */}
        <circle cx="50" cy="50" r="48" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2"/>
        
        {/* Left hand (giving) */}
        <path 
          d="M15 45 Q20 40 25 45 L35 50 Q30 55 25 50 L15 45 Z" 
          fill="#FED7AA" 
          stroke="#FB923C" 
          strokeWidth="1"
        />
        
        {/* Right hand (receiving) */}
        <path 
          d="M65 55 Q70 50 75 55 L85 60 Q80 65 75 60 L65 55 Z" 
          fill="#FED7AA" 
          stroke="#FB923C" 
          strokeWidth="1"
        />
        
        {/* Key body */}
        <rect 
          x="35" 
          y="47" 
          width="20" 
          height="4" 
          rx="2" 
          fill="#FBBF24" 
          stroke="#F59E0B" 
          strokeWidth="1"
        />
        
        {/* Key head (circular) */}
        <circle 
          cx="37" 
          cy="49" 
          r="4" 
          fill="none" 
          stroke="#FBBF24" 
          strokeWidth="2"
        />
        
        {/* Key teeth */}
        <rect x="53" y="49" width="3" height="2" fill="#FBBF24"/>
        <rect x="50" y="49" width="2" height="3" fill="#FBBF24"/>
        
        {/* Motion lines indicating transfer */}
        <path 
          d="M40 35 Q45 30 50 35" 
          stroke="#E5E7EB" 
          strokeWidth="1" 
          fill="none" 
          strokeDasharray="2,2"
        />
        <path 
          d="M50 65 Q55 70 60 65" 
          stroke="#E5E7EB" 
          strokeWidth="1" 
          fill="none" 
          strokeDasharray="2,2"
        />
        
        {/* P2A text */}
        <text 
          x="50" 
          y="80" 
          textAnchor="middle" 
          fill="white" 
          fontSize="12" 
          fontWeight="bold" 
          fontFamily="Arial, sans-serif"
        >
          P2A
        </text>
      </svg>
      
      <div className="flex flex-col">
        <span className="text-xl font-bold text-gray-900">P2A</span>
        <span className="text-xs text-gray-500">Project-to-Asset</span>
      </div>
    </div>
  );
};

export default P2ALogo;
