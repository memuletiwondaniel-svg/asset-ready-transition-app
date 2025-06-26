
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, Upload, FileText, X } from 'lucide-react';

interface DocumentFilter {
  project: string;
  originator: string;
  plant: string;
  site: string;
  unit: string;
  discipline: string;
  docType: string;
  sequence: string;
}

interface ProjectDocumentsSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  documentFilters: DocumentFilter;
  setDocumentFilters: React.Dispatch<React.SetStateAction<DocumentFilter>>;
}

export const ProjectDocumentsSection: React.FC<ProjectDocumentsSectionProps> = ({ 
  formData, 
  setFormData,
  documentFilters,
  setDocumentFilters
}) => {
  const plants = [
    'KAZ',
    'NRNGL', 
    'UQ',
    'Compressor Station (CS)',
    'BNGL'
  ];

  // Document filter options
  const filterOptions = {
    project: ['Project A', 'Project B', 'Project C'],
    originator: ['Engineering', 'Construction', 'Operations'],
    plant: plants,
    site: ['Site 1', 'Site 2', 'Site 3'],
    unit: ['Unit 100', 'Unit 200', 'Unit 300'],
    discipline: ['Mechanical', 'Electrical', 'Instrumentation', 'Civil'],
    docType: ['Drawing', 'Specification', 'Report', 'Manual'],
    sequence: ['001', '002', '003', '004']
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData((prev: any) => ({
      ...prev,
      supportingDocs: [...prev.supportingDocs, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      supportingDocs: prev.supportingDocs.filter((_: any, i: number) => i !== index)
    }));
  };

  const updateDocumentFilter = (field: keyof DocumentFilter, value: string) => {
    setDocumentFilters((prev: DocumentFilter) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFindDocumentsInAssai = () => {
    // Build query parameters from document filters
    const queryParams = new URLSearchParams();
    Object.entries(documentFilters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    // Open Assai in new tab with search parameters
    const assaiUrl = `https://assai.com/search?${queryParams.toString()}`;
    window.open(assaiUrl, '_blank');
  };

  const handleFindDocumentsInWrench = () => {
    // Build query parameters from document filters
    const queryParams = new URLSearchParams();
    Object.entries(documentFilters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    // Open Wrench in new tab with search parameters
    const wrenchUrl = `https://wrench.com/search?${queryParams.toString()}`;
    window.open(wrenchUrl, '_blank');
  };

  return (
    <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="pb-3 bg-gradient-to-r from-emerald-300 to-emerald-400 text-white rounded-t-lg">
        <CardTitle className="text-xl flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <FolderOpen className="h-8 w-8" />
          </div>
          Project Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Document Search Filters */}
        <div className="space-y-6">
          <Label className="text-sm font-medium text-gray-700">Find Documents</Label>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(filterOptions).map(([key, options], index) => (
              <div key={key} className="flex items-center gap-2">
                <div className="min-w-[120px]">
                  <Select value={documentFilters[key as keyof DocumentFilter]} onValueChange={(value) => updateDocumentFilter(key as keyof DocumentFilter, value)}>
                    <SelectTrigger className="h-8 text-xs border-gray-300">
                      <SelectValue placeholder={key.charAt(0).toUpperCase() + key.slice(1)} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {index < Object.keys(filterOptions).length - 1 && (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-8">
            <Button
              type="button"
              onClick={handleFindDocumentsInAssai}
              variant="outline"
              className="h-10 px-4 text-sm flex items-center gap-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md transition-all duration-200"
            >
              <img src="/lovable-uploads/c25af318-1854-4091-9988-8579bc708185.png" alt="Assai" className="h-5 w-5" />
              Find Documents in Assai
            </Button>
            <Button
              type="button"
              onClick={handleFindDocumentsInWrench}
              variant="outline"
              className="h-10 px-4 text-sm flex items-center gap-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md transition-all duration-200"
            >
              <img src="/lovable-uploads/81080018-90d7-4e00-a4b2-ee1682e5d8bd.png" alt="Wrench" className="h-5 w-5" />
              Find Documents in Wrench
            </Button>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-500" />
            Upload Supporting Documents
          </Label>
          <div className="border-2 border-dashed border-emerald-300 rounded-xl p-6 text-center bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
            <div className="p-3 bg-emerald-100 rounded-full w-fit mx-auto mb-3">
              <Upload className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Click to upload files or drag and drop
            </p>
            <p className="text-xs text-gray-500 mb-3">
              PDF, DOC, XLS files up to 10MB each
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="project-file-upload"
            />
            <Button 
              type="button"
              variant="outline" 
              onClick={() => document.getElementById('project-file-upload')?.click()}
              className="border-emerald-300 text-emerald-600 hover:bg-emerald-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>
          
          {/* Uploaded Files List */}
          {formData.supportingDocs.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-900">Uploaded Documents</h5>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {formData.supportingDocs.map((file: File, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <FileText className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
