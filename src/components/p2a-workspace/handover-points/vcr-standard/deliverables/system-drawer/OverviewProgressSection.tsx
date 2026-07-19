import React from 'react';
import { cn } from '@/lib/utils';

interface OverviewProgressProps {
  overallPct: number;
  itrACompletePct: number;
  itrBCompletePct: number;
  itrTotal: number;
  itrCompleted: number;
}

const COMPLETE = '#10B981';     // emerald
const OUTSTANDING = '#F5B841';  // amber

// Slightly darker shade for the extruded side (adds depth).
const shade = (hex: string, amt = -0.28): string => {
  const c = hex.replace('#', '');
  const n = parseInt(c, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * amt)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amt)));
  const b = Math.max(0, Math.min(255, (n & 0xff) + Math.round(255 * amt)));
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Modern extruded 3D pie: tilted disc rendered as two ellipses
 * (bottom + top) with a side "band" between them for real depth,
 * plus a soft ground shadow beneath.
 */
const ExtrudedPie: React.FC<{ pct: number; title: string; sublabel: string }> = ({
  pct, title, sublabel,
}) => {
  const size = 112;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const rx = 46;   // horizontal radius
  const ry = 20;   // vertical radius (tilt)
  const depth = 12; // extrusion depth

  // Convert pct to angle (start at top, sweep clockwise like a pie chart).
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const angle = p * 2 * Math.PI;

  // Position on the tilted ellipse for the "split" point between complete/outstanding.
  // Start at top (angle 0 = 12 o'clock), clockwise.
  const pt = (a: number) => ({
    x: cx + rx * Math.sin(a),
    y: cy - ry * Math.cos(a),
  });

  const start = pt(0);
  const split = pt(angle);

  // Path for the top face of the "complete" wedge on a tilted ellipse.
  // large-arc-flag = 1 when the wedge spans more than half the pie.
  const largeArc = p > 0.5 ? 1 : 0;
  const completePath = p <= 0 ? '' : p >= 1
    ? `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`
    : `M ${cx} ${cy} L ${start.x} ${start.y} A ${rx} ${ry} 0 ${largeArc} 1 ${split.x} ${split.y} Z`;

  const outstandingPath = p >= 1 ? '' : p <= 0
    ? `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`
    : `M ${cx} ${cy} L ${split.x} ${split.y} A ${rx} ${ry} 0 ${1 - largeArc} 1 ${start.x} ${start.y} Z`;

  // Side extrusion: the visible bottom half of the disc (front edge).
  // Approximate the band as a filled rounded rect between the two ellipses,
  // colored per segment along the visible arc.
  //
  // Simpler robust approach: draw a full lower band using the pie's outline,
  // then overlay the front-facing portion of each segment.
  const bandPath = `
    M ${cx - rx} ${cy}
    A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}
    L ${cx + rx} ${cy + depth}
    A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy + depth}
    Z
  `;

  // Determine which segment owns the front-facing arc (bottom of ellipse).
  // If the complete wedge crosses the bottom (angle 180deg / PI), front side is split.
  const crossesBottom = angle > Math.PI;

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/85">
        {title}
      </div>
      <div className="text-[9.5px] font-mono tracking-wider text-muted-foreground/60 -mt-0.5">
        {sublabel}
      </div>
      <svg width={size} height={size + depth + 6} viewBox={`0 0 ${size} ${size + depth + 6}`} className="mt-1">
        {/* Ground shadow */}
        <ellipse
          cx={cx}
          cy={cy + depth + 3}
          rx={rx * 0.95}
          ry={4}
          fill="rgba(15, 23, 42, 0.14)"
          filter="url(#pieBlur)"
        />
        <defs>
          <filter id="pieBlur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        {/* Bottom face (both colors) at cy+depth for depth */}
        <g transform={`translate(0, ${depth})`}>
          {p > 0 && <path d={completePath} fill={shade(COMPLETE)} />}
          {p < 1 && <path d={outstandingPath} fill={shade(OUTSTANDING)} />}
        </g>

        {/* Extruded band — filled per segment. Simple approach: full band
            colored by which segment currently faces the viewer at bottom. */}
        <path
          d={bandPath}
          fill={crossesBottom ? shade(COMPLETE, -0.18) : shade(OUTSTANDING, -0.18)}
        />
        {/* If complete wedge partially crosses bottom, overlay the outstanding side */}
        {p > 0 && p < 1 && (
          <path
            d={bandPath}
            fill={crossesBottom ? shade(OUTSTANDING, -0.18) : shade(COMPLETE, -0.18)}
            clipPath="url(#none)"
            opacity={0}
          />
        )}

        {/* Top face */}
        {p > 0 && <path d={completePath} fill={COMPLETE} stroke="rgba(255,255,255,0.95)" strokeWidth={0.8} />}
        {p < 1 && <path d={outstandingPath} fill={OUTSTANDING} stroke="rgba(255,255,255,0.95)" strokeWidth={0.8} />}

        {/* Subtle top highlight for polish */}
        <ellipse
          cx={cx}
          cy={cy - ry * 0.55}
          rx={rx * 0.72}
          ry={ry * 0.28}
          fill="rgba(255,255,255,0.18)"
        />
      </svg>
      <div className="text-[13px] font-semibold tabular-nums -mt-1">{Math.round(pct)}%</div>
    </div>
  );
};

const SectionLabel: React.FC<{ label: string; right?: React.ReactNode }> = ({ label, right }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80 whitespace-nowrap">
      {label}
    </span>
    <div className="flex-1 h-px bg-border" />
    {right}
  </div>
);

export const OverviewProgressSection: React.FC<OverviewProgressProps> = ({
  overallPct,
  itrACompletePct,
  itrBCompletePct,
  itrTotal,
  itrCompleted,
}) => {
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-muted/40 px-3.5 py-2 text-[12.5px] leading-relaxed text-foreground/85">
        <span className="font-semibold">{itrCompleted} of {itrTotal} ITRs complete</span> across this
        system. Mechanical completion (ITR-A) sits at {Math.round(itrACompletePct)}%, pre-commissioning
        (ITR-B) at {Math.round(itrBCompletePct)}%.
      </div>

      {/* Overall completion */}
      <div className="space-y-1.5">
        <SectionLabel
          label="Overall completion"
          right={<span className="text-[13px] font-semibold tabular-nums">{Math.round(overallPct)}%</span>}
        />
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn('h-full transition-all', overallPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500')}
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Completion by phase */}
      <div className="space-y-2 pt-1">
        <SectionLabel label="Completion by phase" />
        <div className="grid grid-cols-2 gap-2">
          <ExtrudedPie pct={itrACompletePct} title="Mechanical Completion" sublabel="ITR-A" />
          <ExtrudedPie pct={itrBCompletePct} title="Pre-Commissioning" sublabel="ITR-B" />
        </div>
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-0.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: COMPLETE }} /> Complete
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: OUTSTANDING }} /> Outstanding
          </span>
        </div>
      </div>
    </div>
  );
};
