import React from 'react';
import bgcLogo from '@/assets/bgc-logo.png';

interface BGCIconProps {
  className?: string;
  size?: number;
}

/**
 * Official Basrah Gas Company logo.
 */
const BGCIcon: React.FC<BGCIconProps> = ({ className, size = 24 }) => (
  <img
    src={bgcLogo}
    alt="Basrah Gas Company"
    width={size}
    height={size}
    style={{ width: size, height: size, objectFit: 'contain' }}
    className={className}
  />
);

export default BGCIcon;
