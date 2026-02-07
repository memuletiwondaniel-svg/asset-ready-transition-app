import React from 'react';
import { MappingBundle } from './useMappingPositions';

interface MappingOverlayProps {
  bundles: MappingBundle[];
}

/**
 * Renders clean, orthogonal (horizontal + vertical only) connections
 * from system groups to VCR cards.
 *
 * Pattern per VCR group:
 *   1. Short horizontal stub from each system card to a shared vertical bus
 *   2. A vertical bus line merging all stubs
 *   3. A horizontal trunk from the bus midpoint toward the VCR
 *   4. A final vertical segment to align with the VCR Y
 *   5. A short horizontal segment into the VCR card
 *
 * All lines are strictly horizontal or vertical — no curves.
 */
export const MappingOverlay: React.FC<MappingOverlayProps> = ({ bundles }) => {
  if (bundles.length === 0) return null;

  // Space out the vertical buses so they don't overlap
  const BUS_BASE_X = 18;
  const BUS_SPACING = 12;

  // How far from the VCR left edge we place the vertical drop
  const VCR_APPROACH_OFFSET = 30;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 10 }}
    >
      <defs>
        {/* Subtle shadow filter for trunk lines */}
        <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      {bundles.map((bundle, bundleIndex) => {
        const {
          systemX,
          systemYs,
          systemCenterY,
          vcrX,
          vcrY,
          borderColor,
          vcrId,
          systemCount,
        } = bundle;

        // Vertical bus X — staggered per bundle to avoid overlapping
        const busX = systemX + BUS_BASE_X + bundleIndex * BUS_SPACING;

        // Vertical drop X near the VCR side
        const dropX = vcrX - VCR_APPROACH_OFFSET - bundleIndex * 8;

        // Bus Y range
        const minBusY = systemYs[0];
        const maxBusY = systemYs[systemYs.length - 1];

        // Trunk horizontal Y — use system center
        const trunkY = systemCenterY;

        // Build the orthogonal path:
        // busX, trunkY → dropX, trunkY (horizontal trunk)
        // dropX, trunkY → dropX, vcrY  (vertical drop)
        // dropX, vcrY → vcrX, vcrY     (horizontal approach into VCR)
        const trunkPath = [
          `M ${busX},${trunkY}`,
          `H ${dropX}`,
          `V ${vcrY}`,
          `H ${vcrX}`,
        ].join(' ');

        return (
          <g key={vcrId}>
            {/* --- Stubs: horizontal lines from each system to the bus --- */}
            {systemYs.map((sy, i) => (
              <line
                key={`stub-${i}`}
                x1={systemX}
                y1={sy}
                x2={busX}
                y2={sy}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.4}
              />
            ))}

            {/* --- Bus: vertical line merging stubs --- */}
            {systemCount > 1 && (
              <line
                x1={busX}
                y1={minBusY}
                x2={busX}
                y2={maxBusY}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.35}
              />
            )}

            {/* --- Trunk: orthogonal path from bus to VCR --- */}
            {/* Glow shadow */}
            <path
              d={trunkPath}
              fill="none"
              stroke={borderColor}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.08}
              filter="url(#line-glow)"
            />
            {/* Main trunk line */}
            <path
              d={trunkPath}
              fill="none"
              stroke={borderColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.5}
            />

            {/* --- Dots --- */}
            {/* System-side dots */}
            {systemYs.map((sy, i) => (
              <circle
                key={`dot-s-${i}`}
                cx={systemX}
                cy={sy}
                r={2.5}
                fill={borderColor}
                opacity={0.5}
              />
            ))}

            {/* Corner dot at bus-to-trunk junction */}
            <circle
              cx={busX}
              cy={trunkY}
              r={2}
              fill={borderColor}
              opacity={0.4}
            />

            {/* Corner dot at vertical drop */}
            <circle
              cx={dropX}
              cy={trunkY}
              r={2}
              fill={borderColor}
              opacity={0.4}
            />
            <circle
              cx={dropX}
              cy={vcrY}
              r={2}
              fill={borderColor}
              opacity={0.4}
            />

            {/* VCR-side dot */}
            <circle
              cx={vcrX}
              cy={vcrY}
              r={3.5}
              fill={borderColor}
              opacity={0.6}
            />

            {/* Count badge at bus midpoint */}
            {systemCount > 1 && (
              <>
                <circle
                  cx={busX}
                  cy={systemCenterY}
                  r={7}
                  fill={borderColor}
                  opacity={0.15}
                />
                <circle
                  cx={busX}
                  cy={systemCenterY}
                  r={5}
                  fill={borderColor}
                  opacity={0.7}
                />
                <text
                  x={busX}
                  y={systemCenterY + 0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={7}
                  fontWeight={600}
                  fill="white"
                >
                  {systemCount}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};
