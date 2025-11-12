import React from 'react';
import { useP2AAuditTrail } from '@/hooks/useP2AAuditTrail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, FileEdit, Upload, Trash2, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface P2AAuditTrailProps {
  handoverId: string;
}

export const P2AAuditTrail: React.FC<P2AAuditTrailProps> = ({ handoverId }) => {
  const { auditTrail, isLoading } = useP2AAuditTrail(handoverId);

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('UPDATE')) return FileEdit;
    if (actionType.includes('INSERT') || actionType.includes('CREATED')) return Upload;
    if (actionType.includes('DELETE')) return Trash2;
    if (actionType.includes('APPROVAL')) return CheckCircle;
    return Clock;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('UPDATE')) return 'text-blue-500';
    if (actionType.includes('INSERT') || actionType.includes('CREATED')) return 'text-green-500';
    if (actionType.includes('DELETE')) return 'text-red-500';
    if (actionType.includes('APPROVAL')) return 'text-purple-500';
    return 'text-gray-500';
  };

  const formatAction = (entry: any) => {
    const entityType = entry.entity_type.replace('p2a_', '').replace(/_/g, ' ');
    const actionType = entry.action_type.split('_')[0].toLowerCase();
    
    if (entry.description) return entry.description;
    return `${actionType} ${entityType}`;
  };

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail & Version History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {auditTrail && auditTrail.length > 0 ? (
            <div className="space-y-4">
              {auditTrail.map((entry) => {
                const Icon = getActionIcon(entry.action_type);
                const color = getActionColor(entry.action_type);
                
                return (
                  <div key={entry.id} className="flex gap-4 p-4 border border-border rounded-lg">
                    <div className={`p-2 rounded-lg bg-muted ${color} h-fit`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm">{formatAction(entry)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                      
                      {/* Show changes if available */}
                      {entry.old_values && entry.new_values && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                          {Object.keys(entry.new_values).map((key) => {
                            if (entry.old_values?.[key] !== entry.new_values?.[key] && 
                                !['id', 'created_at', 'updated_at'].includes(key)) {
                              return (
                                <div key={key} className="flex gap-2">
                                  <span className="font-semibold">{key}:</span>
                                  <span className="text-red-500 line-through">{String(entry.old_values[key])}</span>
                                  <span>→</span>
                                  <span className="text-green-500">{String(entry.new_values[key])}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No audit trail entries yet</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
