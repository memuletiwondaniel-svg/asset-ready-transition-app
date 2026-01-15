import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Flame, 
  Wrench, 
  Gauge, 
  Zap, 
  Users,
  ChevronDown,
  CheckCircle2,
  Clock,
  User,
  MessageSquare,
  Edit3,
  Save,
  X,
  HardHat,
  Heart
} from 'lucide-react';
import { useDisciplineComments } from '@/hooks/useDisciplineComments';

interface DisciplineSummariesPanelProps {
  pssrId: string;
}

const DISCIPLINE_ICONS: Record<string, any> = {
  'Tech Safety': Shield,
  'Process': Flame,
  'PACO': Wrench,
  'Mechanical': Gauge,
  'Electrical': Zap,
  'Civil': HardHat,
  'Operations': Users,
  'HSE': Heart,
};

// Disciplines that can add/edit comments after completion
const COMMENTABLE_DISCIPLINES = ['Operations', 'HSE', 'Civil'];

export const DisciplineSummariesPanel: React.FC<DisciplineSummariesPanelProps> = ({ pssrId }) => {
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set(['interdisciplinary']));
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');

  const { updateDisciplineComment } = useDisciplineComments(pssrId);

  // Fetch discipline reviews from database
  const { data: disciplineReviews, isLoading } = useQuery({
    queryKey: ['pssr-discipline-reviews', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_discipline_reviews')
        .select(`
          *,
          profiles:reviewer_user_id(full_name)
        `)
        .eq('pssr_id', pssrId)
        .order('discipline_role', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  // Fetch interdisciplinary summary (from a specific field or aggregated)
  const { data: interdisciplinarySummary } = useQuery({
    queryKey: ['pssr-interdisciplinary', pssrId],
    queryFn: async () => {
      // Check if there's a dedicated interdisciplinary review
      const { data } = await supabase
        .from('pssr_discipline_reviews')
        .select(`
          *,
          profiles:reviewer_user_id(full_name)
        `)
        .eq('pssr_id', pssrId)
        .eq('discipline_role', 'Interdisciplinary')
        .single();
      
      return data;
    },
    enabled: !!pssrId,
  });

  const toggleDiscipline = (id: string) => {
    setExpandedDisciplines(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStartEdit = (reviewId: string, currentComment: string | null) => {
    setEditingReviewId(reviewId);
    setEditComment(currentComment || '');
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditComment('');
  };

  const handleSaveComment = async (reviewId: string) => {
    await updateDisciplineComment.mutateAsync({
      reviewId,
      comment: editComment,
    });
    setEditingReviewId(null);
    setEditComment('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Complete</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const canEditComment = (disciplineRole: string, status: string) => {
    return COMMENTABLE_DISCIPLINES.includes(disciplineRole) && status === 'completed';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Loading discipline summaries...</p>
        </CardContent>
      </Card>
    );
  }

  const completedReviews = disciplineReviews?.filter(r => r.status === 'completed') || [];

  return (
    <div className="space-y-4">
      {/* Interdisciplinary Summary - Prominent Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Interdisciplinary Summary</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cross-functional review summary
                </p>
              </div>
            </div>
            {interdisciplinarySummary ? (
              getStatusBadge(interdisciplinarySummary.status)
            ) : (
              <Badge variant="secondary">Aggregated</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {interdisciplinarySummary?.discipline_comment ? (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {interdisciplinarySummary.discipline_comment}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              All discipline reviews have been completed. {completedReviews.length} disciplines 
              confirmed readiness for startup with no outstanding interdisciplinary conflicts or dependencies.
            </p>
          )}
          
          {interdisciplinarySummary && (
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3 mt-3">
              <span className="font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                {(interdisciplinarySummary.profiles as any)?.full_name || 'Reviewer'}
              </span>
              {interdisciplinarySummary.completed_at && (
                <span>{new Date(interdisciplinarySummary.completed_at).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discipline Reviews */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Discipline Reviews
            </CardTitle>
            <Badge variant="secondary">
              {completedReviews.length} / {(disciplineReviews?.length || 0)} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3">
              {disciplineReviews?.map((review) => {
                const Icon = DISCIPLINE_ICONS[review.discipline_role] || Shield;
                const isExpanded = expandedDisciplines.has(review.id);
                const isEditing = editingReviewId === review.id;
                const showEditButton = canEditComment(review.discipline_role, review.status);
                
                return (
                  <Collapsible
                    key={review.id}
                    open={isExpanded}
                    onOpenChange={() => toggleDiscipline(review.id)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm flex-1 text-left">
                          {review.discipline_role}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {review.items_reviewed}/{review.items_total} items
                          </span>
                          {getStatusBadge(review.status)}
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`} />
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-4 py-3 border-t bg-muted/30">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <MessageSquare className="h-4 w-4" />
                                Edit Discipline Comment
                              </div>
                              <Textarea
                                value={editComment}
                                onChange={(e) => setEditComment(e.target.value)}
                                placeholder="Add your discipline-specific comments..."
                                rows={4}
                                className="resize-none"
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  disabled={updateDisciplineComment.isPending}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveComment(review.id)}
                                  disabled={updateDisciplineComment.isPending}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  {updateDisciplineComment.isPending ? 'Saving...' : 'Save Comment'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {review.discipline_comment ? (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {review.discipline_comment}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">
                                  No summary comments provided.
                                </p>
                              )}
                              
                              {showEditButton && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(review.id, review.discipline_comment);
                                  }}
                                >
                                  <Edit3 className="h-4 w-4 mr-1" />
                                  {review.discipline_comment ? 'Edit Comment' : 'Add Comment'}
                                </Button>
                              )}
                              
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {(review.profiles as any)?.full_name || `${review.discipline_role} Reviewer`}
                                </span>
                                {review.completed_at && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(review.completed_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
              
              {(!disciplineReviews || disciplineReviews.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No discipline reviews recorded yet.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
