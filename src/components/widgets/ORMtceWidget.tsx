import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, ExternalLink, Database, Calendar, Shield, Boxes } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { cn } from '@/lib/utils';

interface ORMtceWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
}

// Key maintenance elements from ORA Plan
const MAINTENANCE_ELEMENTS = [
  {
    key: 'ARB',
    label: 'Asset Register Build',
    icon: Database,
    progress: 65,
    total: 1250,
    completed: 812,
    iconColor: 'text-blue-600',
    progressColor: 'bg-blue-500',
  },
  {
    key: 'PMS',
    label: 'PMs',
    icon: Calendar,
    progress: 42,
    total: 340,
    completed: 143,
    iconColor: 'text-purple-600',
    progressColor: 'bg-purple-500',
  },
  {
    key: 'IMS',
    label: 'IMS',
    icon: Shield,
    progress: 28,
    total: 85,
    completed: 24,
    iconColor: 'text-emerald-600',
    progressColor: 'bg-emerald-500',
  },
  {
    key: '2Y_SPARES',
    label: '2Y Operating Spares',
    icon: Boxes,
    progress: 15,
    total: 420,
    completed: 63,
    iconColor: 'text-rose-600',
    progressColor: 'bg-rose-500',
  },
];

export const ORMtceWidget: React.FC<ORMtceWidgetProps> = ({ projectId, dragAttributes, dragListeners, onHide }) => {
  const navigate = useNavigate();

  // Calculate overall progress
  const overallProgress = Math.round(
    MAINTENANCE_ELEMENTS.reduce((sum, el) => sum + el.progress, 0) / MAINTENANCE_ELEMENTS.length
  );

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-emerald-500/20 group">
      <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledWidgetIcon 
              Icon={Wrench}
              gradientFrom="from-emerald-500"
              gradientTo="to-teal-500"
              glowFrom="from-emerald-500/40"
              glowTo="to-teal-500/40"
            />
            <div className="flex flex-col">
              <span>OR Maintenance</span>
              <span className="text-xs font-normal text-muted-foreground">{overallProgress}% Complete</span>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate('/orm')}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {MAINTENANCE_ELEMENTS.map((element) => {
          const Icon = element.icon;
          return (
            <div
              key={element.key}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate('/orm')}
            >
              <div className={cn('w-7 h-7 rounded-md flex items-center justify-center bg-muted/50', element.iconColor)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground truncate">
                    {element.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {element.completed}/{element.total}
                  </span>
                </div>
                <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', element.progressColor)}
                    style={{ width: `${element.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-semibold text-foreground w-8 text-right">
                {element.progress}%
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
