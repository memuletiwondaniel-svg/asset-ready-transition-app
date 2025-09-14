import React, { useState } from 'react';
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
  Folder
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export const ProjectDocumentsSection: React.FC<ProjectDocumentsSectionProps> = ({ 
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentForm(prev => ({
        ...prev,
        file,
        document_name: prev.document_name || file.name.split('.')[0]
      }));
    }
  };

  const handleLinkChange = (url: string) => {
    const linkType = detectLinkType(url);
    setDocumentForm(prev => ({
      ...prev,
      link_url: url,
      link_type: linkType
    }));
  };

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
              className="w-full border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Supporting Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input
                  value={documentForm.document_name}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, document_name: e.target.value }))}
                  placeholder="Enter document name"
                />
              </div>

              <Tabs 
                value={documentForm.document_type} 
                onValueChange={(value: 'file' | 'link') => 
                  setDocumentForm(prev => ({ ...prev, document_type: value }))
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                  <TabsTrigger value="link">Add Link</TabsTrigger>
                </TabsList>
                
                <TabsContent value="file" className="space-y-3">
                  <div className="space-y-2">
                    <Label>Choose File</Label>
                    <Input
                      type="file"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                  {documentForm.file && (
                    <div className="text-sm text-gray-600">
                      Selected: {documentForm.file.name} ({(documentForm.file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="link" className="space-y-3">
                  <div className="space-y-2">
                    <Label>Document Link</Label>
                    <Input
                      value={documentForm.link_url}
                      onChange={(e) => handleLinkChange(e.target.value)}
                      placeholder="Paste Assai, SharePoint, or Wrench link"
                    />
                  </div>
                  {documentForm.link_type && (
                    <Badge variant="outline" className="capitalize">
                      {documentForm.link_type} Link
                    </Badge>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
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
                >
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
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {doc.document_type === 'file' 
                      ? getFileIcon(doc.file_extension) 
                      : getLinkIcon(doc.link_type)
                    }
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{doc.document_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {doc.document_type === 'file' ? 'File' : 'Link'}
                        </Badge>
                        {doc.link_type && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {doc.link_type}
                          </Badge>
                        )}
                        {doc.file_extension && (
                          <Badge variant="outline" className="text-xs uppercase">
                            {doc.file_extension}
                          </Badge>
                        )}
                      </div>
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