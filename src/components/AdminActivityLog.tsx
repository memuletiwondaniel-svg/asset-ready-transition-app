import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, Filter, Download, Calendar, User, Activity, RefreshCw } from 'lucide-react';
import AdminHeader from './admin/AdminHeader';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { format } from 'date-fns';
import { getCurrentTranslations } from '@/utils/translations';

interface AdminActivityLogProps {
  onBack: () => void;
  selectedLanguage: string;
}

const AdminActivityLog: React.FC<AdminActivityLogProps> = ({ onBack, selectedLanguage }) => {
  const t = getCurrentTranslations(selectedLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const { data: logs, isLoading, refetch } = useActivityLogs({
    activityType: activityTypeFilter || undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined
  });

  const filteredLogs = logs?.filter(log => {
    // Apply search filter
    const matchesSearch = searchQuery.trim() === '' ||
      log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.activity_type.toLowerCase().includes(searchQuery.toLowerCase());

    // Apply quick filter for user/project activities
    let matchesQuickFilter = true;
    if (activityTypeFilter === 'user') {
      matchesQuickFilter = log.activity_type.includes('user_') || 
                           log.activity_type.includes('account_') || 
                           log.activity_type === 'login' || 
                           log.activity_type === 'logout' ||
                           log.activity_type === 'failed_login' ||
                           log.activity_type === 'status_changed';
    } else if (activityTypeFilter === 'project') {
      matchesQuickFilter = log.activity_type.includes('project_');
    } else if (activityTypeFilter && activityTypeFilter !== 'user' && activityTypeFilter !== 'project') {
      // Exact match for specific activity type from dropdown
      matchesQuickFilter = log.activity_type === activityTypeFilter;
    }

    return matchesSearch && matchesQuickFilter;
  }) || [];

  const activityTypes = Array.from(new Set(logs?.map(log => log.activity_type) || []));

  const getActivityBadgeColor = (type: string) => {
    const typeMap: Record<string, string> = {
      login: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      logout: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      user_created: 'bg-green-500/10 text-green-500 border-green-500/20',
      user_updated: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      user_deleted: 'bg-red-500/10 text-red-500 border-red-500/20',
      checklist_created: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      checklist_updated: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      project_created: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      project_updated: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      status_changed: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      account_approved: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
      account_rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      failed_login: 'bg-red-600/10 text-red-600 border-red-600/20'
    };
    return typeMap[type] || 'bg-muted text-muted-foreground border-border';
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Email', 'Activity Type', 'Description', 'IP Address'];
    const csvData = [
      headers.join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_name || 'N/A',
        log.user_email || 'N/A',
        log.activity_type,
        log.description || 'N/A',
        log.ip_address || 'N/A'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <AdminHeader selectedLanguage={selectedLanguage} onLanguageChange={() => {}} translations={t}>
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Tools
        </Button>
      </AdminHeader>

      <div className="border-t border-border/50" />

      <div className="container pt-8 pb-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              Activity Log
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor and audit all administrative actions across the platform
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, description, or activity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Activity Type Filter */}
              <div className="md:col-span-2">
                <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Activity Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Activity Types</SelectItem>
                    {activityTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant={activityTypeFilter === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivityTypeFilter('')}
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                All Activities
              </Button>
              <Button
                variant={activityTypeFilter === 'user' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivityTypeFilter('user')}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                User Activities
              </Button>
              <Button
                variant={activityTypeFilter === 'project' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivityTypeFilter('project')}
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                Project Activities
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Activity Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Loading activity logs...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No activity logs found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm">{format(new Date(log.created_at), 'MMM dd, yyyy')}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{log.user_name || 'Unknown'}</span>
                              <span className="text-xs text-muted-foreground">{log.user_email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getActivityBadgeColor(log.activity_type)} border`}>
                            {log.activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm line-clamp-2">{log.description || 'No description'}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ip_address || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminActivityLog;
