import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Pencil, X, Check, ShieldCheck } from 'lucide-react';

export interface CorrectionEntry {
  corrected_at: string;
  original: string;
  corrected: string;
  fact_type: 'core_fact' | 'procedure_step' | 'entity_definition' | 'decision_rule';
  corrected_by: string;
}

interface KnowledgeCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  agentName: string;
  verificationMode?: boolean;
  onVerify?: () => void;
  onCorrection?: (correction: CorrectionEntry, updatedKnowledgeCard: any) => void;
  canAdmin?: boolean;
}

const ConfidenceBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors: Record<string, string> = {
    high: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    low: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  };
  return (
    <Badge variant="outline" className={cn('text-[10px] py-0 px-1.5 capitalize', colors[level] || colors.medium)}>
      {level}
    </Badge>
  );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    high: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    medium: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  };
  return (
    <Badge variant="outline" className={cn('text-[10px] py-0 px-1.5 capitalize', colors[priority] || colors.medium)}>
      {priority}
    </Badge>
  );
};

// Inline correction editor component
const InlineCorrectionEditor: React.FC<{
  original: string;
  factType: CorrectionEntry['fact_type'];
  onSave: (corrected: string) => void;
  onCancel: () => void;
}> = ({ original, factType, onSave, onCancel }) => {
  const [correctedValue, setCorrectedValue] = useState(original);

  return (
    <div className="bg-muted/40 border border-border/60 rounded-lg p-3 space-y-2">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Correcting {factType.replace('_', ' ')}
      </p>
      <div className="bg-muted/60 rounded p-2">
        <p className="text-xs text-muted-foreground line-through">{original}</p>
      </div>
      <p className="text-[10px] text-muted-foreground">↓ Correct to:</p>
      <Textarea
        value={correctedValue}
        onChange={(e) => setCorrectedValue(e.target.value)}
        className="text-xs min-h-[60px]"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSave(correctedValue.trim())}
          disabled={!correctedValue.trim() || correctedValue.trim() === original}
        >
          <Check className="h-3 w-3 mr-1" /> Save Correction
        </Button>
      </div>
    </div>
  );
};

const KnowledgeCardModal: React.FC<KnowledgeCardModalProps> = ({
  open,
  onOpenChange,
  session,
  agentName,
  verificationMode = false,
  onVerify,
  onCorrection,
  canAdmin = false,
}) => {
  const [activeTab, setActiveTab] = useState('facts');
  const [editingItem, setEditingItem] = useState<{ index: number; type: CorrectionEntry['fact_type'] } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const kc = session?.knowledge_card || {};
  const facts = kc.core_facts || [];
  const procedures = kc.procedures || [];
  const entities = kc.entities || [];
  const rules = kc.decision_rules || [];

  const handleCorrection = (original: string, corrected: string, factType: CorrectionEntry['fact_type'], index: number) => {
    if (!onCorrection) return;

    // Deep clone knowledge card and update the specific item
    const updatedKC = JSON.parse(JSON.stringify(kc));
    switch (factType) {
      case 'core_fact':
        if (updatedKC.core_facts?.[index]) updatedKC.core_facts[index].statement = corrected;
        break;
      case 'procedure_step':
        if (updatedKC.procedures?.[index]) updatedKC.procedures[index].name = corrected;
        break;
      case 'entity_definition':
        if (updatedKC.entities?.[index]) updatedKC.entities[index].definition = corrected;
        break;
      case 'decision_rule':
        if (updatedKC.decision_rules?.[index]) updatedKC.decision_rules[index].action = corrected;
        break;
    }

    const correction: CorrectionEntry = {
      corrected_at: new Date().toISOString(),
      original,
      corrected,
      fact_type: factType,
      corrected_by: 'Admin', // Parent component should pass actual user
    };

    onCorrection(correction, updatedKC);
    setEditingItem(null);
  };

  const CorrectionButton: React.FC<{ index: number; type: CorrectionEntry['fact_type'] }> = ({ index, type }) => {
    if (!canAdmin || !onCorrection) return null;
    return (
      <button
        className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-accent/50 rounded transition-all"
        onClick={(e) => { e.stopPropagation(); setEditingItem({ index, type }); }}
        title="Correct this item"
      >
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setEditingItem(null); setConfirmed(false); } onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Verification banner */}
        {verificationMode && onVerify && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-2 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Pending verification</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review the knowledge card below before confirming accuracy.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(v === true)}
                />
                <span className="text-xs text-muted-foreground">
                  I have reviewed the extracted knowledge and confirm it is accurate
                </span>
              </label>
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={!confirmed}
                onClick={() => { onVerify(); onOpenChange(false); }}
              >
                <ShieldCheck className="h-3 w-3" /> Confirm Verification
              </Button>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Knowledge Card — {session?.document_name || 'Untitled'}
          </DialogTitle>
          <p className="text-[10px] text-muted-foreground">
            Extracted {session?.completed_at ? format(new Date(session.completed_at), 'MMM d, yyyy') : '—'} · {agentName}
            {' · '}{facts.length} facts · {procedures.length} procedures · {entities.length} entities · {rules.length} rules
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start bg-muted/50 p-1 shrink-0">
            <TabsTrigger value="facts" className="text-xs">Core Facts ({facts.length})</TabsTrigger>
            <TabsTrigger value="procedures" className="text-xs">Procedures ({procedures.length})</TabsTrigger>
            <TabsTrigger value="entities" className="text-xs">Entities ({entities.length})</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">Decision Rules ({rules.length})</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-2">
            {/* ─── Core Facts ─── */}
            <TabsContent value="facts" className="m-0">
              {facts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No core facts extracted.</p>
              ) : (
                <div className="border border-border/40 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/30">
                        <th className="text-left font-medium p-2.5">Statement</th>
                        <th className="text-left font-medium p-2.5 w-24">Confidence</th>
                        <th className="text-left font-medium p-2.5 w-32">Tags</th>
                        {canAdmin && <th className="w-8" />}
                      </tr>
                    </thead>
                    <tbody>
                      {facts.map((fact: any, i: number) => (
                        <tr key={i} className="border-b border-border/20 last:border-0 group/row">
                          <td className="p-2.5 text-foreground">
                            {editingItem?.index === i && editingItem?.type === 'core_fact' ? (
                              <InlineCorrectionEditor
                                original={fact.statement}
                                factType="core_fact"
                                onSave={(corrected) => handleCorrection(fact.statement, corrected, 'core_fact', i)}
                                onCancel={() => setEditingItem(null)}
                              />
                            ) : fact.statement}
                          </td>
                          <td className="p-2.5"><ConfidenceBadge level={fact.confidence} /></td>
                          <td className="p-2.5">
                            <div className="flex flex-wrap gap-1">
                              {(fact.tags || []).map((t: string, j: number) => (
                                <Badge key={j} variant="outline" className="text-[9px] py-0 px-1">{t}</Badge>
                              ))}
                            </div>
                          </td>
                          {canAdmin && (
                            <td className="p-2.5">
                              <CorrectionButton index={i} type="core_fact" />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ─── Procedures ─── */}
            <TabsContent value="procedures" className="m-0 space-y-3">
              {procedures.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No procedures extracted.</p>
              ) : (
                procedures.map((proc: any, i: number) => (
                  <Card key={i} className="border-border/40 group/row">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {editingItem?.index === i && editingItem?.type === 'procedure_step' ? (
                            <InlineCorrectionEditor
                              original={proc.name}
                              factType="procedure_step"
                              onSave={(corrected) => handleCorrection(proc.name, corrected, 'procedure_step', i)}
                              onCancel={() => setEditingItem(null)}
                            />
                          ) : (
                            <h4 className="text-xs font-semibold text-foreground mb-2">{proc.name}</h4>
                          )}
                        </div>
                        <CorrectionButton index={i} type="procedure_step" />
                      </div>
                      <ol className="list-decimal list-inside space-y-1">
                        {(proc.steps || []).map((step: string, j: number) => (
                          <li key={j} className="text-xs text-muted-foreground">{step}</li>
                        ))}
                      </ol>
                      {proc.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {proc.tags.map((t: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-[9px] py-0 px-1">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* ─── Entities ─── */}
            <TabsContent value="entities" className="m-0">
              {entities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No entities extracted.</p>
              ) : (
                <div className="space-y-3">
                  {entities.map((ent: any, i: number) => (
                    <div key={i} className="flex gap-4 py-2 border-b border-border/20 last:border-0 group/row">
                      <div className="w-1/3 shrink-0">
                        <span className="text-xs font-semibold text-foreground">{ent.term}</span>
                      </div>
                      <div className="flex-1">
                        {editingItem?.index === i && editingItem?.type === 'entity_definition' ? (
                          <InlineCorrectionEditor
                            original={ent.definition}
                            factType="entity_definition"
                            onSave={(corrected) => handleCorrection(ent.definition, corrected, 'entity_definition', i)}
                            onCancel={() => setEditingItem(null)}
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">{ent.definition}</p>
                        )}
                        {ent.related_terms?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ent.related_terms.map((rt: string, j: number) => (
                              <Badge key={j} variant="secondary" className="text-[9px] py-0 px-1">{rt}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <CorrectionButton index={i} type="entity_definition" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── Decision Rules ─── */}
            <TabsContent value="rules" className="m-0">
              {rules.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No decision rules extracted.</p>
              ) : (
                <div className="border border-border/40 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/30">
                        <th className="text-left font-medium p-2.5">IF (condition)</th>
                        <th className="text-left font-medium p-2.5">THEN (action)</th>
                        <th className="text-left font-medium p-2.5 w-24">Priority</th>
                        {canAdmin && <th className="w-8" />}
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule: any, i: number) => (
                        <tr key={i} className="border-b border-border/20 last:border-0 group/row">
                          <td className="p-2.5 text-foreground">{rule.condition}</td>
                          <td className="p-2.5 text-foreground">
                            {editingItem?.index === i && editingItem?.type === 'decision_rule' ? (
                              <InlineCorrectionEditor
                                original={rule.action}
                                factType="decision_rule"
                                onSave={(corrected) => handleCorrection(rule.action, corrected, 'decision_rule', i)}
                                onCancel={() => setEditingItem(null)}
                              />
                            ) : rule.action}
                          </td>
                          <td className="p-2.5"><PriorityBadge priority={rule.priority} /></td>
                          {canAdmin && (
                            <td className="p-2.5">
                              <CorrectionButton index={i} type="decision_rule" />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default KnowledgeCardModal;
