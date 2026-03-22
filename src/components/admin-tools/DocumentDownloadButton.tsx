import React, { useState, useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DocumentDownloadButtonProps {
  contentRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  title?: string;
}

const DocumentDownloadButton: React.FC<DocumentDownloadButtonProps> = ({ 
  contentRef, 
  fileName,
  title = 'Download as PDF'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!contentRef.current || isGenerating) return;

    setIsGenerating(true);
    toast.info('Generating PDF...', { duration: 2000 });

    try {
      const element = contentRef.current;
      
      // Store original scroll position and styles
      const originalOverflow = element.style.overflow;
      const originalHeight = element.style.height;
      const originalMaxHeight = element.style.maxHeight;
      
      // Temporarily expand the element to capture all content
      element.style.overflow = 'visible';
      element.style.height = 'auto';
      element.style.maxHeight = 'none';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // Restore original styles
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;
      element.style.maxHeight = originalMaxHeight;

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // A4 dimensions in mm
      const pdfWidth = 210;
      const pdfContentWidth = pdfWidth - 20; // 10mm margins
      const scaleFactor = pdfContentWidth / imgWidth;
      const pdfContentHeight = imgHeight * scaleFactor;

      // Calculate how many pages needed
      const pageHeight = 297 - 20; // A4 height minus margins
      const totalPages = Math.ceil(pdfContentHeight / pageHeight);

      const pdf = new jsPDF('p', 'mm', 'a4');

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const sourceY = (page * pageHeight) / scaleFactor;
        const sourceHeight = Math.min(pageHeight / scaleFactor, imgHeight - sourceY);

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);
          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', 10, 10, pdfContentWidth, sourceHeight * scaleFactor);
        }
      }

      pdf.save(`${fileName}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [contentRef, fileName, isGenerating]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={handleDownload}
          disabled={isGenerating}
          className="shrink-0 h-9 w-9"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default DocumentDownloadButton;
