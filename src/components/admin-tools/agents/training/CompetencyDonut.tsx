import React from 'react';
import { getLevelFromProgress } from './competencyLevels';

interface CompetencyDonutProps {
  progress: number;
  size?: 48 | 64 | 72 | 80;
}

const CompetencyDonut: React.FC<CompetencyDonutProps> = ({ progress, size = 48 }) => {
  const level = getLevelFromProgress(progress);
  const strokeWidth = size >= 80 ? 7 : size >= 72 ? 6 : size === 64 ? 5 : 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted) / 0.3)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={level.chartColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={`absolute font-semibold text-foreground ${size >= 72 ? 'text-sm' : 'text-[10px]'}`}>
        {progress}%
      </span>
    </div>
  );
};

export default CompetencyDonut;
