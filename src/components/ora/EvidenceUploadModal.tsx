import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileCheck, Image, FileText, Upload, X, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, evidenceType: string, description: string) => Promise<void>;
  isUploading: boolean;
}

const EVIDENCE_TYPES = [
  { value: 'attendance_sheet', label: 'Attendance Sheet', icon: FileCheck, description: 'Signed attendance registers' },
  { value: 'photo', label: 'Training Photo', icon: Image, description: 'Photos from training sessions' },
  { value: 'certificate', label: 'Certificate', icon: FileText, description: 'Completion certificates' },
  { value: 'other', label: 'Other Document', icon: FileText, description: 'Other supporting documents' }
];

export const EvidenceUploadModal: React.FC<EvidenceUploadModalProps> = ({
  open,
  onOpenChange,
  onUpload,
  isUploading
}) => {
  const [selectedType, setSelectedType] = useState<string>('attendance_sheet');
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    await onUpload(selectedFile, selectedType, description);
    
    // Reset form after successful upload
    setSelectedFile(null);
    setDescription('');
    setSelectedType('attendance_sheet');
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDescription('');
    setSelectedType('attendance_sheet');
    onOpenChange(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload Training Evidence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Evidence Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Evidence Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {EVIDENCE_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                      isSelected 
                        ? "border-primary bg-primary/5 ring-1 ring-primary" 
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedType(type.value)}
                  >
                    <div className={cn(
                      "p-2 rounded-md",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm",
                        isSelected && "text-primary"
                      )}>{type.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="evidence-description" className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="evidence-description"
              placeholder="Add a description for this evidence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Drag and Drop Zone */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Upload File</Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all",
                dragActive 
                  ? "border-primary bg-primary/5" 
                  : selectedFile 
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
              
              {selectedFile ? (
                <div className="flex flex-col items-center text-center px-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                    <File className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium text-sm truncate max-w-full">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(selectedFile.size)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs h-7 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="w-3 h-3" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center px-4">
                  <div className={cn(
                    "p-3 rounded-full mb-3 transition-colors",
                    dragActive ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Upload className={cn(
                      "w-6 h-6",
                      dragActive ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <p className="font-medium text-sm">
                    {dragActive ? "Drop file here" : "Drag and drop file here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Images, PDF, Word, Excel files supported
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 gap-2"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload Evidence'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
