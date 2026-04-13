import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Pencil, Trash2, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLevelFromProgress, isNewCompetency } from './competencyLevels';
import type { CompetencyArea, CompetencyUpdate } from '@/hooks/useAgentCompetencies';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CompetencyDetailViewProps {
  competency: CompetencyArea;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdateDescription: (id: string, description: string) => Promise<void>;
  onTrain: () => void;
  isUpdating: boolean;
}

const CompetencyDetailView: React.FC<CompetencyDetailViewProps> = ({
  competency,
  onBack,
  onDelete,
  onUpdateDescription,
  onTrain,
  isUpdating,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(competency.description || '');
  const level = getLevelFromProgress(competency.progress);
  const isNew = isNewCompetency(competency.created_at);

  const { data: updates = [] } = useQuery({
    queryKey: ['competency-updates', competency.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_competency_updates' as any)
        .select('*')
        .eq('competency_id', competency.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CompetencyUpdate[];
    },
  });

  // Get linked sessions for training materials
  const { data: linkedSessions = [] } = useQuery({
    queryKey: ['linked-sessions', competency.linked_session_ids],
    queryFn: async () => {
      if (!competency.linked_session_ids?.length) return [];
      const { data, error } = await supabase
        .from('agent_training_sessions')
        .select('id, document_name, completed_at, created_at')
        .in('id', competency.linked_session_ids);
      if (error) throw error;
      return data || [];
    },
    enabled: (competency.linked_session_ids?.length || 0) > 0,
  });

  const handleSaveDescription = async () => {
    await onUpdateDescription(competency.id, editDescription);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border/40">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground truncate">{competency.name}</h3>
            {isNew && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary">New</Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setIsEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(competency.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', level.color)} style={{ width: `${competency.progress}%` }} />
            </div>
            <span className="text-sm font-semibold text-foreground">{competency.progress}%</span>
            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">
              {level.label}
            </Badge>
          </div>
        </div>

        {/* Description / Edit */}
        {isEditing ? (
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Description</label>
            <Textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveDescription} disabled={isUpdating}>
                {isUpdating ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Reassessing...</> : 'Save & Reassess'}
              </Button>
            </div>
          </div>
        ) : competency.description ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{competency.description}</p>
        ) : null}

        {/* AI Assessment Notes */}
        {competency.ai_assessment_notes && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "{competency.ai_assessment_notes}"
            </p>
            {competency.last_assessed_at && (
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                — Self-assessed {format(new Date(competency.last_assessed_at), 'dd MMM yyyy')}
              </p>
            )}
          </div>
        )}

        {/* Training Sessions (from updates) */}
        {updates.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2">Training History</h4>
            <div className="space-y-1.5">
              {updates.map(update => (
                <div key={update.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-[10px]">{format(new Date(update.created_at), 'dd MMM')}</span>
                  <span className="flex-1 truncate">{update.assessment_notes || update.trigger_type}</span>
                  {update.previous_progress !== null && update.new_progress !== null && (
                    <span className={cn(
                      'text-[10px] font-medium',
                      update.new_progress > update.previous_progress ? 'text-emerald-600' : 'text-muted-foreground'
                    )}>
                      {update.new_progress > update.previous_progress ? '+' : ''}{update.new_progress - update.previous_progress}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked Training Materials */}
        {linkedSessions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-2">Training Materials</h4>
            <div className="space-y-1">
              {linkedSessions.map((session: any) => (
                <div key={session.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3 shrink-0" />
                  <span className="truncate">{session.document_name || 'Unnamed session'}</span>
                  {session.completed_at && (
                    <span className="text-[10px] shrink-0">{format(new Date(session.completed_at), 'dd MMM yyyy')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-border/40">
        <Button size="sm" className="w-full h-8 text-xs gap-1.5" onClick={onTrain}>
          <BookOpen className="h-3.5 w-3.5" />
          {competency.progress > 0 ? 'Continue Training' : 'Start Training'}
        </Button>
      </div>
    </div>
  );
};

export default CompetencyDetailView;
