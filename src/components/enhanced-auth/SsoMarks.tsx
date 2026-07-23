import React from 'react';

/**
 * Gulf Gas icon-only mark (no wordmark).
 * Stylized flame inside a rounded square — used on the "Continue with Gulf Gas" SSO button.
 */
export const GulfGasMark: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#0A3D62" />
    <path
      d="M12 5.5c.9 2.4 3.2 3.4 3.2 6.4 0 2.2-1.4 4.1-3.2 4.1s-3.2-1.9-3.2-4.1c0-1.6.7-2.5 1.5-3.4-.1 1 .3 1.7 1 1.7.9 0 1.1-1.3.7-4.7Z"
      fill="#F7B733"
    />
    <path
      d="M12 11.5c.5 1.1 1.5 1.6 1.5 2.9 0 1.1-.7 1.9-1.5 1.9s-1.5-.8-1.5-1.9c0-.8.4-1.3.9-1.7Z"
      fill="#FFFFFF"
    />
  </svg>
);

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
