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

  const outerRadius = size / 2 - 2;
  const ringWidth = size >= 80 ? 9 : size >= 72 ? 8 : size === 64 ? 7 : 5;
  const innerRadius = outerRadius - ringWidth;

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
      <span className={`absolute font-bold text-foreground ${size >= 72 ? 'text-sm' : 'text-[10px]'}`}>
        {progress}%
      </span>
    </div>
  );
};

export default CompetencyDonut;
