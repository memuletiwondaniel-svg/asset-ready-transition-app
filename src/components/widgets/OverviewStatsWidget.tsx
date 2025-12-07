import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, CheckCircle, Clock, Link2, ChevronDown, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LinkedPSSR {
  id: string;
  title: string;
  status: string;
  progress: number;
  relationship: string;
}

interface OverviewStatsWidgetProps {
  linkedPSSRs?: LinkedPSSR[];
  onPSSRClick?: (pssrId: string) => void;
}

export const OverviewStatsWidget: React.FC<OverviewStatsWidgetProps> = ({
  linkedPSSRs = [],
  onPSSRClick
}) => {
  const [linkedExpanded, setLinkedExpanded] = useState(false);

  const stats = [
    {
      id: 'active',
      label: 'Active PSSRs',
      value: 12,
      icon: ClipboardList,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/20'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: 28,
      icon: CheckCircle,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-500/10 to-green-600/5',
      border: 'border-green-500/20'
    },
    {
      id: 'pending',
      label: 'Pending',
      value: 5,
      icon: Clock,
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-500/10 to-orange-600/5',
      border: 'border-orange-500/20'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'in progress':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };


  return (
    <Card className="glass-card glass-card-hover overflow-hidden">
      <CardHeader className="border-b border-border/40 py-3">
        <CardTitle className="text-lg font-bold">Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${stat.bgGradient} border ${stat.border}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Linked PSSRs Section */}
        {linkedPSSRs.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/40">
            <div 
              className="flex items-center gap-2 py-2 cursor-pointer hover:bg-accent/5 transition-colors rounded-sm"
              onClick={() => setLinkedExpanded(!linkedExpanded)}
            >
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium flex-1">Linked PSSRs</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {linkedPSSRs.length}
              </Badge>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                linkedExpanded ? '' : '-rotate-90'
              }`} />
            </div>

            {/* Expanded list */}
            {linkedExpanded && (
              <div className="space-y-1 mt-2">
                {linkedPSSRs.map((pssr) => (
                  <div 
                    key={pssr.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => onPSSRClick?.(pssr.id)}
                  >
                    <span className="text-xs font-medium text-primary">{pssr.id}</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground truncate flex-1">{pssr.relationship}</span>
                    <span className="text-[10px] text-muted-foreground">{pssr.progress}%</span>
                    {getStatusIcon(pssr.status)}
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
