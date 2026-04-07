import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Search, GraduationCap, RotateCcw, MoreHorizontal, Archive, Trash2, ChevronDown, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import KnowledgeCardModal from './KnowledgeCardModal';
import ReactMarkdown from 'react-markdown';

interface TrainingHistoryPanelProps {
  sessions: any[];
  agentCode: string;
  agentName: string;
  readOnly?: boolean;
  onRetrain?: (session: any) => void;
  onTest?: (session: any) => void;
  isLoading?: boolean;
}

const ConfidenceDots: React.FC<{ level?: string }> = ({ level }) => {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map(i => (
        <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i <= filled ? 'bg-emerald-500' : 'bg-muted-foreground/20')} />
      ))}
      <span className="text-[10px] text-muted-foreground ml-1 capitalize">{level || 'unknown'}</span>
    </span>
  );
};

const TrainingHistoryPanel: React.FC<TrainingHistoryPanelProps> = ({
  sessions,
  agentCode,
  agentName,
  readOnly = false,
  onRetrain,
  onTest,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState<string | null>(null);
  const [knowledgeModal, setKnowledgeModal] = useState<any>(null);
  const queryClient = useQueryClient();

  const domains = useMemo(() => {
    const unique = new Set(sessions.map(s => s.document_domain).filter(Boolean));
    return Array.from(unique);
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (search && !s.document_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (domainFilter !== 'all' && s.document_domain !== domainFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [sessions, search, domainFilter, statusFilter]);

  const handleArchive = async (sessionId: string) => {
    await supabase.from('agent_training_sessions').update({ status: 'archived' }).eq('id', sessionId);
    queryClient.invalidateQueries({ queryKey: ['agent-training-sessions', agentCode] });
    toast.success('Session archived');
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this training session permanently?')) return;
    await supabase.from('agent_training_sessions').delete().eq('id', sessionId);
    queryClient.invalidateQueries({ queryKey: ['agent-training-sessions', agentCode] });
    toast.success('Session deleted');
  };

  const getKnowledgeStats = (kc: any) => {
    if (!kc) return null;
    return {
      facts: kc.core_facts?.length || 0,
      procedures: kc.procedures?.length || 0,
      entities: kc.entities?.length || 0,
      rules: kc.decision_rules?.length || 0,
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by document name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Domain: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All domains</SelectItem>
              {domains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <GraduationCap className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No training sessions yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Open the Training Chat tab and upload a document to start building {agentName}'s knowledge base.
          </p>
        </div>
      )}

      {/* Session cards */}
      <div className="space-y-2">
        {filtered.map((session) => {
          const isExpanded = expandedId === session.id;
          const stats = getKnowledgeStats(session.knowledge_card);
          const isStale = session.stale_after && new Date(session.stale_after) < new Date();
          const hasContradictions = (session.contradiction_flags || []).length > 0;

          return (
            <div key={session.id} className="border border-border/40 rounded-xl overflow-hidden transition-colors hover:bg-muted/20">
              {/* Collapsed header */}
              <button
                className="w-full text-left p-4 flex items-start justify-between gap-3"
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.document_name || 'Training session'}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(session.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {[session.document_domain, session.document_type].filter(Boolean).join(' · ') || 'No metadata'}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {session.confidence_level && <ConfidenceDots level={session.confidence_level} />}
                      {stats && (
                        <span className="text-[10px] text-muted-foreground">
                          {stats.facts} facts · {stats.procedures} procedures
                        </span>
                      )}
                      {session.last_test_score != null && (
                        <span className="text-[10px] text-muted-foreground">
                          Test: {session.last_test_score}/100 ✓
                        </span>
                      )}
                      {isStale && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          Stale
                        </Badge>
                      )}
                      {hasContradictions && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-red-500/30 text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          Conflict
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!readOnly && (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onRetrain?.(session); }}>
                        <RotateCcw className="h-3 w-3" />
                        Retrain
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onTest?.(session); }}>
                        <GraduationCap className="h-3 w-3" />
                        Test
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleArchive(session.id)}>
                            <Archive className="h-3.5 w-3.5 mr-2" />Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(session.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border/30 space-y-4">
                  {/* Key learnings */}
                  {session.key_learnings && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Key Learnings</p>
                      <p className="text-xs text-foreground leading-relaxed">{session.key_learnings}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {session.extracted_tags?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {session.extracted_tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[9px] py-0 px-1.5">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Knowledge stats */}
                  {stats && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Extracted Knowledge</p>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => setKnowledgeModal(session)}>
                          View full <ExternalLink className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stats.facts} facts · {stats.procedures} procedures · {stats.entities} entities · {stats.rules} rules
                      </p>
                    </div>
                  )}

                  {/* Test history */}
                  {session.test_history?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Test History</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {session.test_history.map((t: any, i: number) => (
                          <span key={i} className="text-xs text-muted-foreground">
                            ● {t.tested_at ? format(new Date(t.tested_at), 'MMM d') : '—'}: {t.score}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transcript */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Training Session</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1"
                        onClick={() => setShowTranscript(showTranscript === session.id ? null : session.id)}
                      >
                        {(session.transcript || []).length} messages · {session.training_duration_seconds ? `${Math.round(session.training_duration_seconds / 60)} min` : '—'}
                        <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', showTranscript === session.id && 'rotate-180')} />
                      </Button>
                    </div>
                    {showTranscript === session.id && (
                      <div className="bg-muted/30 rounded-lg p-3 space-y-3 max-h-[300px] overflow-y-auto mt-2">
                        {(session.transcript || []).map((msg: any, i: number) => (
                          <div key={i} className={cn('text-xs', msg.role === 'user' ? 'text-foreground' : 'text-muted-foreground')}>
                            <span className="font-medium">{msg.role === 'user' ? 'You' : agentName}:</span>
                            <div className="mt-0.5 prose prose-xs dark:prose-invert max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Knowledge Card Modal */}
      <KnowledgeCardModal
        open={!!knowledgeModal}
        onOpenChange={(open) => !open && setKnowledgeModal(null)}
        session={knowledgeModal}
        agentName={agentName}
      />
    </div>
  );
};

export default TrainingHistoryPanel;
