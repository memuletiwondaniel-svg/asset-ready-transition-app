import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';

interface PSSRSummaryWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
}

export const PSSRSummaryWidget: React.FC<PSSRSummaryWidgetProps> = ({ projectId, dragAttributes, dragListeners }) => {
  const navigate = useNavigate();

  // Mock data - replace with actual data fetching
  const pssrs = [
    { id: '1', name: 'PSSR-2024-001', status: 'in-review', progress: 75 },
    { id: '2', name: 'PSSR-2024-002', status: 'draft', progress: 30 }
  ];

  const stats = {
    total: 2,
    completed: 0,
    inReview: 1,
    draft: 1
  };

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-red-500/20 group">
      <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing">
        <CardTitle className="text-lg flex items-center gap-3">
          <StyledWidgetIcon 
            Icon={AlertTriangle}
            gradientFrom="from-red-500"
            gradientTo="to-orange-500"
            glowFrom="from-red-500/40"
            glowTo="to-orange-500/40"
          />
          <span>PSSR / SoF</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-2 bg-blue-500/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.inReview}</div>
            <div className="text-xs text-muted-foreground">In Review</div>
          </div>
          <div className="text-center p-2 bg-amber-500/10 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
            <div className="text-xs text-muted-foreground">Draft</div>
          </div>
        </div>
        
        <div className="space-y-2">
          {pssrs.map((pssr) => (
            <div key={pssr.id} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{pssr.name}</span>
                <Badge variant="outline" className="text-xs">
                  {pssr.status}
                </Badge>
              </div>
              <Button size="sm" variant="link" className="p-0 h-auto" onClick={() => navigate('/pssr')}>
                View Details <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
