import React from 'react';

/**
 * Gulf Gas Company brand mark — three overlapping rounded-tip flame petals
 * in three blue shades. Shared by the login SSO button and the SoF/PAC
 * certificate headers.
 */
const PETAL_D =
  'M63.5 18 C 78 40, 80 68, 66 86 C 63 92, 57 92, 54 86 C 40 68, 42 40, 56.5 18 C 58.5 15.5, 61.5 15.5, 63.5 18 Z';

export const GulfGasMark: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...rest
}) => (
  <svg
    viewBox="28 12 64 86"
    aria-hidden="true"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    <path d={PETAL_D} transform="rotate(-15 60 94)" fill="#12376B" />
    <path d={PETAL_D} transform="rotate(1 60 94)" fill="#0E7CC0" />
    <path d={PETAL_D} transform="rotate(15 60 94)" fill="#38BDF8" />
  </svg>
);

/**
 * Full Gulf Gas Company lockup: mark + vertical divider + Arabic/English wordmark.
 * Used on SoF and PAC certificate headers.
 */
export const GulfGasLockup: React.FC<{ className?: string; markHeight?: number }> = ({
  className,
  markHeight = 50,
}) => (
  <div
    className={className}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}
  >
    <GulfGasMark style={{ height: markHeight, width: 'auto', display: 'block' }} />
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 1,
        height: 46,
        background: '#d8dde3',
        marginLeft: 8,
        marginRight: 10,
      }}
    />
    <div style={{ textAlign: 'right', lineHeight: 1.15 }}>
      <div
        dir="rtl"
        style={{
          fontWeight: 700,
          color: '#0f2f57',
          fontSize: 18,
          fontFamily:
            '"Noto Naskh Arabic", "Amiri", "Segoe UI", system-ui, sans-serif',
        }}
      >
        شركة غاز الخليج
      </div>
      <div
        style={{
          color: '#1170B8',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.24em',
          marginTop: 2,
        }}
      >
        GULF GAS COMPANY
      </div>
    </div>
  </div>
);

export default GulfGasMark;
