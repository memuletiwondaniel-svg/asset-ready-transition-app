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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Qualifications & Exceptions</h3>
            <p className="text-xs text-muted-foreground">
              Track items that cannot be fully satisfied before handover
            </p>
          </div>
        </div>

        {/* Empty state card */}
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">No Qualifications Raised</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed mb-6">
              All VCR prerequisites are on track. No exceptions or qualifications have been raised for this VCR so far.
            </p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>All items compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                <span>No exceptions pending</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info note */}
        <div className="rounded-lg bg-muted/50 border px-4 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">When are qualifications raised?</span> During VCR item review, if a delivering party determines that a prerequisite cannot be fully met before handover, they raise a qualification. This documents the gap, assigns an action owner, and sets a target resolution date. Approved qualifications allow conditional handover while tracking outstanding items.
          </p>
        </div>
      </div>
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
