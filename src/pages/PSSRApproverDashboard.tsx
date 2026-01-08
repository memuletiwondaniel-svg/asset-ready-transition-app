import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  ClipboardCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  FileText,
  Filter
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { OrshSidebar } from '@/components/OrshSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

const PSSRApproverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pendingPSSRs, isLoading } = usePSSRsAwaitingReview(user?.id);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'overdue'>('all');

  // Filter PSSRs
  const filteredPSSRs = pendingPSSRs?.filter(item => {
    const matchesSearch = !searchQuery || 
      item.pssr.pssr_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pssr.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pssr.asset?.toLowerCase().includes(searchQuery.toLowerCase());

    const daysPending = differenceInDays(new Date(), new Date(item.pendingSince));
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'new' && daysPending < 3) ||
      (statusFilter === 'overdue' && daysPending >= 7);

    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate summary stats
  const stats = {
    total: pendingPSSRs?.length || 0,
    new: pendingPSSRs?.filter(p => differenceInDays(new Date(), new Date(p.pendingSince)) < 3).length || 0,
    overdue: pendingPSSRs?.filter(p => differenceInDays(new Date(), new Date(p.pendingSince)) >= 7).length || 0,
  };

  const getPendingBadgeColor = (pendingSince: string) => {
    const days = differenceInDays(new Date(), new Date(pendingSince));
    if (days < 3) return 'bg-green-100 text-green-800 border-green-200';
    if (days < 7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const handleStartReview = (pssrId: string, approverRole: string) => {
    navigate(`/pssr/${pssrId}/review?role=${encodeURIComponent(approverRole)}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <OrshSidebar />
        <SidebarInset className="flex-1">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">My PSSR Reviews</h1>
                <p className="text-muted-foreground mt-1">
                  Review and approve checklist items for your discipline area
                </p>
              </div>
              <Badge variant="outline" className="w-fit px-4 py-2 text-sm">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Approver Dashboard
              </Badge>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pending</p>
                      <p className="text-3xl font-bold">{stats.total}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">New ({"<"} 3 days)</p>
                      <p className="text-3xl font-bold text-green-600">{stats.new}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue ({">"} 7 days)</p>
                      <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by PSSR ID, project, or asset..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="w-fit">
                    <TabsList>
                      <TabsTrigger value="all" className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        All
                      </TabsTrigger>
                      <TabsTrigger value="new" className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        New
                      </TabsTrigger>
                      <TabsTrigger value="overdue" className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Overdue
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            {/* PSSR List */}
            <div className="space-y-4">
              {isLoading ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="animate-pulse">Loading your pending reviews...</div>
                  </CardContent>
                </Card>
              ) : filteredPSSRs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' 
                        ? 'No PSSRs match your current filters.' 
                        : 'You have no pending PSSR reviews at this time.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredPSSRs.map((item) => {
                  const daysPending = differenceInDays(new Date(), new Date(item.pendingSince));
                  
                  return (
                    <Card 
                      key={`${item.pssr.id}-${item.approverRole}`} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleStartReview(item.pssr.id, item.approverRole)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* PSSR Info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{item.pssr.pssr_id}</h3>
                              <Badge variant="outline" className="text-xs">
                                {item.approverRole}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                {item.pssr.project_name || 'No Project'}
                              </span>
                              {item.pssr.asset && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {item.pssr.asset}
                                </span>
                              )}
                              {(item.pssr.cs_location || item.pssr.station) && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {item.pssr.cs_location || item.pssr.station}
                                </span>
                              )}
                            </div>

                            {item.pssr.scope && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                <span className="font-medium">Scope:</span> {item.pssr.scope}
                              </p>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-6">
                            {/* Items count */}
                            <div className="text-center">
                              <p className="text-2xl font-bold text-primary">{item.itemCount}</p>
                              <p className="text-xs text-muted-foreground">Items</p>
                            </div>

                            {/* Pending time */}
                            <div className="text-center">
                              <Badge className={`${getPendingBadgeColor(item.pendingSince)} border`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {daysPending === 0 
                                  ? 'Today' 
                                  : daysPending === 1 
                                    ? '1 day' 
                                    : `${daysPending} days`}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">Pending</p>
                            </div>

                            {/* Action button */}
                            <Button 
                              className="bg-primary hover:bg-primary/90"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartReview(item.pssr.id, item.approverRole);
                              }}
                            >
                              Start Review
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PSSRApproverDashboard;
