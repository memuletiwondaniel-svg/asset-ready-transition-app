import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  FileSpreadsheet, 
  Plug2, 
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { readExcelFile, writeExcelFile } from '@/utils/excelUtils';
import { P2ASystem } from '../hooks/useP2ASystems';

interface AddSystemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSystem: (system: Omit<P2ASystem, 'id' | 'created_at' | 'updated_at' | 'assigned_handover_point_id' | 'assigned_vcr_code'>) => void;
  onImportSystems: (systems: Array<Omit<P2ASystem, 'id' | 'created_at' | 'updated_at' | 'assigned_handover_point_id' | 'assigned_vcr_code'>>) => void;
  handoverPlanId: string;
  plantCode?: string;
  projectCode?: string;
  isAdding?: boolean;
  isImporting?: boolean;
}

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

export const AddSystemDialog: React.FC<AddSystemDialogProps> = ({
  open,
  onOpenChange,
  onAddSystem,
  onImportSystems,
  handoverPlanId,
  plantCode = '',
  projectCode = '',
  isAdding,
  isImporting,
}) => {
  const [activeTab, setActiveTab] = useState('manual');
  
  // Manual form state
  const [formData, setFormData] = useState({
    system_id: plantCode && projectCode ? `${plantCode}-${projectCode}-` : '',
    name: '',
    is_hydrocarbon: false,
    completion_percentage: 0,
    target_rfsu_date: '',
    punchlist_a_count: 0,
    punchlist_b_count: 0,
    itr_a_count: 0,
    itr_b_count: 0,
  });

  // Excel import state
  const [parsedSystems, setParsedSystems] = useState<ParsedSystem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const resetForm = () => {
    setFormData({
      system_id: plantCode && projectCode ? `${plantCode}-${projectCode}-` : '',
      name: '',
      is_hydrocarbon: false,
      completion_percentage: 0,
      target_rfsu_date: '',
      punchlist_a_count: 0,
      punchlist_b_count: 0,
      itr_a_count: 0,
      itr_b_count: 0,
    });
    setParsedSystems([]);
    setImportError(null);
  };

  const handleManualSubmit = () => {
    onAddSystem({
      handover_plan_id: handoverPlanId,
      system_id: formData.system_id,
      name: formData.name,
      is_hydrocarbon: formData.is_hydrocarbon,
      completion_status: 'NOT_STARTED',
      completion_percentage: formData.completion_percentage,
      target_rfsu_date: formData.target_rfsu_date || undefined,
      source_type: 'MANUAL',
      punchlist_a_count: formData.punchlist_a_count,
      punchlist_b_count: formData.punchlist_b_count,
      itr_a_count: formData.itr_a_count,
      itr_b_count: formData.itr_b_count,
      itr_total_count: formData.itr_a_count + formData.itr_b_count,
    });
    resetForm();
    onOpenChange(false);
  };

  const handleExcelImport = () => {
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
    resetForm();
    onOpenChange(false);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsParsingFile(true);
    setImportError(null);

    try {
      const data = await file.arrayBuffer();
      const { data: jsonData } = await readExcelFile(data);

      if (jsonData.length === 0) {
        setImportError('No data found in file');
        return;
      }

      // Map Excel columns to system properties
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
  };

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

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Systems</DialogTitle>
          <DialogDescription>
            Add systems to your handover plan manually, import from Excel, or connect to an external API
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="manual" className="gap-2">
              <Plus className="w-4 h-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="excel" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Excel Import
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Plug2 className="w-4 h-4" />
              API Connect
            </TabsTrigger>
          </TabsList>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>System ID *</Label>
                <Input
                  value={formData.system_id}
                  onChange={(e) => setFormData({ ...formData, system_id: e.target.value })}
                  placeholder="e.g., N003-DP300-100"
                />
              </div>
              <div className="space-y-2">
                <Label>System Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Instrument Air System"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="hydrocarbon"
                  checked={formData.is_hydrocarbon}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_hydrocarbon: checked })}
                />
                <Label htmlFor="hydrocarbon">Hydrocarbon System</Label>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Completion %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.completion_percentage}
                  onChange={(e) => setFormData({ ...formData, completion_percentage: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Target RFSU Date</Label>
                <Input
                  type="date"
                  value={formData.target_rfsu_date}
                  onChange={(e) => setFormData({ ...formData, target_rfsu_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Punchlist A</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.punchlist_a_count}
                  onChange={(e) => setFormData({ ...formData, punchlist_a_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Punchlist B</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.punchlist_b_count}
                  onChange={(e) => setFormData({ ...formData, punchlist_b_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ITR-A</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.itr_a_count}
                  onChange={(e) => setFormData({ ...formData, itr_a_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ITR-B</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.itr_b_count}
                  onChange={(e) => setFormData({ ...formData, itr_b_count: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleManualSubmit}
                disabled={!formData.system_id || !formData.name || isAdding}
              >
                {isAdding ? 'Adding...' : 'Add System'}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Excel Import Tab */}
          <TabsContent value="excel" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Upload an Excel file with system data
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                Download Template
              </Button>
            </div>

            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              {isParsingFile ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Parsing file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragActive ? 'Drop file here' : 'Drag & drop or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports .xlsx, .xls, .csv
                  </p>
                </div>
              )}
            </div>

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

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleExcelImport}
                disabled={parsedSystems.length === 0 || isImporting}
              >
                {isImporting ? 'Importing...' : `Import ${parsedSystems.length} Systems`}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* API Connect Tab */}
          <TabsContent value="api" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Connect to external completions management systems to sync system data automatically.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Plug2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">GoCompletions</h4>
                    <p className="text-xs text-muted-foreground">Sync from GoCompletions API</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Plug2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Hub2</h4>
                    <p className="text-xs text-muted-foreground">Connect to Hub2 systems</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="p-4 border border-dashed rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                API connections coming soon. Contact support to set up integration.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
