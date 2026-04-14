import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Search, GraduationCap, RotateCcw, MoreHorizontal, Archive, Trash2, AlertTriangle, ExternalLink, Loader2, ShieldCheck, ShieldAlert, Pencil, Flag, Undo2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import KnowledgeCardModal, { type CorrectionEntry } from './KnowledgeCardModal';
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

// ─── Confidence dots + completeness score display ───
const ConfidenceDots: React.FC<{ level?: string; completenessScore?: number }> = ({ level, completenessScore }) => {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map(i => (
        <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i <= filled ? 'bg-emerald-500' : 'bg-muted-foreground/20')} />
      ))}
      <span className="text-[10px] text-muted-foreground ml-1 capitalize">{level || 'unknown'}</span>
      {completenessScore != null && completenessScore > 0 && (
        <span className="text-[10px] text-muted-foreground ml-1">· {completenessScore}/100</span>
      )}
    </span>
  );
};

// ─── Governance badges ───
const GovernanceBadges: React.FC<{ session: any }> = ({ session }) => {
  const badges: Array<{ label: string; color: string }> = [];
  const ks = session.knowledge_status;
  const corrections = session.correction_history || [];
  const contradictions = session.contradiction_flags || [];
  const isStale = session.stale_after && new Date(session.stale_after) < new Date();

  if (ks === 'flagged') {
    badges.push({ label: '⚠ Flagged', color: 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5' });
  }
  if (contradictions.length > 0) {
    badges.push({ label: '⚠ Conflict', color: 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5' });
  }
  if (corrections.length > 0) {
    badges.push({ label: `✏ Corrected (${corrections.length})`, color: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5' });
  }
  if (isStale) {
    badges.push({ label: '⚠ Stale', color: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5' });
  }
  if (ks === 'pending_review') {
    badges.push({ label: '○ Pending', color: 'border-muted-foreground/30 text-muted-foreground bg-muted/30' });
  }
  if (ks === 'verified') {
    badges.push({ label: '✓ Verified', color: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' });
  }

  if (badges.length === 0) return null;

  return (
    <>
      {badges.map((b, i) => (
        <Badge key={i} variant="outline" className={cn('text-[9px] py-0 px-1.5', b.color)}>
          {b.label}
        </Badge>
      ))}
    </>
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
  const [verificationModal, setVerificationModal] = useState<any>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const queryClient = useQueryClient();

  const domains = useMemo(() => {
    const unique = new Set(sessions.map(s => s.document_domain).filter(Boolean));
    return Array.from(unique);
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (search && !s.document_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (domainFilter !== 'all' && s.document_domain !== domainFilter) return false;
      if (statusFilter === 'all') return true;
      if (['pending_review', 'verified', 'flagged'].includes(statusFilter)) {
        return s.knowledge_status === statusFilter;
      }
      return s.status === statusFilter;
    });
  }, [sessions, search, domainFilter, statusFilter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agent-training-sessions', agentCode] });

  const handleArchive = async (sessionId: string) => {
    await supabase.from('agent_training_sessions').update({ status: 'archived' }).eq('id', sessionId);
    invalidate();
    toast.success('Session archived');
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this training session permanently?')) return;
    await supabase.from('agent_training_sessions').delete().eq('id', sessionId);
    invalidate();
    toast.success('Session deleted');
  };

  const handleVerify = async (sessionId: string) => {
    await supabase.from('agent_training_sessions')
      .update({ knowledge_status: 'verified' } as any)
      .eq('id', sessionId);
    invalidate();
    toast.success('Knowledge verified ✓');
  };

  const handleUnverify = async (sessionId: string) => {
    await supabase.from('agent_training_sessions')
      .update({ knowledge_status: 'pending_review' } as any)
      .eq('id', sessionId);
    invalidate();
    toast.success('Status reset to pending review');
  };

  const handleFlag = async (sessionId: string) => {
    if (!flagReason.trim()) return;
    const { data: current } = await supabase.from('agent_training_sessions')
      .select('contradiction_flags')
      .eq('id', sessionId)
      .single();

    const existingFlags = (current as any)?.contradiction_flags || [];
    const updatedFlags = [...existingFlags, {
      flagged_at: new Date().toISOString(),
      reason: flagReason.trim(),
      flagged_by: 'Admin',
    }];

    await supabase.from('agent_training_sessions')
      .update({ knowledge_status: 'flagged', contradiction_flags: updatedFlags } as any)
      .eq('id', sessionId);
    invalidate();
    setFlaggingId(null);
    setFlagReason('');
    toast.success('Session flagged for review');
  };

  const handleCorrection = async (sessionId: string, correction: CorrectionEntry, updatedKnowledgeCard: any) => {
    const { data: current } = await supabase.from('agent_training_sessions')
      .select('correction_history')
      .eq('id', sessionId)
      .single();

    const existingCorrections = (current as any)?.correction_history || [];

    await supabase.from('agent_training_sessions')
      .update({
        knowledge_card: updatedKnowledgeCard,
        correction_history: [...existingCorrections, correction],
        knowledge_status: 'pending_review',
      } as any)
      .eq('id', sessionId);
    invalidate();
    toast.success('Correction saved. Session marked for review.');
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
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="pending_review">○ Pending review</SelectItem>
              <SelectItem value="verified">✓ Verified</SelectItem>
              <SelectItem value="flagged">⚠ Flagged</SelectItem>
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
          const corrections: any[] = session.correction_history || [];
          const metaParts = [session.document_domain, session.document_type].filter(Boolean).join(' · ');

          return (
            <div
              key={session.id}
              className={cn(
                'border border-border/40 rounded-xl overflow-hidden transition-all duration-200 group',
                isExpanded
                  ? 'ring-1 ring-primary/20 bg-card shadow-sm'
                  : expandedId
                    ? 'opacity-50'
                    : 'opacity-100 hover:bg-muted/20'
              )}
            >
              {/* Collapsed header */}
              <button
                className="w-full text-left p-4 flex items-center gap-3"
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
              >
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {session.document_name || 'Training session'}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(session.created_at), 'MMM d, yyyy')}
                    </span>
                    {session.confidence_level && (
                      <ConfidenceDots level={session.confidence_level} completenessScore={session.completeness_score} />
                    )}
                    {stats && (
                      <span className="text-[10px] text-muted-foreground">
                        {stats.facts} facts · {stats.procedures} proc
                      </span>
                    )}
                    <GovernanceBadges session={session} />
                  </div>
                  {metaParts && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{metaParts}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!readOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { onRetrain?.(session); }}>
                          <RotateCcw className="h-3.5 w-3.5 mr-2" />Retrain
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { onTest?.(session); }}>
                          <GraduationCap className="h-3.5 w-3.5 mr-2" />Test
                        </DropdownMenuItem>
                        {session.knowledge_status === 'pending_review' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setVerificationModal(session)}>
                              <ShieldCheck className="h-3.5 w-3.5 mr-2" />View & Verify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFlaggingId(session.id)}>
                              <Flag className="h-3.5 w-3.5 mr-2" />Flag
                            </DropdownMenuItem>
                          </>
                        )}
                        {session.knowledge_status === 'verified' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUnverify(session.id)}>
                              <Undo2 className="h-3.5 w-3.5 mr-2" />Unverify
                            </DropdownMenuItem>
                          </>
                        )}
                        {session.knowledge_status === 'flagged' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUnverify(session.id)}>
                              <Undo2 className="h-3.5 w-3.5 mr-2" />Reset to pending
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleArchive(session.id)}>
                          <Archive className="h-3.5 w-3.5 mr-2" />Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(session.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border/30 space-y-4">
                  {/* Flagging textarea (triggered from dropdown) */}
                  {flaggingId === session.id && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-foreground">Reason for flagging:</p>
                      <Textarea
                        value={flagReason}
                        onChange={(e) => setFlagReason(e.target.value)}
                        className="text-xs min-h-[60px]"
                        placeholder="Describe the issue..."
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFlaggingId(null); setFlagReason(''); }}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleFlag(session.id)} disabled={!flagReason.trim()}>
                          Confirm Flag
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Pending review — text-only indicator */}
                  {session.knowledge_status === 'pending_review' && !readOnly && flaggingId !== session.id && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                      <span>Pending review — use ⋯ menu to verify or flag</span>
                    </div>
                  )}

                  {/* Flagged indicator — text-only */}
                  {session.knowledge_status === 'flagged' && !readOnly && (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Flagged — use ⋯ menu to reset</span>
                    </div>
                  )}

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

                  {/* Corrections audit trail */}
                  {corrections.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Corrections ({corrections.length})
                      </p>
                      <div className="border border-border/30 rounded-lg divide-y divide-border/20">
                        {corrections.map((c: any, i: number) => (
                          <div key={i} className="p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              <Pencil className="h-3 w-3 text-amber-500" />
                              <span className="text-[10px] text-muted-foreground">
                                {c.corrected_at ? format(new Date(c.corrected_at), 'MMM d') : '—'}
                                {' · '}{c.corrected_by || 'Unknown'}
                                {' · '}{(c.fact_type || '').replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-through pl-5">{c.original}</p>
                            <p className="text-xs text-foreground pl-5">{c.corrected}</p>
                          </div>
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

      {/* Knowledge Card Modal — read-only view */}
      <KnowledgeCardModal
        open={!!knowledgeModal}
        onOpenChange={(open) => !open && setKnowledgeModal(null)}
        session={knowledgeModal}
        agentName={agentName}
        canAdmin={!readOnly}
        onCorrection={(correction, updatedKC) => {
          if (knowledgeModal) {
            handleCorrection(knowledgeModal.id, correction, updatedKC);
            setKnowledgeModal({ ...knowledgeModal, knowledge_card: updatedKC });
          }
        }}
      />

      {/* Knowledge Card Modal — verification mode */}
      <KnowledgeCardModal
        open={!!verificationModal}
        onOpenChange={(open) => !open && setVerificationModal(null)}
        session={verificationModal}
        agentName={agentName}
        verificationMode={true}
        canAdmin={true}
        onVerify={() => {
          if (verificationModal) handleVerify(verificationModal.id);
        }}
        onCorrection={(correction, updatedKC) => {
          if (verificationModal) {
            handleCorrection(verificationModal.id, correction, updatedKC);
            setVerificationModal({ ...verificationModal, knowledge_card: updatedKC });
          }
        }}
      />
    </div>
  );
};

export default TrainingHistoryPanel;
