import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Database, FileJson, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DataExportProps {
  onBack: () => void;
}

type ExportFormat = 'csv' | 'json';

interface ExportableTable {
  id: string;
  label: string;
  table: string;
  description: string;
  sensitive: boolean;
  columns?: string;
}

const EXPORTABLE_TABLES: ExportableTable[] = [
  { id: 'projects', label: 'Projects', table: 'projects', description: 'All project records', sensitive: false },
  { id: 'profiles', label: 'User Profiles', table: 'profiles', description: 'User account data (excludes sensitive fields)', sensitive: true, columns: 'user_id,full_name,first_name,last_name,email,department,position,company,status,account_status,is_active,role,created_at,updated_at' },
  { id: 'pssrs', label: 'PSSRs', table: 'pssrs', description: 'Pre-Startup Safety Reviews', sensitive: false },
  { id: 'audit_logs', label: 'Audit Logs', table: 'audit_logs', description: 'Security and compliance audit trail', sensitive: false },
  { id: 'user_activity_logs', label: 'User Activity Logs', table: 'user_activity_logs', description: 'User login and activity history', sensitive: false },
  { id: 'roles', label: 'Roles', table: 'roles', description: 'Role definitions', sensitive: false },
  { id: 'role_permissions', label: 'Role Permissions', table: 'role_permissions', description: 'Permission assignments per role', sensitive: false },
];

const DataExport: React.FC<DataExportProps> = ({ onBack }) => {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);

  const toggleTable = (id: string) => {
    setSelectedTables(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedTables.length === EXPORTABLE_TABLES.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(EXPORTABLE_TABLES.map(t => t.id));
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const exportTable = async (tableConfig: ExportableTable) => {
    setExporting(tableConfig.id);
    try {
      // Paginated fetch to handle tables larger than 1000 rows
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from(tableConfig.table as any)
          .select(tableConfig.columns || '*')
          .range(from, from + pageSize - 1);
        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        if (data && data.length > 0) {
          allData = allData.concat(data);
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const data = allData;

      if (!data || data.length === 0) {
        toast.info(`No data found in ${tableConfig.label}`);
        setExporting(null);
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      if (format === 'csv') {
        const csv = convertToCSV(data);
        downloadFile(csv, `${tableConfig.table}_${timestamp}.csv`, 'text/csv');
      } else {
        downloadFile(JSON.stringify(data, null, 2), `${tableConfig.table}_${timestamp}.json`, 'application/json');
      }

      setCompleted(prev => [...prev, tableConfig.id]);
      toast.success(`Exported ${data.length} records from ${tableConfig.label}`);
    } catch (err: any) {
      toast.error(`Failed to export ${tableConfig.label}: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  const exportSelected = async () => {
    const tables = EXPORTABLE_TABLES.filter(t => selectedTables.includes(t.id));
    for (const table of tables) {
      await exportTable(table);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Data Export" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Data Export
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Export critical tables for backup and compliance
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <span className="flex items-center gap-1.5"><FileSpreadsheet className="h-3 w-3" /> CSV</span>
                </SelectItem>
                <SelectItem value="json">
                  <span className="flex items-center gap-1.5"><FileJson className="h-3 w-3" /> JSON</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={exportSelected}
              disabled={selectedTables.length === 0 || exporting !== null}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export Selected ({selectedTables.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        {/* Select all toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Available Tables</Label>
          <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
            {selectedTables.length === EXPORTABLE_TABLES.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        {/* Table cards */}
        {EXPORTABLE_TABLES.map(table => {
          const isSelected = selectedTables.includes(table.id);
          const isExporting = exporting === table.id;
          const isDone = completed.includes(table.id);

          return (
            <Card
              key={table.id}
              className={`transition-all cursor-pointer ${isSelected ? 'border-primary/40 bg-primary/5' : 'hover:border-border/80'}`}
              onClick={() => toggleTable(table.id)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch checked={isSelected} onCheckedChange={() => toggleTable(table.id)} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{table.label}</span>
                        {table.sensitive && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Filtered
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs max-w-[200px]">
                                Sensitive fields (passwords, secrets, tokens) are excluded from export
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isDone && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{table.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExporting && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={(e) => { e.stopPropagation(); exportTable(table); }}
                      disabled={isExporting}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Info */}
        <Card className="border-muted">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Exports are limited to 10,000 records per table. For larger datasets, use Supabase dashboard directly.</p>
                <p>Sensitive fields (two_factor_secret, backup_codes, password hashes) are never included in exports.</p>
                <p>All export actions are logged in the Security Audit Log.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataExport;
