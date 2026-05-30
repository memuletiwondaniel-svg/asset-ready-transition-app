import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  X,
  Upload,
  Link,
  File,
  FileImage,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Folder,
  CloudUpload,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ProjectDocumentsSectionProps {
  documents: any[];
  setDocuments: React.Dispatch<React.SetStateAction<any[]>>;
}

const getLinkIcon = (_linkType: string) => {
  return <Link className="h-4 w-4 text-blue-500" />;
};

const getLinkTypeLabel = (linkType: string): string | null => {
  switch (linkType) {
    case 'assai':
      return 'Assai';
    case 'sharepoint':
      return 'SharePoint';
    case 'wrench':
      return 'Wrench';
    default:
      return null;
  }
};

const getFileIcon = (extension: string) => {
  const ext = extension?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'xls':
    case 'xlsx':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case 'ppt':
    case 'pptx':
      return <Presentation className="h-4 w-4 text-orange-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <FileImage className="h-4 w-4 text-purple-500" />;
    case 'txt':
    case 'csv':
      return <FileCode className="h-4 w-4 text-gray-500" />;
    default:
      return <File className="h-4 w-4 text-gray-500" />;
  }
};

export const EnhancedProjectDocumentsSection: React.FC<ProjectDocumentsSectionProps> = ({ 
  documents, 
  setDocuments 
}) => {
  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    document_name: '',
    document_type: 'file' as 'file' | 'link',
    file: null as File | null,
    link_url: '',
    link_type: '' as 'assai' | 'sharepoint' | 'wrench' | ''
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const addDocument = () => {
    if (!documentForm.document_name) return;

    if (documentForm.document_type === 'file' && !documentForm.file) return;
    if (documentForm.document_type === 'link' && !documentForm.link_url) return;

    const document = {
      id: Date.now().toString(),
      document_name: documentForm.document_name,
      document_type: documentForm.document_type,
      file_path: documentForm.file ? documentForm.file.name : undefined,
      link_url: documentForm.document_type === 'link' ? documentForm.link_url : undefined,
      link_type: documentForm.document_type === 'link' ? documentForm.link_type : undefined,
      file_extension: documentForm.file ? documentForm.file.name.split('.').pop() : undefined,
      file_size: documentForm.file ? documentForm.file.size : undefined,
    };

    setDocuments(prev => [...prev, document]);
    setDocumentForm({
      document_name: '',
      document_type: 'file',
      file: null,
      link_url: '',
      link_type: ''
    });
    setIsAddDocumentOpen(false);
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const detectLinkType = (url: string): 'assai' | 'sharepoint' | 'wrench' | '' => {
    if (url.includes('assai')) return 'assai';
    if (url.includes('sharepoint') || url.includes('office.com')) return 'sharepoint';
    if (url.includes('wrench')) return 'wrench';
    return '';
  };

  const handleFileChange = (file: File) => {
    setDocumentForm(prev => ({
      ...prev,
      file,
      document_name: prev.document_name || file.name.split('.')[0]
    }));
  };

  const handleLinkChange = (url: string) => {
    const linkType = detectLinkType(url);
    setDocumentForm(prev => ({
      ...prev,
      link_url: url,
      link_type: linkType
    }));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const isEmpty = documents.length === 0;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Supporting Documents</h3>
        <Dialog open={isAddDocumentOpen} onOpenChange={setIsAddDocumentOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 text-muted-foreground border-border/60 transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md hover:-translate-y-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Paperclip className="h-4 w-4 text-primary" />
                Add Supporting Document
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Document Name</Label>
                <Input
                  value={documentForm.document_name}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, document_name: e.target.value }))}
                  placeholder="Enter document name"
                  className="h-9 text-sm"
                />
              </div>

              <Tabs
                value={documentForm.document_type}
                onValueChange={(value: 'file' | 'link') =>
                  setDocumentForm(prev => ({ ...prev, document_type: value }))
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="file" className="flex items-center gap-1.5 text-xs">
                    <Upload className="h-3.5 w-3.5" />
                    File
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex items-center gap-1.5 text-xs">
                    <Link className="h-3.5 w-3.5" />
                    Link
                  </TabsTrigger>
                </TabsList>

                {/* Fixed-height area so modal height does not jump between tabs */}
                <div className="mt-4 min-h-[180px]">
                  <TabsContent value="file" className="space-y-3 mt-0">
                    <div
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      className={cn(
                        'relative border border-dashed rounded-lg p-5 text-center transition-all duration-200',
                        isDragOver
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/30'
                      )}
                    >
                      <CloudUpload className={cn('mx-auto h-7 w-7 mb-2', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
                      <p className="text-sm font-medium text-foreground">
                        {isDragOver ? 'Drop your file here' : (
                          <>
                            Drag & drop, or{' '}
                            <button
                              type="button"
                              onClick={() => document.getElementById('file-input')?.click()}
                              className="text-primary hover:underline font-medium"
                            >
                              browse
                            </button>
                          </>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">PDF, DOCX, XLSX, images up to 20MB</p>
                      <Input
                        id="file-input"
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChange(file);
                        }}
                        className="hidden"
                      />
                    </div>

                    {documentForm.file && (
                      <div className="flex items-center gap-2.5 p-2.5 bg-muted/50 rounded-md border border-border/60">
                        {getFileIcon(documentForm.file.name.split('.').pop() || '')}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {documentForm.file.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {(documentForm.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDocumentForm(prev => ({ ...prev, file: null }))}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="link" className="space-y-3 mt-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Document Link</Label>
                      <Input
                        value={documentForm.link_url}
                        onChange={(e) => handleLinkChange(e.target.value)}
                        placeholder="Paste Assai, SharePoint, or Wrench link"
                        className="h-9 text-sm"
                      />
                    </div>
                    {documentForm.link_type && (
                      <div className="flex items-center gap-2">
                        {getLinkIcon(documentForm.link_type)}
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {documentForm.link_type} Link Detected
                        </Badge>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDocumentOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={addDocument}
                  disabled={
                    !documentForm.document_name ||
                    (documentForm.document_type === 'file' && !documentForm.file) ||
                    (documentForm.document_type === 'link' && !documentForm.link_url)
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <button
          type="button"
          onClick={() => setIsAddDocumentOpen(true)}
          className="w-full rounded-lg border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-colors px-4 py-8 text-center group"
        >
          <FileText className="mx-auto h-6 w-6 text-primary/60 group-hover:text-primary mb-2 transition-colors" />
          <p className="text-sm font-medium text-foreground">No documents yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click <span className="font-medium text-primary">Add Document</span> to attach a file or link.</p>
        </button>
      ) : (
        <div className="space-y-1.5 rounded-lg border border-border/60 bg-card p-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center justify-between gap-2 px-2.5 py-1.5 bg-muted/40 hover:bg-muted/60 rounded-md border border-transparent hover:border-border/60 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {doc.document_type === 'file'
                  ? getFileIcon(doc.file_extension)
                  : getLinkIcon(doc.link_type)
                }
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  {doc.document_type === 'link' && doc.link_url ? (
                    <a
                      href={doc.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {doc.document_name}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-foreground truncate">{doc.document_name}</span>
                  )}
                  {doc.document_type === 'file' && doc.file_extension && (
                    <span className="text-[10px] text-muted-foreground uppercase shrink-0">
                      {doc.file_extension}
                    </span>
                  )}
                  {doc.document_type === 'link' && getLinkTypeLabel(doc.link_type) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                      {getLinkTypeLabel(doc.link_type)}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeDocument(doc.id)}
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};