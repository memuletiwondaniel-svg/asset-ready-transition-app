import React from 'react';
import orshLogo from '@/assets/orsh-logo.png';

interface ORSHLogoProps {
  className?: string;
  size?: number;
}

const ORSHLogo: React.FC<ORSHLogoProps> = ({
  className = "",
  size = 48
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src={orshLogo} 
        alt="ORSH Logo" 
        className="object-contain"
        style={{
          width: size,
          height: size
        }}
      />
    </div>
  );
};

export default ORSHLogo;