import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentCanvasProps {
  fileUrl: string;
  fileType: string | null;
  fileName: string;
  zoom: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  totalPages: number;
  children?: React.ReactNode; // Annotation layer
}

const getDocCategory = (fileType: string | null, fileName: string) => {
  if (!fileType && !fileName) return 'other';
  const ft = (fileType || '').toLowerCase();
  const fn = fileName.toLowerCase();
  if (ft.includes('pdf') || fn.endsWith('.pdf')) return 'pdf';
  if (ft.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fn)) return 'image';
  if (
    ft.includes('word') || ft.includes('document') ||
    ft.includes('sheet') || ft.includes('excel') ||
    ft.includes('presentation') || ft.includes('powerpoint') ||
    /\.(docx?|xlsx?|pptx?)$/i.test(fn)
  ) return 'office';
  return 'other';
};

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  fileUrl,
  fileType,
  fileName,
  zoom,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  totalPages,
  children,
}) => {
  const category = getDocCategory(fileType, fileName);
  const [pdfError, setPdfError] = useState(false);

  if (category === 'pdf' && !pdfError) {
    return (
      <div className="flex-1 overflow-auto flex flex-col items-center bg-muted/30 p-4 relative">
        <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => onTotalPagesChange(numPages)}
            onLoadError={() => setPdfError(true)}
            loading={
              <div className="flex items-center justify-center h-[600px] w-[500px]">
                <div className="animate-pulse text-muted-foreground">Loading PDF…</div>
              </div>
            }
          >
            <div className="relative">
              <Page
                pageNumber={currentPage}
                width={900}
                renderTextLayer={true}
                renderAnnotationLayer={false}
              />
              {/* Annotation overlay */}
              {children}
            </div>
          </Document>
        </div>

        {/* Page nav */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 mt-4 bg-card border border-border rounded-full px-3 py-1.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-foreground min-w-[60px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (category === 'image') {
    return (
      <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/30 p-4">
        <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-[80vh] object-contain rounded shadow-sm"
          />
          {children}
        </div>
      </div>
    );
  }

  if (category === 'office') {
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    return (
      <div className="flex-1 overflow-hidden relative bg-muted/30">
        <iframe
          src={officeUrl}
          className="w-full h-full border-0"
          title={fileName}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%`, height: `${100 / zoom}%` }}
        />
        {children}
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 gap-4">
      <FileQuestion className="h-16 w-16 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{fileName}</p>
        <p className="text-xs text-muted-foreground mt-1">Preview not available for this file type</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
        Download File
      </Button>
    </div>
  );
};
