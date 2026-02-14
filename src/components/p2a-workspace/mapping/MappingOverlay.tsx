import React from 'react';
import { MappingBundle } from './useMappingPositions';

interface MappingOverlayProps {
  bundles: MappingBundle[];
}

/**
 * Renders clean connections from system groups to VCR cards.
 *
 * Pattern per VCR group:
 *   1. Short horizontal stubs from each system card to a shared vertical bus
 *   2. A vertical bus line merging all stubs
 *   3. A single straight line from the bus midpoint directly to the VCR card
 *
 * No elbows, no curves — just stubs + bus + one straight trunk.
 */
export const MappingOverlay: React.FC<MappingOverlayProps> = ({ bundles }) => {
  if (bundles.length === 0) return null;

  // Fixed X offset for the vertical bus — same for ALL bundles so connectors align
  const BUS_OFFSET_X = 24;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 20, willChange: 'transform' }}
    >
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

        // Vertical bus X — aligned for all bundles
        const busX = systemX + BUS_OFFSET_X;

        // Bus Y range
        const minBusY = systemYs[0];
        const maxBusY = systemYs[systemYs.length - 1];

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

            {/* --- Trunk: line from bus midpoint to VCR card center --- */}
            {/* Glow */}
            <line
              x1={busX}
              y1={systemCenterY}
              x2={vcrX}
              y2={vcrY}
              stroke={borderColor}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.08}
            />
            {/* Main line */}
            <line
              x1={busX}
              y1={systemCenterY}
              x2={vcrX}
              y2={vcrY}
              stroke={borderColor}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.5}
            />

            {/* --- Dots --- */}
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
