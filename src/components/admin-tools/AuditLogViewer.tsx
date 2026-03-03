import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Search, Shield, AlertTriangle, Info, ChevronLeft, ChevronRight, Clock, User, Filter, X, Download } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useAuditLogs, AuditLogRecord } from '@/hooks/useAuditLogs';
import { format } from 'date-fns';

interface AuditLogViewerProps {
  onBack: () => void;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'auth', label: 'Authentication' },
  { value: 'admin', label: 'Admin Actions' },
  { value: 'pssr', label: 'PSSR Workflow' },
  { value: 'sof', label: 'SoF Workflow' },
  { value: 'p2a', label: 'P2A / Handover' },
  { value: 'vcr', label: 'VCR Actions' },
  { value: 'system', label: 'System' },
];

const SEVERITIES = [
  { value: 'all', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

const PAGE_SIZE = 50;

const SeverityIcon: React.FC<{ severity: string }> = ({ severity }) => {
  switch (severity) {
    case 'critical':
      return <Shield className="h-3.5 w-3.5 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const variants: Record<string, string> = {
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    info: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${variants[severity] || variants.info}`}>
      {severity}
    </Badge>
  );
};

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const colors: Record<string, string> = {
    auth: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    admin: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    pssr: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    sof: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    p2a: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    vcr: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    system: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[category] || colors.system}`}>
      {category}
    </Badge>
  );
};

const AuditLogRow: React.FC<{ log: AuditLogRecord }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5">
          <SeverityIcon severity={log.severity} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground truncate max-w-[300px]">
              {log.description}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <CategoryBadge category={log.category} />
            <SeverityBadge severity={log.severity} />
            {log.entity_label && (
              <span className="text-[10px] text-muted-foreground">
                {log.entity_type}: {log.entity_label}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(new Date(log.timestamp), 'dd MMM yyyy HH:mm:ss')}
          </div>
          {log.user_name && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 justify-end">
              <User className="h-3 w-3" />
              {log.user_name}
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-3 ml-7 space-y-2 animate-fade-in">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
            <div><span className="text-muted-foreground">Action:</span> <span className="font-medium">{log.action}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span className="font-mono">{log.user_email || '—'}</span></div>
            {log.entity_id && (
              <div className="col-span-2"><span className="text-muted-foreground">Entity ID:</span> <span className="font-mono text-[10px]">{log.entity_id}</span></div>
            )}
          </div>
          {(log.old_values || log.new_values) && (
            <div className="flex gap-4">
              {log.old_values && (
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Before:</span>
                  <pre className="text-[10px] bg-destructive/5 rounded p-2 mt-0.5 overflow-x-auto border border-destructive/10">
                    {JSON.stringify(log.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {log.new_values && (
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground font-medium">After:</span>
                  <pre className="text-[10px] bg-emerald-500/5 rounded p-2 mt-0.5 overflow-x-auto border border-emerald-500/10">
                    {JSON.stringify(log.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useAuditLogs({
    category: category !== 'all' ? category : undefined,
    severity: severity !== 'all' ? severity : undefined,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = category !== 'all' || severity !== 'all' || dateFrom || dateTo || search;

  const clearFilters = () => {
    setCategory('all');
    setSeverity('all');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(0);
  };

  // Count by severity for summary
  const criticalCount = logs.filter(l => l.severity === 'critical').length;
  const warningCount = logs.filter(l => l.severity === 'warning').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Audit Logs" favoritePath="/admin-tools/audit-logs" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security Audit Logs
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {total} events tracked
                {criticalCount > 0 && <span className="text-destructive ml-2">• {criticalCount} critical</span>}
                {warningCount > 0 && <span className="text-amber-500 ml-2">• {warningCount} warnings</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-card/50 px-4 md:px-6 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={category} onValueChange={v => { setCategory(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={v => { setSeverity(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(0); }}
            className="w-[130px] h-8 text-xs"
            placeholder="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(0); }}
            className="w-[130px] h-8 text-xs"
            placeholder="To"
          />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Log List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No audit logs found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Audit events will appear here as they occur'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {logs.map(log => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-border bg-card/80 px-4 md:px-6 py-2 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-7 w-7"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
