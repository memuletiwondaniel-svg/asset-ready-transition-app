import React from 'react';

interface BGCIconProps {
  className?: string;
  size?: number;
}

/**
 * Stylized Basrah Gas Company mark — three overlapping curved petals
 * leaning to the right, inspired by the official BGC logo.
 */
const BGCIcon: React.FC<BGCIconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="bgc-back" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1E3A8A" />
        <stop offset="100%" stopColor="#1E40AF" />
      </linearGradient>
      <linearGradient id="bgc-mid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="bgc-front" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    {/* Back petal — deep navy, leftmost */}
    <path
      d="M8 54 C 8 30, 18 14, 30 8 C 26 24, 22 40, 22 54 Z"
      fill="url(#bgc-back)"
    />
    {/* Middle petal — royal blue */}
    <path
      d="M22 54 C 22 30, 32 14, 44 8 C 40 24, 36 40, 36 54 Z"
      fill="url(#bgc-mid)"
    />
    {/* Front petal — cyan, rightmost and tallest */}
    <path
      d="M36 54 C 36 28, 46 12, 58 6 C 54 22, 50 40, 50 54 Z"
      fill="url(#bgc-front)"
    />
  </svg>
);

export default BGCIcon;
