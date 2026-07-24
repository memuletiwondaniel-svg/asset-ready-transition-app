import React from 'react';

// Shared Gulf Gas Company mark (three-petal flame). Re-exported here so
// existing imports from `./SsoMarks` continue to work.
export { GulfGasMark } from '@/components/branding/GulfGasLogo';

/**
 * EPCM "E" monogram — same geometric weight/style as the old Kent "K" mark
 * (bold sans-serif letter inside a rounded square) in a neutral graphite tone.
 */
export const EpcmMark: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#2B3138" />
    <path
      d="M7.6 6.2h9.1v3H10.7v2.3h5.4v3h-5.4v2.3h6.1v3H7.6V6.2Z"
      fill="#FFFFFF"
    />
  </svg>
);
