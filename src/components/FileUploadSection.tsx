
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadSectionProps {
  files: File[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  files,
  onFileUpload,
  onRemoveFile
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold text-gray-700">Supporting Documents</Label>
      <div 
        className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center bg-blue-50/30 hover:bg-blue-50/50 transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const files = Array.from(e.dataTransfer.files);
          const syntheticEvent = {
            target: { files: files as unknown as FileList }
          } as React.ChangeEvent<HTMLInputElement>;
          onFileUpload(syntheticEvent);
        }}
      >
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
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
          onChange={onFileUpload}
          className="hidden"
        />
        <Button 
          variant="outline" 
          className="border-blue-200 text-blue-700 hover:bg-blue-50"
          onClick={() => inputRef.current?.click()}
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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
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
