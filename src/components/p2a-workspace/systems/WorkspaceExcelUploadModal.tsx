import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileSpreadsheet, X, Loader2, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { readExcelFile, writeExcelFile } from '@/utils/excelUtils';
import { P2ASystem } from '../hooks/useP2ASystems';

interface ParsedSystem {
  system_id: string;
  name: string;
  is_hydrocarbon: boolean;
  completion_percentage: number;
  target_rfsu_date?: string;
  punchlist_a_count?: number;
  punchlist_b_count?: number;
  itr_total_count?: number;
}

interface WorkspaceExcelUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSystems: (systems: Array<Omit<P2ASystem, 'id' | 'created_at' | 'updated_at' | 'assigned_handover_point_id' | 'assigned_vcr_code'>>) => void;
  handoverPlanId: string;
  isImporting?: boolean;
}

export const WorkspaceExcelUploadModal: React.FC<WorkspaceExcelUploadModalProps> = ({
  open,
  onOpenChange,
  onImportSystems,
  handoverPlanId,
  isImporting,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedSystems, setParsedSystems] = useState<ParsedSystem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;

    setFile(f);
    setIsParsingFile(true);
    setImportError(null);

    try {
      const data = await f.arrayBuffer();
      const { data: jsonData } = await readExcelFile(data);

      if (jsonData.length === 0) {
        setImportError('No data found in file');
        return;
      }

      const systems: ParsedSystem[] = jsonData.map((row: any, index) => ({
        system_id: row['System ID'] || row['system_id'] || row['ID'] || `SYS-${index + 1}`,
        name: row['System Name'] || row['Name'] || row['name'] || row['Description'] || 'Unknown System',
        is_hydrocarbon: Boolean(row['Hydrocarbon'] || row['HC'] || row['is_hydrocarbon']),
        completion_percentage: parseInt(row['Completion %'] || row['completion_percentage'] || row['Progress'] || '0', 10) || 0,
        target_rfsu_date: row['Target RFSU'] || row['target_rfsu_date'] || undefined,
        punchlist_a_count: parseInt(row['Punchlist A'] || row['PL-A'] || '0', 10) || 0,
        punchlist_b_count: parseInt(row['Punchlist B'] || row['PL-B'] || '0', 10) || 0,
        itr_total_count: parseInt(row['ITR Count'] || row['ITRs'] || '0', 10) || 0,
      }));

      setParsedSystems(systems);
    } catch (error) {
      setImportError('Failed to parse file. Please ensure it is a valid Excel file.');
      console.error('Excel parse error:', error);
    } finally {
      setIsParsingFile(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    const template = [
      {
        'System ID': 'N003-DP300-100',
        'System Name': 'Instrument Air System',
        'Hydrocarbon': 'No',
        'Completion %': 45,
        'Target RFSU': '2024-06-30',
        'Punchlist A': 5,
        'Punchlist B': 12,
        'ITR Count': 8,
      },
      {
        'System ID': 'N003-DP300-200',
        'System Name': 'Flare System',
        'Hydrocarbon': 'Yes',
        'Completion %': 80,
        'Target RFSU': '2024-05-15',
        'Punchlist A': 2,
        'Punchlist B': 5,
        'ITR Count': 3,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Systems');
    XLSX.writeFile(wb, 'systems_import_template.xlsx');
  };

  const handleImport = () => {
    const systems = parsedSystems.map(ps => ({
      handover_plan_id: handoverPlanId,
      system_id: ps.system_id,
      name: ps.name,
      is_hydrocarbon: ps.is_hydrocarbon,
      completion_status: 'NOT_STARTED' as const,
      completion_percentage: ps.completion_percentage || 0,
      target_rfsu_date: ps.target_rfsu_date,
      source_type: 'EXCEL_IMPORT' as const,
      punchlist_a_count: ps.punchlist_a_count || 0,
      punchlist_b_count: ps.punchlist_b_count || 0,
      itr_a_count: 0,
      itr_b_count: 0,
      itr_total_count: ps.itr_total_count || 0,
    }));
    
    onImportSystems(systems);
    resetAndClose();
  };

  const resetAndClose = () => {
    setFile(null);
    setParsedSystems([]);
    setImportError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Upload className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle>Upload Excel</DialogTitle>
              <DialogDescription>
                Import systems from an Excel spreadsheet
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 text-xs">
              <Download className="w-3.5 h-3.5" />
              Download Template
            </Button>
          </div>

          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              {isParsingFile ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Parsing file...</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-sm text-primary">Drop the file here...</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Drag & drop a file here</p>
                      <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-3">Supports .xlsx, .xls, .csv</p>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-green-100 dark:bg-green-900/30">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => { setFile(null); setParsedSystems([]); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {importError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {importError}
            </div>
          )}

          {parsedSystems.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {parsedSystems.length} systems ready to import
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {parsedSystems.slice(0, 5).map((sys, idx) => (
                    <div key={idx} className="text-xs flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <span className="font-mono">{sys.system_id}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{sys.name}</span>
                    </div>
                  ))}
                  {parsedSystems.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      ... and {parsedSystems.length - 5} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={parsedSystems.length === 0 || isImporting}
          >
            {isImporting ? 'Importing...' : `Import ${parsedSystems.length} Systems`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
