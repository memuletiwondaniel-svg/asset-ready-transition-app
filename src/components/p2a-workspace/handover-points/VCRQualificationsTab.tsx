import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Clock, 
  XCircle,
  AlertTriangle,
  ChevronRight,
  User,
  Calendar
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRQualifications, VCRQualification, getQualificationStatusConfig } from '../hooks/useVCRQualifications';
import { QualificationDetailSheet } from './QualificationDetailSheet';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VCRQualificationsTabProps {
  handoverPoint: P2AHandoverPoint;
}

const getStatusIcon = (status: VCRQualification['status']) => {
  switch (status) {
    case 'APPROVED':
      return CheckCircle2;
    case 'REJECTED':
      return XCircle;
    case 'PENDING':
    default:
      return Clock;
  }
};

export const VCRQualificationsTab: React.FC<VCRQualificationsTabProps> = ({ handoverPoint }) => {
  const { qualifications, isLoading } = useVCRQualifications(handoverPoint.id);
  const [selectedQual, setSelectedQual] = useState<VCRQualification | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!qualifications.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No Qualifications</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            No qualifications have been raised for this VCR. 
            Qualifications are created when a checklist item cannot be completed as required.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by status for summary
  const statusCounts = qualifications.reduce((acc, qual) => {
    acc[qual.status] = (acc[qual.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([status, count]) => {
          const config = getQualificationStatusConfig(status as VCRQualification['status']);
          return (
            <Badge key={status} variant="outline" className="gap-1">
              <span className={cn("w-2 h-2 rounded-full", config.color)} />
              {config.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Qualifications List */}
      <div className="space-y-2">
        {qualifications.map((qual) => {
          const statusConfig = getQualificationStatusConfig(qual.status);
          const StatusIcon = getStatusIcon(qual.status);
          
          return (
            <Card 
              key={qual.id} 
              className="hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setSelectedQual(qual)}
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
                      <Badge className={cn("text-[10px]", statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                      {qual.prerequisite && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {qual.prerequisite.summary.slice(0, 30)}...
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      <span className="text-muted-foreground">Reason: </span>
                      {qual.reason}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {qual.action_owner_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{qual.action_owner_name}</span>
                        </div>
                      )}
                      {qual.target_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Target: {format(new Date(qual.target_date), 'dd MMM yyyy')}</span>
                        </div>
                      )}
                    </div>
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
      <QualificationDetailSheet
        qualification={selectedQual}
        open={!!selectedQual}
        onOpenChange={(open) => !open && setSelectedQual(null)}
      />
    </div>
  );
};
