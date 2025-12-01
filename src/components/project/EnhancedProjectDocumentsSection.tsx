import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Paperclip
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProjectDocumentsSectionProps {
  documents: any[];
  setDocuments: React.Dispatch<React.SetStateAction<any[]>>;
}

const getLinkIcon = (linkType: string) => {
  switch (linkType) {
    case 'assai':
      return <Folder className="h-4 w-4" />;
    case 'sharepoint':
      return <Folder className="h-4 w-4" />;
    case 'wrench':
      return <Folder className="h-4 w-4" />;
    default:
      return <Link className="h-4 w-4" />;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <FileText className="h-5 w-5 mr-2" />
          Supporting Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Document Button */}
        <Dialog open={isAddDocumentOpen} onOpenChange={setIsAddDocumentOpen}>
          <DialogTrigger asChild>
            <Button 
              type="button"
              variant="outline"
              className="w-full border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 h-12"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Paperclip className="h-5 w-5" />
                Add Supporting Document
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Document Name</Label>
                <Input
                  value={documentForm.document_name}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, document_name: e.target.value }))}
                  placeholder="Enter document name"
                  className="h-11"
                />
              </div>

              <Tabs 
                value={documentForm.document_type} 
                onValueChange={(value: 'file' | 'link') => 
                  setDocumentForm(prev => ({ ...prev, document_type: value }))
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-11">
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Add Link
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="file" className="space-y-4 mt-6">
                  {/* Drag and Drop Area */}
                  <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={`
                      relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                      ${isDragOver 
                        ? 'border-blue-400 bg-blue-50/50' 
                        : 'border-gray-300 hover:border-gray-400'
                      }
                    `}
                  >
                    <CloudUpload className={`mx-auto h-12 w-12 mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-700">
                        {isDragOver ? 'Drop your file here' : 'Drag and drop your file here'}
                      </p>
                      <p className="text-sm text-gray-500">or</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('file-input')?.click()}
                        className="bg-white"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Browse Files
                      </Button>
                    </div>
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
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      {getFileIcon(documentForm.file.name.split('.').pop() || '')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {documentForm.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(documentForm.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDocumentForm(prev => ({ ...prev, file: null }))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="link" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Document Link</Label>
                    <Input
                      value={documentForm.link_url}
                      onChange={(e) => handleLinkChange(e.target.value)}
                      placeholder="Paste Assai, SharePoint, or Wrench link"
                      className="h-11"
                    />
                  </div>
                  {documentForm.link_type && (
                    <div className="flex items-center gap-2">
                      {getLinkIcon(documentForm.link_type)}
                      <Badge variant="outline" className="capitalize">
                        {documentForm.link_type} Link Detected
                      </Badge>
                    </div>
                  )}
                </TabsContent>
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

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {doc.document_type === 'file' 
                      ? getFileIcon(doc.file_extension) 
                      : getLinkIcon(doc.link_type)
                    }
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{doc.document_name}</span>
                      {doc.file_extension && (
                        <span className="text-xs text-muted-foreground uppercase">
                          {doc.file_extension} file
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(doc.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};