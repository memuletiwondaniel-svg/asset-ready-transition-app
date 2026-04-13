import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { getLevelFromProgress } from './competencyLevels';

interface CompetencyDonutProps {
  progress: number;
  size?: 48 | 64;
}

const CompetencyDonut: React.FC<CompetencyDonutProps> = ({ progress, size = 48 }) => {
  const level = getLevelFromProgress(progress);
  const data = [
    { value: progress },
    { value: 100 - progress },
  ];

  const outerRadius = size / 2 - 2;
  const innerRadius = outerRadius - (size === 64 ? 7 : 5);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          cx={size / 2 - 1}
          cy={size / 2 - 1}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={level.chartColor} />
          <Cell fill="hsl(var(--muted) / 0.5)" />
        </Pie>
      </PieChart>
      <span className="absolute text-[10px] font-bold text-foreground">
        {progress}%
      </span>
    </div>
  );
};

export default CompetencyDonut;
