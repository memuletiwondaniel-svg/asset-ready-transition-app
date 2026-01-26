import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites, VCRPrerequisite, getPrerequisiteStatusConfig } from '../hooks/useVCRPrerequisites';
import { PrerequisiteDetailSheet } from './PrerequisiteDetailSheet';
import { cn } from '@/lib/utils';

interface VCRChecklistTabProps {
  handoverPoint: P2AHandoverPoint;
}

const getStatusIcon = (status: VCRPrerequisite['status']) => {
  switch (status) {
    case 'ACCEPTED':
    case 'QUALIFICATION_APPROVED':
      return CheckCircle2;
    case 'REJECTED':
      return XCircle;
    case 'IN_PROGRESS':
    case 'READY_FOR_REVIEW':
      return Clock;
    case 'QUALIFICATION_REQUESTED':
      return AlertTriangle;
    default:
      return FileCheck;
  }
};

export const VCRChecklistTab: React.FC<VCRChecklistTabProps> = ({ handoverPoint }) => {
  const { prerequisites, isLoading } = useVCRPrerequisites(handoverPoint.id);
  const [selectedPrereq, setSelectedPrereq] = useState<VCRPrerequisite | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (!prerequisites.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileCheck className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No Checklist Items</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            No prerequisites have been defined for this VCR yet. 
            Add items from the VCR template or create custom items.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by status for summary
  const statusCounts = prerequisites.reduce((acc, prereq) => {
    acc[prereq.status] = (acc[prereq.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([status, count]) => {
          const config = getPrerequisiteStatusConfig(status as VCRPrerequisite['status']);
          return (
            <Badge key={status} variant="outline" className="gap-1">
              <span className={cn("w-2 h-2 rounded-full", config.color)} />
              {config.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Prerequisites List */}
      <div className="space-y-2">
        {prerequisites.map((prereq, idx) => {
          const statusConfig = getPrerequisiteStatusConfig(prereq.status);
          const StatusIcon = getStatusIcon(prereq.status);
          
          return (
            <Card 
              key={prereq.id} 
              className="hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setSelectedPrereq(prereq)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    statusConfig.color + '/20'
                  )}>
                    <StatusIcon className={cn("w-4 h-4", statusConfig.textColor)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                      <Badge className={cn("text-[10px]", statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                      {prereq.evidence && prereq.evidence.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {prereq.evidence.length} file{prereq.evidence.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {prereq.summary}
                    </p>
                    
                    {(prereq.delivering_party_name || prereq.receiving_party_name) && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {prereq.delivering_party_name && (
                          <span>From: <span className="text-foreground">{prereq.delivering_party_name}</span></span>
                        )}
                        {prereq.delivering_party_name && prereq.receiving_party_name && (
                          <span className="text-muted-foreground">→</span>
                        )}
                        {prereq.receiving_party_name && (
                          <span>To: <span className="text-foreground">{prereq.receiving_party_name}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <PrerequisiteDetailSheet
        prerequisite={selectedPrereq}
        open={!!selectedPrereq}
        onOpenChange={(open) => !open && setSelectedPrereq(null)}
      />
    </div>
  );
};
