import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StyledWidgetIconProps {
  Icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  glowFrom: string;
  glowTo: string;
}

export const StyledWidgetIcon: React.FC<StyledWidgetIconProps> = ({ 
  Icon, 
  gradientFrom, 
  gradientTo,
  glowFrom,
  glowTo 
}) => {
  return (
    <div className="relative w-12 h-12 group-hover:scale-110 transition-transform duration-300">
      {/* Icon glow effect */}
      <div className={`absolute -inset-1 bg-gradient-to-br ${glowFrom} ${glowTo} rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300`}></div>
      
      {/* Icon background layers */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-25 rounded-xl backdrop-blur-sm`}></div>
      <div className={`relative w-12 h-12 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-all duration-300`}>
        <Icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
      </div>
    </div>
  );
};
