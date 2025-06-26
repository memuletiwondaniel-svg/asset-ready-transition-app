
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';

interface FileUploadSectionProps {
  files: File[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'xlsx':
    case 'xls':
      return (
        <div className="p-2 bg-green-100 rounded-lg">
          <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            <path d="M12,11L16,15H13V19H11V15H8L12,11Z"/>
          </svg>
        </div>
      );
    case 'doc':
    case 'docx':
      return (
        <div className="p-2 bg-blue-100 rounded-lg">
          <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            <path d="M9,13H15V15H9V13M9,16H13V18H9V16Z"/>
          </svg>
        </div>
      );
    case 'pdf':
      return (
        <div className="p-2 bg-red-100 rounded-lg">
          <svg className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            <path d="M10.5,13A1.5,1.5 0 0,0 9,14.5V16.5A1.5,1.5 0 0,0 10.5,18H11.5A1.5,1.5 0 0,0 13,16.5V14.5A1.5,1.5 0 0,0 11.5,13H10.5Z"/>
          </svg>
        </div>
      );
    default:
      return (
        <div className="p-2 bg-gray-100 rounded-lg">
          <svg className="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
        </div>
      );
  }
};

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  files,
  onFileUpload,
  onRemoveFile
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Upload className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <Label className="text-lg font-semibold text-gray-700">Supporting Documents</Label>
          <p className="text-sm text-gray-600">Upload project documentation and supporting files</p>
        </div>
      </div>
      
      <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
        <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
          <Upload className="h-8 w-8 text-blue-600" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">
          Click to upload files or drag and drop
        </p>
        <p className="text-sm text-gray-500 mb-4">
          PDF, DOC, XLS files up to 10MB each
        </p>
        <input
          type="file"
          multiple
          onChange={onFileUpload}
          className="hidden"
          id="file-upload"
        />
        <Button 
          variant="outline" 
          className="border-blue-200 text-blue-700 hover:bg-blue-50"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          Choose Files
        </Button>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-3">
          <h5 className="font-medium text-gray-900">Uploaded Files</h5>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.name)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onRemoveFile(index)}
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
  );
};

export default FileUploadSection;
