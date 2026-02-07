import React from 'react';
import { MappingBundle } from './useMappingPositions';

interface MappingOverlayProps {
  bundles: MappingBundle[];
}

/**
 * Renders clean, bundled connections from system groups to VCR cards.
 * 
 * Pattern per VCR group:
 *   1. Short horizontal stubs from each system card to a collector rail
 *   2. A vertical collector rail merging all stubs into a single trunk point
 *   3. One clean bezier trunk from the collector to the VCR card
 * 
 * This avoids spaghetti by combining N system lines into 1 trunk per VCR.
 */
export const MappingOverlay: React.FC<MappingOverlayProps> = ({ bundles }) => {
  if (bundles.length === 0) return null;

  // Space out the collector rails so they don't overlap each other
  const RAIL_BASE_X = 16; // distance from system card right edge to first rail
  const RAIL_SPACING = 10; // spacing between parallel rails

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 10 }}
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

        // Position the collector rail at a staggered X to avoid overlap
        const railX = systemX + RAIL_BASE_X + bundleIndex * RAIL_SPACING;

        // Trunk: single bezier from collector midpoint to VCR
        const trunkStartX = railX;
        const trunkStartY = systemCenterY;
        const trunkEndX = vcrX;
        const trunkEndY = vcrY;

        // Control points for a smooth horizontal S-curve
        const dx = trunkEndX - trunkStartX;
        const cpOffset = Math.max(dx * 0.4, 40);
        const trunkPath = `M ${trunkStartX},${trunkStartY} C ${trunkStartX + cpOffset},${trunkStartY} ${trunkEndX - cpOffset},${trunkEndY} ${trunkEndX},${trunkEndY}`;

        // Collector rail: vertical line spanning all system Ys at railX
        const minY = systemYs[0];
        const maxY = systemYs[systemYs.length - 1];

        return (
          <g key={vcrId}>
            {/* --- Stubs: short horizontal lines from each system to the rail --- */}
            {systemYs.map((sy, i) => (
              <line
                key={`stub-${i}`}
                x1={systemX}
                y1={sy}
                x2={railX}
                y2={sy}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.45}
              />
            ))}

            {/* --- Collector rail: vertical line merging stubs --- */}
            {systemCount > 1 && (
              <line
                x1={railX}
                y1={minY}
                x2={railX}
                y2={maxY}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.4}
              />
            )}

            {/* --- Trunk: single bezier from rail midpoint to VCR --- */}
            {/* Glow */}
            <path
              d={trunkPath}
              fill="none"
              stroke={borderColor}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.1}
            />
            {/* Main trunk */}
            <path
              d={trunkPath}
              fill="none"
              stroke={borderColor}
              strokeWidth={2}
              strokeLinecap="round"
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
            {/* VCR-side dot */}
            <circle
              cx={trunkEndX}
              cy={trunkEndY}
              r={3.5}
              fill={borderColor}
              opacity={0.6}
            />
            {/* Count badge at collector midpoint */}
            {systemCount > 1 && (
              <>
                <circle
                  cx={railX}
                  cy={systemCenterY}
                  r={7}
                  fill={borderColor}
                  opacity={0.15}
                />
                <circle
                  cx={railX}
                  cy={systemCenterY}
                  r={5}
                  fill={borderColor}
                  opacity={0.7}
                />
                <text
                  x={railX}
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
