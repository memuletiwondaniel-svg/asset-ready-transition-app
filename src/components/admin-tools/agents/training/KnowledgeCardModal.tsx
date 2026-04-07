import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface KnowledgeCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  agentName: string;
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

const KnowledgeCardModal: React.FC<KnowledgeCardModalProps> = ({ open, onOpenChange, session, agentName }) => {
  const [activeTab, setActiveTab] = useState('facts');
  const kc = session?.knowledge_card || {};
  const facts = kc.core_facts || [];
  const procedures = kc.procedures || [];
  const entities = kc.entities || [];
  const rules = kc.decision_rules || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
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
                      </tr>
                    </thead>
                    <tbody>
                      {facts.map((fact: any, i: number) => (
                        <tr key={i} className="border-b border-border/20 last:border-0">
                          <td className="p-2.5 text-foreground">{fact.statement}</td>
                          <td className="p-2.5"><ConfidenceBadge level={fact.confidence} /></td>
                          <td className="p-2.5">
                            <div className="flex flex-wrap gap-1">
                              {(fact.tags || []).map((t: string, j: number) => (
                                <Badge key={j} variant="outline" className="text-[9px] py-0 px-1">{t}</Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="procedures" className="m-0 space-y-3">
              {procedures.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No procedures extracted.</p>
              ) : (
                procedures.map((proc: any, i: number) => (
                  <Card key={i} className="border-border/40">
                    <CardContent className="p-4">
                      <h4 className="text-xs font-semibold text-foreground mb-2">{proc.name}</h4>
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

            <TabsContent value="entities" className="m-0">
              {entities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No entities extracted.</p>
              ) : (
                <div className="space-y-3">
                  {entities.map((ent: any, i: number) => (
                    <div key={i} className="flex gap-4 py-2 border-b border-border/20 last:border-0">
                      <div className="w-1/3 shrink-0">
                        <span className="text-xs font-semibold text-foreground">{ent.term}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">{ent.definition}</p>
                        {ent.related_terms?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ent.related_terms.map((rt: string, j: number) => (
                              <Badge key={j} variant="secondary" className="text-[9px] py-0 px-1">{rt}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

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
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule: any, i: number) => (
                        <tr key={i} className="border-b border-border/20 last:border-0">
                          <td className="p-2.5 text-foreground">{rule.condition}</td>
                          <td className="p-2.5 text-foreground">{rule.action}</td>
                          <td className="p-2.5"><PriorityBadge priority={rule.priority} /></td>
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
