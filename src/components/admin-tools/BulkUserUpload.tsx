import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExcelUser {
  firstName: string;
  lastName: string;
  Password: string;
  personalEmail: string;
  email: string;
  isFunctionalEmail: string | boolean;
  company: string;
  role: string;
  plant?: string;
  commission?: string;
  phone?: string;
  systemRole?: string;
  hub?: string;
}

interface ParsedUser {
  firstName: string;
  lastName: string;
  password: string;
  personalEmail: string;
  email: string;
  isFunctionalEmail: boolean;
  company: string;
  role: string;
  plant?: string;
  commission?: string;
  phone?: string;
  systemRole?: string;
  hub?: string;
  isValid: boolean;
  validationErrors: string[];
}

interface UploadResult {
  email: string;
  success: boolean;
  userId?: string;
  error?: string;
  existingUser?: boolean;
}

interface BulkUserUploadProps {
  onBack: () => void;
}

export const BulkUserUpload: React.FC<BulkUserUploadProps> = ({ onBack }) => {
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; created: number; updated: number; failed: number } | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const parseExcelFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ExcelUser>(worksheet);

        const parsed: ParsedUser[] = jsonData
          .filter(row => row.firstName && row.lastName && row.email)
          .map(row => {
            const validationErrors: string[] = [];
            
            if (!row.firstName) validationErrors.push('Missing first name');
            if (!row.lastName) validationErrors.push('Missing last name');
            if (!row.email) validationErrors.push('Missing email');
            if (!row.Password) validationErrors.push('Missing password');
            if (!row.company) validationErrors.push('Missing company');

            const isFunctional = typeof row.isFunctionalEmail === 'boolean' 
              ? row.isFunctionalEmail 
              : row.isFunctionalEmail?.toString().toUpperCase() === 'TRUE';

            if (isFunctional && !row.personalEmail) {
              validationErrors.push('Functional email requires personal email');
            }

            return {
              firstName: row.firstName?.toString().trim() || '',
              lastName: row.lastName?.toString().trim() || '',
              password: row.Password?.toString() || '',
              personalEmail: row.personalEmail?.toString().replace(/<|>/g, '').trim() || '',
              email: row.email?.toString().replace(/<|>/g, '').trim() || '',
              isFunctionalEmail: isFunctional,
              company: row.company?.toString().trim() || '',
              role: row.role?.toString().trim() || '',
              plant: row.plant?.toString().trim() || undefined,
              commission: row.commission?.toString().trim() || undefined,
              phone: row.phone?.toString().trim() || undefined,
              systemRole: row.systemRole?.toString().trim() || 'user',
              hub: row.hub?.toString().trim() || undefined,
              isValid: validationErrors.length === 0,
              validationErrors,
            };
          });

        setParsedUsers(parsed);
        setFileName(file.name);
        setUploadResults(null);
        setSummary(null);
        toast.success(`Parsed ${parsed.length} users from ${file.name}`);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      parseExcelFile(file);
    }
  }, [parseExcelFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    const validUsers = parsedUsers.filter(u => u.isValid);
    if (validUsers.length === 0) {
      toast.error('No valid users to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Prepare users for API
      const usersPayload = validUsers.map(u => ({
        firstName: u.firstName,
        lastName: u.lastName,
        password: u.password,
        personalEmail: u.personalEmail,
        email: u.email,
        isFunctionalEmail: u.isFunctionalEmail,
        company: u.company,
        role: u.role,
        plant: u.plant,
        commission: u.commission,
        phone: u.phone,
        systemRole: u.systemRole || 'user',
        hub: u.hub,
      }));

      setUploadProgress(20);

      const { data, error } = await supabase.functions.invoke('bulk-create-users', {
        body: { users: usersPayload },
      });

      setUploadProgress(100);

      if (error) {
        throw error;
      }

      if (data.success) {
        setUploadResults(data.results);
        setSummary(data.summary);
        toast.success(`Successfully processed ${data.summary.total} users: ${data.summary.created} created, ${data.summary.updated} updated, ${data.summary.failed} failed`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload users');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setParsedUsers([]);
    setUploadResults(null);
    setSummary(null);
    setFileName('');
    setUploadProgress(0);
  };

  const validCount = parsedUsers.filter(u => u.isValid).length;
  const invalidCount = parsedUsers.filter(u => !u.isValid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bulk User Upload</h1>
          <p className="text-muted-foreground">Upload multiple users from an Excel file</p>
        </div>
      </div>

      {/* Upload Results Summary */}
      {summary && (
        <Alert className={summary.failed > 0 ? 'border-amber-500' : 'border-green-500'}>
          <CheckCircle2 className={`h-4 w-4 ${summary.failed > 0 ? 'text-amber-500' : 'text-green-500'}`} />
          <AlertTitle>Upload Complete</AlertTitle>
          <AlertDescription>
            <div className="flex gap-4 mt-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {summary.created} Created
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {summary.updated} Updated
              </Badge>
              {summary.failed > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {summary.failed} Failed
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Drop Zone */}
      {parsedUsers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop the Excel file here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium">Drag & drop an Excel file here</p>
                  <p className="text-muted-foreground mt-1">or click to select a file</p>
                  <p className="text-sm text-muted-foreground mt-4">Supports .xlsx and .xls files</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parsed Users Preview */}
      {parsedUsers.length > 0 && !uploadResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <div>
                  <CardTitle className="text-lg">{fileName}</CardTitle>
                  <CardDescription>
                    {parsedUsers.length} users parsed
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validCount} Valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <XCircle className="h-3 w-3 mr-1" />
                    {invalidCount} Invalid
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Hub/Plant</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedUsers.map((user, idx) => (
                    <TableRow key={idx} className={!user.isValid ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{user.email}</div>
                        {user.isFunctionalEmail && (
                          <div className="text-xs text-muted-foreground">
                            Auth: {user.personalEmail}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.company}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.role}</div>
                        {user.commission && (
                          <div className="text-xs text-muted-foreground">{user.commission}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.hub && <Badge variant="secondary">{user.hub}</Badge>}
                        {user.plant && <Badge variant="secondary">{user.plant}</Badge>}
                      </TableCell>
                      <TableCell>
                        {user.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">{user.validationErrors[0]}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button variant="outline" onClick={resetUpload}>
                Cancel
              </Button>
              <div className="flex items-center gap-3">
                {isUploading && (
                  <div className="w-32">
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || validCount === 0}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Create {validCount} Users
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Results Detail */}
      {uploadResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upload Results</CardTitle>
              <Button variant="outline" onClick={resetUpload}>
                Upload Another File
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadResults.map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{result.email}</TableCell>
                      <TableCell>
                        {result.success ? (
                          <Badge className={result.existingUser ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                            {result.existingUser ? 'Updated' : 'Created'}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {result.error || (result.userId ? `ID: ${result.userId.slice(0, 8)}...` : '')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
