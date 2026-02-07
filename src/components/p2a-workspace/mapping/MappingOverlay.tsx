import React from 'react';
import { MappingConnection } from './useMappingPositions';

interface MappingOverlayProps {
  connections: MappingConnection[];
}

/**
 * Generates a smooth cubic bezier path between two points.
 * Uses horizontal S-curves to create clean, non-overlapping connections.
 */
const getBezierPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  groupIndex: number = 0,
  groupSize: number = 1,
): string => {
  // Horizontal offset for staggering multiple lines in the same group
  const staggerOffset = groupSize > 1
    ? (groupIndex - (groupSize - 1) / 2) * 6
    : 0;

  const dx = endX - startX;
  const midX = startX + dx * 0.45 + staggerOffset;

  // Control points create an S-curve
  const cp1X = midX;
  const cp1Y = startY;
  const cp2X = midX;
  const cp2Y = endY;

  return `M ${startX},${startY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;
};

export const MappingOverlay: React.FC<MappingOverlayProps> = ({ connections }) => {
  if (connections.length === 0) return null;

  // Group connections by VCR to calculate stagger indices
  const vcrGroups: Record<string, MappingConnection[]> = {};
  for (const conn of connections) {
    if (!vcrGroups[conn.vcrId]) vcrGroups[conn.vcrId] = [];
    vcrGroups[conn.vcrId].push(conn);
  }

  // Build index map for staggering
  const connectionMeta = connections.map(conn => {
    const group = vcrGroups[conn.vcrId];
    const indexInGroup = group.indexOf(conn);
    return { conn, indexInGroup, groupSize: group.length };
  });

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10, willChange: 'transform' }}
    >
      <defs>
        {/* Animated dash for pulse effect */}
        <style>{`
          @keyframes dash-flow {
            to { stroke-dashoffset: -20; }
          }
        `}</style>
      </defs>

      {connectionMeta.map(({ conn, indexInGroup, groupSize }) => {
        const path = getBezierPath(
          conn.startX, conn.startY,
          conn.endX, conn.endY,
          indexInGroup, groupSize,
        );

        return (
          <g key={`${conn.systemId}-${conn.vcrId}`}>
            {/* Shadow/glow layer */}
            <path
              d={path}
              fill="none"
              stroke={conn.borderColor}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.15}
            />
            {/* Main connection line */}
            <path
              d={path}
              fill="none"
              stroke={conn.borderColor}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.55}
            />
            {/* Animated flow indicator */}
            <path
              d={path}
              fill="none"
              stroke={conn.borderColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="4 16"
              opacity={0.3}
              style={{ animation: 'dash-flow 1.5s linear infinite' }}
            />
            {/* Start dot */}
            <circle
              cx={conn.startX}
              cy={conn.startY}
              r={3}
              fill={conn.borderColor}
              opacity={0.6}
            />
            {/* End dot */}
            <circle
              cx={conn.endX}
              cy={conn.endY}
              r={3}
              fill={conn.borderColor}
              opacity={0.6}
            />
          </g>
        );
      })}
    </svg>
  );
};
