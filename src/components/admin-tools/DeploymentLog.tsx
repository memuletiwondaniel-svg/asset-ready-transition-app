import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Rocket, Plus, Clock, CheckCircle2, AlertTriangle, FileText, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DeploymentLogProps {
  onBack: () => void;
}

const DeploymentLog: React.FC<DeploymentLogProps> = ({ onBack }) => {
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  const queryClient = useQueryClient();

  const { data: deployments = [], isLoading } = useQuery({
    queryKey: ['deployment-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deployment_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch checklist items for pre-publish
  const { data: checklistItems = [] } = useQuery({
    queryKey: ['publish-checklist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publish_checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const requiredItems = checklistItems.filter(i => i.is_required);
  const allRequiredChecked = requiredItems.every(i => checkedItems.has(i.id));

  const logDeploymentMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const changes = changesSummary
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(text => ({ text }));

      const { error } = await supabase
        .from('deployment_log')
        .insert({
          version_label: versionLabel || `v${format(new Date(), 'yyyy.MM.dd.HHmm')}`,
          release_notes: releaseNotes,
          environment: 'production',
          deployed_by: user.id,
          deployed_by_name: profile?.full_name || user.email,
          status: 'success',
          changes_summary: changes,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deployment logged successfully');
      setShowLogDialog(false);
      setVersionLabel('');
      setReleaseNotes('');
      setChangesSummary('');
      setCheckedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ['deployment-log'] });
    },
    onError: (err: any) => toast.error('Failed to log deployment', { description: err.message }),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Deployment Log</h1>
              <p className="text-sm text-muted-foreground">Track releases, write notes, and verify before publishing</p>
            </div>
          </div>
          <Button onClick={() => setShowLogDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Deployment
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* How it works */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-foreground">Your Change Management Workflow</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li><strong>Build</strong> — Make changes in Lovable chat</li>
                  <li><strong>Test</strong> — Verify on the Preview URL (auto-updates)</li>
                  <li><strong>Log</strong> — Click "Log Deployment" above, complete the checklist, add release notes</li>
                  <li><strong>Publish</strong> — Click Publish (top-right) → Update to push to production</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deployment History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Release History</CardTitle>
            <CardDescription>{deployments.length} deployments recorded</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : deployments.length === 0 ? (
              <div className="text-center py-12">
                <Rocket className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No deployments logged yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Log Deployment" before publishing to start tracking</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deployments.map((dep, idx) => (
                  <div key={dep.id} className="relative pl-8 pb-4">
                    {/* Timeline line */}
                    {idx < deployments.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                    )}
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1">
                      {getStatusIcon(dep.status)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {dep.version_label || 'unversioned'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(dep.created_at), 'PPp')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          by {dep.deployed_by_name || 'Unknown'}
                        </span>
                      </div>

                      {dep.release_notes && (
                        <p className="text-sm text-foreground">{dep.release_notes}</p>
                      )}

                      {Array.isArray(dep.changes_summary) && dep.changes_summary.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                          {(dep.changes_summary as any[]).map((c: any, i: number) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                              {c.text || JSON.stringify(c)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log Deployment Dialog with Pre-Publish Checklist */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Pre-Publish Checklist & Release Log
            </DialogTitle>
            <DialogDescription>
              Complete the checklist and add release notes before publishing to production.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Checklist */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Verification Checklist</h3>
              {checklistItems.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checkedItems.has(item.id)
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checkedItems.has(item.id)}
                    onChange={() => toggleCheck(item.id)}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {item.label}
                      {item.is_required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Version Label */}
            <div>
              <label className="text-sm font-medium">Version Label</label>
              <Input
                placeholder={`v${format(new Date(), 'yyyy.MM.dd.HHmm')}`}
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
              />
            </div>

            {/* Release Notes */}
            <div>
              <label className="text-sm font-medium">Release Notes <span className="text-destructive">*</span></label>
              <Textarea
                placeholder="Brief description of what changed in this release..."
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Changes Summary */}
            <div>
              <label className="text-sm font-medium">Changes (one per line)</label>
              <Textarea
                placeholder={"Fixed PSSR approval workflow\nAdded new ORA plan template\nUpdated user management permissions"}
                value={changesSummary}
                onChange={(e) => setChangesSummary(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>Cancel</Button>
            <Button
              onClick={() => logDeploymentMutation.mutate()}
              disabled={!allRequiredChecked || !releaseNotes.trim() || logDeploymentMutation.isPending}
            >
              {logDeploymentMutation.isPending ? 'Logging...' : 'Log & Publish'}
            </Button>
          </DialogFooter>

          {!allRequiredChecked && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Complete all required (*) checklist items before logging
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeploymentLog;
