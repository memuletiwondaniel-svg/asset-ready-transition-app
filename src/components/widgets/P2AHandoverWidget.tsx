import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, ExternalLink, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';

interface P2AHandoverWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
}

export const P2AHandoverWidget: React.FC<P2AHandoverWidgetProps> = ({ projectId, dragAttributes, dragListeners, onHide }) => {
  const navigate = useNavigate();

  // Mock data - replace with actual data fetching
  const handovers = [
    { id: '1', name: 'System A Handover', status: 'pending-approval', deliverables: 5, completedDeliverables: 3 },
    { id: '2', name: 'System B Handover', status: 'in-progress', deliverables: 8, completedDeliverables: 2 }
  ];

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-blue-500/20 group">
      <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledWidgetIcon 
              Icon={Key}
              gradientFrom="from-blue-500"
              gradientTo="to-cyan-500"
              glowFrom="from-blue-500/40"
              glowTo="to-cyan-500/40"
            />
            <span>P2A Handover</span>
          </div>
          {onHide && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onHide();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
              title="Hide widget"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {handovers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-3">No handovers yet</p>
            <Button size="sm" onClick={() => navigate('/p2a')}>
              Create First Handover
            </Button>
          </div>
        ) : (
          handovers.map((handover) => (
            <div key={handover.id} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{handover.name}</span>
                <Badge variant="outline" className="text-xs">
                  {handover.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {handover.completedDeliverables}/{handover.deliverables} deliverables ready
              </div>
              <Button size="sm" variant="link" className="p-0 h-auto" onClick={() => navigate('/p2a')}>
                View Details <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
