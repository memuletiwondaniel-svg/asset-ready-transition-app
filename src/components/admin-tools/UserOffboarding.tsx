import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Search, UserMinus, AlertTriangle, CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UserOffboardingProps {
  onBack: () => void;
}

const UserOffboarding: React.FC<UserOffboardingProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [offboardNotes, setOffboardNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['offboard-users', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, position, status, account_status, last_login_at, offboarded_at, stale_flagged_at')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .order('full_name')
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Stale accounts query
  const { data: staleAccounts = [] } = useQuery({
    queryKey: ['stale-accounts'],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, position, last_login_at, stale_flagged_at, status')
        .eq('status', 'active')
        .eq('is_active', true)
        .or(`last_login_at.is.null,last_login_at.lt.${ninetyDaysAgo.toISOString()}`)
        .order('last_login_at', { ascending: true, nullsFirst: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const offboardMutation = useMutation({
    mutationFn: async ({ userId, notes }: { userId: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('offboard_user', {
        target_user_id: userId,
        admin_user_id: user.id,
        p_notes: notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data?.user_name || 'User'} offboarded successfully`, {
        description: `${data?.cancelled_tasks || 0} tasks cancelled, ${data?.deactivated_keys || 0} API keys deactivated`,
      });
      setSelectedUser(null);
      setOffboardNotes('');
      queryClient.invalidateQueries({ queryKey: ['offboard-users'] });
      queryClient.invalidateQueries({ queryKey: ['stale-accounts'] });
    },
    onError: (error: any) => {
      toast.error('Offboarding failed', { description: error.message });
    },
  });

  const flagStaleMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('flag_stale_accounts', { days_threshold: 90 });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast.success(`${count} stale account(s) flagged for review`);
      queryClient.invalidateQueries({ queryKey: ['stale-accounts'] });
    },
  });

  const getStatusBadge = (user: any) => {
    if (user.offboarded_at) return <Badge variant="destructive">Offboarded</Badge>;
    if (user.stale_flagged_at) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Stale</Badge>;
    if (user.status === 'active') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
    if (user.status === 'suspended') return <Badge variant="destructive">Suspended</Badge>;
    return <Badge variant="outline">{user.status}</Badge>;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <UserMinus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">User Offboarding</h1>
            <p className="text-sm text-muted-foreground">Securely deactivate accounts and reassign responsibilities</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stale Accounts Alert */}
        {staleAccounts.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-lg">Stale Accounts Detected</CardTitle>
                  <Badge variant="outline" className="text-amber-600">{staleAccounts.length}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => flagStaleMutation.mutate()}
                  disabled={flagStaleMutation.isPending}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Flag All Stale
                </Button>
              </div>
              <CardDescription>Users who haven't logged in for 90+ days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {staleAccounts.slice(0, 10).map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last login: {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => { setSelectedUser(user); setShowConfirm(true); }}
                    >
                      Offboard
                    </Button>
                  </div>
                ))}
                {staleAccounts.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{staleAccounts.length - 10} more stale accounts
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Offboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search User to Offboard</CardTitle>
            <CardDescription>Search by name or email, then initiate the offboarding process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading && <p className="text-sm text-muted-foreground">Searching...</p>}

            {users.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUser?.user_id === user.user_id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{user.full_name}</p>
                        {getStatusBadge(user)}
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email} · {user.position || 'No position'}</p>
                      <p className="text-xs text-muted-foreground">
                        Last login: {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    {!user.offboarded_at && user.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 ml-3"
                        onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setShowConfirm(true); }}
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Offboard
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offboarding Checklist */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Offboarding Actions</CardTitle>
            </div>
            <CardDescription>The following actions are performed automatically when a user is offboarded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { icon: XCircle, text: 'Account status set to suspended', color: 'text-red-500' },
                { icon: XCircle, text: 'Profile marked as inactive', color: 'text-red-500' },
                { icon: CheckCircle2, text: 'All pending tasks cancelled', color: 'text-amber-500' },
                { icon: CheckCircle2, text: 'API keys deactivated', color: 'text-amber-500' },
                { icon: XCircle, text: 'System roles removed', color: 'text-red-500' },
                { icon: CheckCircle2, text: 'Full audit trail recorded', color: 'text-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Offboard {selectedUser?.full_name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will permanently deactivate {selectedUser?.full_name}'s account. The following actions will be performed:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Account suspended and marked inactive</li>
                <li>All pending tasks cancelled</li>
                <li>API keys deactivated</li>
                <li>System roles removed</li>
              </ul>
              <div className="pt-2">
                <label className="text-sm font-medium text-foreground">Reason / Notes (optional)</label>
                <Textarea
                  placeholder="e.g., Employee left the company, contract ended..."
                  value={offboardNotes}
                  onChange={(e) => setOffboardNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOffboardNotes('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedUser) {
                  offboardMutation.mutate({ userId: selectedUser.user_id, notes: offboardNotes });
                  setShowConfirm(false);
                }
              }}
              disabled={offboardMutation.isPending}
            >
              {offboardMutation.isPending ? 'Offboarding...' : 'Confirm Offboard'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserOffboarding;
