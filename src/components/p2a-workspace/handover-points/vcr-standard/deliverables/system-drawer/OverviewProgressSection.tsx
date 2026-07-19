import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface OverviewProgressProps {
  overallPct: number;
  itrACompletePct: number;
  itrBCompletePct: number;
  itrTotal: number;
  itrCompleted: number;
}

const GREEN = '#059669'; // emerald-600
const CORAL = '#f97066'; // coral

const TiltedPie: React.FC<{ pct: number; label: string }> = ({ pct, label }) => {
  const data = [
    { name: 'Complete', value: pct },
    { name: 'Outstanding', value: Math.max(0, 100 - pct) },
  ];
  return (
    <div className="flex flex-col items-center">
      <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80 mb-2">
        {label}
      </div>
      <div
        className="h-[104px] w-[104px]"
        style={{ transform: 'perspective(400px) rotateX(38deg)', transformOrigin: 'center bottom' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              innerRadius={0}
              outerRadius={50}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={1}
              isAnimationActive={false}
            >
              <Cell fill={GREEN} />
              <Cell fill={CORAL} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-[13px] font-semibold tabular-nums">{Math.round(pct)}%</div>
    </div>
  );
};

export const OverviewProgressSection: React.FC<OverviewProgressProps> = ({
  overallPct,
  itrACompletePct,
  itrBCompletePct,
  itrTotal,
  itrCompleted,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/40 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground/85">
        <span className="font-semibold">{itrCompleted} of {itrTotal} ITRs complete</span> across this
        system. Mechanical completion (ITR-A) sits at {Math.round(itrACompletePct)}%, pre-commissioning
        (ITR-B) at {Math.round(itrBCompletePct)}%.
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">
            Overall completion
          </div>
          <div className="text-[14px] font-semibold tabular-nums">{Math.round(overallPct)}%</div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-2">
          <div
            className={cn('h-full transition-all', overallPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500')}
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <TiltedPie pct={itrACompletePct} label="Mechanical completion" />
        <TiltedPie pct={itrBCompletePct} label="Pre-commissioning" />
      </div>

      <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} /> Complete
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: CORAL }} /> Outstanding
        </span>
      </div>
    </div>
  );
};
