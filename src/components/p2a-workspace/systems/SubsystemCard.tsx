import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AAssignedSubsystem } from '../hooks/useP2ASystems';
import { getVCRColor } from '../utils/vcrColors';

interface SubsystemCardProps {
  subsystem: P2AAssignedSubsystem;
  parentSystemName: string;
  isHydrocarbon?: boolean;
  onClick?: () => void;
}

export const SubsystemCard: React.FC<SubsystemCardProps> = ({
  subsystem,
  parentSystemName,
  isHydrocarbon = false,
  onClick,
}) => {
  const vcrColor = getVCRColor(subsystem.assigned_vcr_code);

  const cardStyle = vcrColor ? {
    backgroundColor: vcrColor.background,
    borderColor: vcrColor.border,
  } : undefined;

  return (
    <div
      data-system-id={subsystem.id}
      data-assigned-vcr-id={subsystem.assigned_handover_point_id}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-sm border',
          !vcrColor && 'border-border bg-card'
        )}
        style={{
          ...cardStyle,
          width: 'calc(140px * var(--ws-zoom, 1))',
        }}
        onClick={onClick}
      >
        <CardContent style={{ padding: 'calc(6px * var(--ws-zoom-y, 1)) calc(6px * var(--ws-zoom, 1))' }}>
          <div className="flex items-start" style={{ gap: 'calc(6px * var(--ws-zoom, 1))' }}>
            {isHydrocarbon ? (
              <div className="rounded flex items-center justify-center shrink-0 mt-0.5 bg-orange-500/10 text-orange-500"
                style={{ width: 'calc(16px * var(--ws-zoom, 1))', height: 'calc(16px * var(--ws-zoom-y, 1))' }}>
                <Flame style={{ width: 'calc(10px * var(--ws-zoom, 1))', height: 'calc(10px * var(--ws-zoom-y, 1))' }} />
              </div>
            ) : (
              <div className="shrink-0" style={{ width: 'calc(16px * var(--ws-zoom, 1))', height: 'calc(16px * var(--ws-zoom-y, 1))' }} />
            )}
            <div className="flex-1 min-w-0">
              <span className="font-medium truncate block leading-tight" style={{ fontSize: 'calc(10px * var(--ws-zoom-y, 1))' }}>
                {subsystem.name}
              </span>
              <div className="flex items-center justify-between gap-1 [*[data-hide-ids]_&]:hidden">
                <span className="text-muted-foreground font-mono truncate" style={{ fontSize: 'calc(8px * var(--ws-zoom-y, 1))' }}>
                  {subsystem.subsystem_id}
                </span>
                <span className="font-medium text-muted-foreground shrink-0" style={{ fontSize: 'calc(8px * var(--ws-zoom-y, 1))' }}>
                  {subsystem.completion_percentage}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
