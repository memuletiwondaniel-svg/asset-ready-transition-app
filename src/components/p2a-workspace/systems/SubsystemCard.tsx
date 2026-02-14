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

/**
 * A compact card for individually-mapped subsystems.
 * Displays in the systems panel when a subsystem (not the full parent)
 * is assigned to a VCR. Uses the VCR's color for visual linkage.
 */
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
        <CardContent className="p-1.5">
          <div className="flex items-start gap-1.5">
            {isHydrocarbon ? (
              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 bg-orange-500/10 text-orange-500">
                <Flame className="w-2.5 h-2.5" />
              </div>
            ) : (
              <div className="w-4 h-4 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              {/* Subsystem Name */}
              <span className="text-[10px] font-medium truncate block leading-tight">
                {subsystem.name}
              </span>

              {/* Subsystem ID + Progress */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] text-muted-foreground font-mono truncate">
                  {subsystem.subsystem_id}
                </span>
                <span className="text-[8px] font-medium text-muted-foreground shrink-0">
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
