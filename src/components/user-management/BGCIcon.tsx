import React from 'react';

interface BGCIconProps {
  className?: string;
  size?: number;
}

/**
 * Stylized Basrah Gas Company mark — layered flame/wave silhouette
 * inspired by the official BGC logo. Uses currentColor-friendly gradients.
 */
const BGCIcon: React.FC<BGCIconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="bgc-l1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1E3A8A" />
        <stop offset="100%" stopColor="#1E40AF" />
      </linearGradient>
      <linearGradient id="bgc-l2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
      <linearGradient id="bgc-l3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7DD3FC" />
        <stop offset="100%" stopColor="#38BDF8" />
      </linearGradient>
    </defs>
    {/* Back petal — deep navy */}
    <path
      d="M10 40 C 10 22, 18 10, 22 6 C 22 18, 18 30, 16 40 Z"
      fill="url(#bgc-l1)"
    />
    {/* Middle petal — royal blue */}
    <path
      d="M18 40 C 18 22, 26 10, 30 6 C 30 18, 26 30, 24 40 Z"
      fill="url(#bgc-l2)"
    />
    {/* Front petal — cyan */}
    <path
      d="M26 40 C 26 22, 34 10, 38 6 C 38 18, 34 30, 32 40 Z"
      fill="url(#bgc-l3)"
    />
  </svg>
);

export default BGCIcon;
