import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wrench, 
  Gauge, 
  Flame, 
  Zap, 
  HardHat, 
  FileCheck, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useDisciplines } from '@/hooks/useDisciplines';
import { usePSSRChecklistResponses } from '@/hooks/usePSSRChecklistResponses';

interface SOFCommentsPanelProps {
  pssrId: string;
}

// Mapping disciplines to icons
const disciplineIcons: Record<string, React.ReactNode> = {
  'PACO': <Wrench className="h-4 w-4" />,
  'Mechanical': <Gauge className="h-4 w-4" />,
  'Mech': <Gauge className="h-4 w-4" />,
  'Process': <Flame className="h-4 w-4" />,
  'Electrical': <Zap className="h-4 w-4" />,
  'Elect': <Zap className="h-4 w-4" />,
  'Civil': <HardHat className="h-4 w-4" />,
  'Documentation': <FileCheck className="h-4 w-4" />,
  'Organization': <Users className="h-4 w-4" />,
};

const getDisciplineIcon = (name: string) => {
  // Check for partial matches
  for (const [key, icon] of Object.entries(disciplineIcons)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return <MessageSquare className="h-4 w-4" />;
};

interface DisciplineSummary {
  name: string;
  totalItems: number;
  completedItems: number;
  narratives: string[];
  status: 'completed' | 'in_progress' | 'not_started';
}

export const SOFCommentsPanel: React.FC<SOFCommentsPanelProps> = ({ pssrId }) => {
  const { disciplines, isLoading: disciplinesLoading } = useDisciplines();
  const { responses, checklistItems, isLoading: responsesLoading } = usePSSRChecklistResponses(pssrId);

  const isLoading = disciplinesLoading || responsesLoading;

  // Group responses by category/discipline and aggregate comments
  const disciplineSummaries: DisciplineSummary[] = React.useMemo(() => {
    if (!responses || !checklistItems) return [];

    // Map responses to their checklist items
    const responseMap = new Map<string, typeof responses[0]>();
    responses.forEach(r => responseMap.set(r.checklist_item_id, r));

    // Group by category (which often maps to discipline)
    const categoryGroups = new Map<string, {
      total: number;
      completed: number;
      narratives: string[];
    }>();

    checklistItems.forEach(item => {
      const category = item.category || 'General';
      const response = responseMap.get(item.unique_id || '');
      
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, { total: 0, completed: 0, narratives: [] });
      }
      
      const group = categoryGroups.get(category)!;
      group.total++;
      
      if (response) {
        if (response.status === 'SUBMITTED') {
          group.completed++;
        }
        if (response.narrative && response.narrative.trim()) {
          group.narratives.push(response.narrative);
        }
      }
    });

    // Convert to array
    return Array.from(categoryGroups.entries()).map(([name, data]) => ({
      name,
      totalItems: data.total,
      completedItems: data.completed,
      narratives: data.narratives,
      status: data.completed === data.total && data.total > 0
        ? 'completed' as const
        : data.completed > 0
          ? 'in_progress' as const
          : 'not_started' as const,
    }));
  }, [responses, checklistItems]);

  // Collect all interdisciplinary comments
  const interdisciplinaryNarratives = React.useMemo(() => {
    if (!responses) return [];
    return responses
      .filter(r => r.narrative && r.narrative.trim())
      .map(r => ({
        id: r.id,
        narrative: r.narrative!,
        response: r.response,
        itemId: r.checklist_item_id,
      }))
      .slice(0, 10); // Limit to 10 most recent
  }, [responses]);

  const getStatusBadge = (status: DisciplineSummary['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Complete
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
            <Clock className="h-3 w-3" />
            In Progress
          </Badge>
        );
      case 'not_started':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Not Started
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 pr-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold">Discipline Summary Comments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review comments and status by discipline before signing the SoF certificate.
          </p>
        </div>

        {/* Discipline Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {disciplineSummaries.map((discipline) => (
            <Card 
              key={discipline.name} 
              className={`transition-colors ${
                discipline.status === 'completed' 
                  ? 'border-green-500/30 bg-green-500/5' 
                  : discipline.status === 'in_progress'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${
                      discipline.status === 'completed' 
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                        : discipline.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {getDisciplineIcon(discipline.name)}
                    </div>
                    <CardTitle className="text-sm font-medium">
                      {discipline.name}
                    </CardTitle>
                  </div>
                  {getStatusBadge(discipline.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{discipline.completedItems}/{discipline.totalItems} items reviewed</span>
                  <span className="font-medium">
                    {discipline.totalItems > 0 
                      ? Math.round((discipline.completedItems / discipline.totalItems) * 100)
                      : 0}%
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      discipline.status === 'completed' 
                        ? 'bg-green-500' 
                        : 'bg-amber-500'
                    }`}
                    style={{ 
                      width: `${discipline.totalItems > 0 
                        ? (discipline.completedItems / discipline.totalItems) * 100 
                        : 0}%` 
                    }}
                  />
                </div>

                {/* Sample narratives */}
                {discipline.narratives.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      Recent Comments:
                    </p>
                    <div className="space-y-1.5">
                      {discipline.narratives.slice(0, 2).map((narrative, idx) => (
                        <p 
                          key={idx} 
                          className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/50 p-2 rounded"
                        >
                          "{narrative}"
                        </p>
                      ))}
                      {discipline.narratives.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{discipline.narratives.length - 2} more comments
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {discipline.narratives.length === 0 && discipline.completedItems > 0 && (
                  <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/50">
                    No specific comments recorded
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {disciplineSummaries.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No checklist items found for this PSSR.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Interdisciplinary Summary Section */}
        {interdisciplinaryNarratives.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Interdisciplinary Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Combined summary of key comments across all disciplines:
              </p>
              <div className="space-y-2">
                {interdisciplinaryNarratives.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30"
                  >
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {item.response || 'N/A'}
                    </Badge>
                    <p className="text-muted-foreground italic line-clamp-2">
                      {item.narrative}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
};

export default SOFCommentsPanel;
