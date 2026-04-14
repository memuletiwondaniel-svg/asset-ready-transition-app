import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { getLevelFromProgress } from './competencyLevels';

interface CompetencyDonutProps {
  progress: number;
  size?: 48 | 64 | 72 | 80;
}

const CompetencyDonut: React.FC<CompetencyDonutProps> = ({ progress, size = 48 }) => {
  const level = getLevelFromProgress(progress);
  const data = [
    { value: progress },
    { value: 100 - progress },
  ];

  const outerRadius = size / 2 - 4;
  const ringWidth = size >= 80 ? 8 : size >= 72 ? 7 : size === 64 ? 6 : 5;
  const innerRadius = outerRadius - ringWidth;

  // Add generous padding to prevent clipping
  const svgSize = size + 8;
  const center = svgSize / 2 - 1;

  return (
    <div className="relative flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
      <PieChart width={svgSize} height={svgSize}>
        <Pie
          data={data}
          cx={center}
          cy={center}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={level.chartColor} />
          <Cell fill="hsl(var(--muted) / 0.35)" />
        </Pie>
      </PieChart>
      <span className={`absolute font-bold text-foreground ${size >= 72 ? 'text-sm' : 'text-[10px]'}`}>
        {progress}%
      </span>
    </div>
  );
};

export default CompetencyDonut;
