import React, { useState } from 'react';
import { ArrowLeft, Upload, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChecklistItems, useUploadChecklist, useChecklistUploads } from '@/hooks/useChecklistItems';
import { toast } from 'sonner';

interface ChecklistManagementPageProps {
  onBack: () => void;
}

const ChecklistManagementPage: React.FC<ChecklistManagementPageProps> = ({ onBack }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const { data: checklistItems, isLoading: itemsLoading } = useChecklistItems();
  const { data: uploads, isLoading: uploadsLoading } = useChecklistUploads();
  const uploadMutation = useUploadChecklist();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/tab-separated-values'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv') && !file.name.endsWith('.tsv')) {
        toast.error('Please select a valid Excel, CSV, or TSV file');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress(20);
      
      const result = await uploadMutation.mutateAsync(selectedFile);
      
      setUploadProgress(100);
      
      toast.success(
        `Upload completed: ${result.added} added, ${result.updated} updated, ${result.failed} failed`
      );
      
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Reset file input
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
      
    } catch (error) {
      setUploadProgress(0);
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const downloadTemplate = () => {
    const headers = ['ID', 'Description', 'Category', 'Topic', 'Supporting Evidence', 'Responsible Party', 'Approving Authority'];
    const sampleData = [
      'X01\tHave all Priority 1 actions from the PSSR walkdown been closed out?\tGeneral\tPSSR Walkdown\t\tProject Engr\tTA2, ORA, Dep Plant Dir.',
      'A01\tHave all Safety Critical Elements (SCEs) been identified?\tHardware Integrity\tSCE\tTIV report\tCommissioning Lead\tTA2'
    ];
    
    const content = [headers.join('\t'), ...sampleData].join('\n');
    const blob = new Blob([content], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'checklist-template.tsv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'COMPLETED_WITH_ERRORS':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />With Errors</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
    }
  };

  const categoryStats = checklistItems?.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Checklist Management</h1>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload Excel</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Checklist Excel File
              </CardTitle>
              <CardDescription>
                Upload an Excel file to update the PSSR checklist items. The file should contain columns for ID, Description, Category, Topic, Supporting Evidence, Responsible Party, and Approving Authority.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>File Format Requirements:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Excel (.xlsx, .xls), CSV, or TSV file format</li>
                    <li>First row must contain headers</li>
                    <li>Required columns: ID, Description, Category</li>
                    <li>Optional columns: Topic, Supporting Evidence, Responsible Party, Approving Authority</li>
                    <li>Use tab-separated values for best compatibility</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="file-input">Select File</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  onChange={handleFileSelect}
                />
              </div>

              {selectedFile && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Selected:</strong> {selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}

              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Checklist Overview</CardTitle>
              <CardDescription>
                Current checklist items in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <p>Loading...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="text-2xl font-bold">{checklistItems?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Items</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-2xl font-bold">{Object.keys(categoryStats || {}).length}</div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </Card>
                  </div>

                  {categoryStats && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Items per Category</h3>
                      <div className="grid gap-2">
                        {Object.entries(categoryStats).map(([category, count]) => (
                          <div key={category} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span className="text-sm">{category}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>
                Previous checklist file uploads and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadsLoading ? (
                <p>Loading...</p>
              ) : uploads?.length === 0 ? (
                <p className="text-muted-foreground">No uploads yet</p>
              ) : (
                <div className="space-y-4">
                  {uploads?.map((upload) => (
                    <Card key={upload.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-medium">{upload.filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(upload.uploaded_at).toLocaleString()}
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span>Processed: {upload.items_processed}</span>
                            <span className="text-green-600">Added: {upload.items_added}</span>
                            <span className="text-blue-600">Updated: {upload.items_updated}</span>
                            {upload.items_failed > 0 && (
                              <span className="text-red-600">Failed: {upload.items_failed}</span>
                            )}
                          </div>
                          {upload.error_log && (
                            <details className="mt-2">
                              <summary className="text-sm text-red-600 cursor-pointer">View Errors</summary>
                              <pre className="text-xs bg-red-50 p-2 rounded mt-1 whitespace-pre-wrap">
                                {upload.error_log}
                              </pre>
                            </details>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(upload.upload_status)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChecklistManagementPage;