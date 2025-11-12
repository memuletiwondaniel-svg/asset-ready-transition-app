import React from 'react';
import { WidgetCard } from './WidgetCard';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link2, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LinkedPSSR {
  id: string;
  title: string;
  status: string;
  progress: number;
  relationship: string;
}

interface PSSRLinkedPSSRsWidgetProps {
  linkedPSSRs: LinkedPSSR[];
  onPSSRClick?: (pssrId: string) => void;
}

export const PSSRLinkedPSSRsWidget: React.FC<PSSRLinkedPSSRsWidgetProps> = ({
  linkedPSSRs,
  onPSSRClick
}) => {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'in progress':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  const getRelationshipBadge = (relationship: string) => {
    return (
      <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
        {relationship}
      </Badge>
    );
  };

  return (
    <WidgetCard title="Linked PSSRs" className="min-h-[400px] h-[400px]">
      <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-3">
        {linkedPSSRs.length === 0 ? (
          <div className="text-center py-8">
            <Link2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No linked PSSRs</p>
          </div>
        ) : (
          linkedPSSRs.map((pssr, index) => (
            <div
              key={index}
              className="group p-4 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-accent/5 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-foreground">{pssr.id}</h4>
                    {getRelationshipBadge(pssr.relationship)}
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{pssr.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onPSSRClick?.(pssr.id)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between">
                  {getStatusBadge(pssr.status)}
                  <span className="text-xs font-semibold text-primary">
                    {pssr.progress}%
                  </span>
                </div>
                <Progress value={pssr.progress} className="h-2" />
              </div>
            </div>
          ))
        )}
      </div>
    </WidgetCard>
  );
};
