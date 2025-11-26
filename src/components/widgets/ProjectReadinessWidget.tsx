import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ProjectReadinessWidgetProps {
  projectId: string;
}

export const ProjectReadinessWidget: React.FC<ProjectReadinessWidgetProps> = ({ projectId }) => {
  // Mock data - replace with actual data fetching
  const readinessData = {
    overall: 75,
    categories: [
      { name: 'Documentation', progress: 80, status: 'on-track' },
      { name: 'Resources', progress: 70, status: 'on-track' },
      { name: 'Equipment', progress: 85, status: 'on-track' },
      { name: 'Safety', progress: 65, status: 'at-risk' }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'at-risk':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Project Overview & Readiness
          <Badge variant="outline" className="text-lg font-bold">
            {readinessData.overall}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {readinessData.categories.map((category) => (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(category.status)}
                  <span className="font-medium">{category.name}</span>
                </div>
                <span className="text-muted-foreground">{category.progress}%</span>
              </div>
              <Progress value={category.progress} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
