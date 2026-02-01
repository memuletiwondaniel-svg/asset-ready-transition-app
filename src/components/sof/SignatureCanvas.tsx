import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SignatureCanvasProps {
  onSignatureChange?: (signatureData: string | null) => void;
  savedSignature?: string | null;
  onSaveSignature?: (signatureData: string) => void;
  width?: number;
  height?: number;
  className?: string;
  showSavedOption?: boolean;
  disabled?: boolean;
}

interface Point {
  x: number;
  y: number;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSignatureChange,
  savedSignature,
  onSaveSignature,
  width = 400,
  height = 150,
  className,
  showSavedOption = true,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [isUsingSaved, setIsUsingSaved] = useState(false);
  const lastPointRef = useRef<Point | null>(null);

  // Initialize canvas and auto-fill saved signature
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing styles
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear with transparent background
    ctx.clearRect(0, 0, width, height);

    // Auto-fill saved signature if available
    if (savedSignature && showSavedOption) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        // Center the image
        const scale = Math.min(width / img.width, height / img.height) * 0.9;
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        setHasSignature(true);
        setIsUsingSaved(true);
        onSignatureChange?.(savedSignature);
      };
      img.src = savedSignature;
    }
  }, [width, height, savedSignature, showSavedOption, onSignatureChange]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  }, []);

  const saveCurrentState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory(prev => [...prev, imageData]);
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    const point = getCoordinates(e);
    if (!point) return;

    saveCurrentState();
    setIsDrawing(true);
    setIsUsingSaved(false);
    lastPointRef.current = point;
  }, [disabled, getCoordinates, saveCurrentState]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;

    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCoordinates(e);
    if (!point || !lastPointRef.current) return;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
    setHasSignature(true);
  }, [isDrawing, disabled, getCoordinates]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    lastPointRef.current = null;

    // Get signature data and notify parent
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const signatureData = canvas.toDataURL('image/png');
      onSignatureChange?.(signatureData);
    }
  }, [isDrawing, hasSignature, onSignatureChange]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setStrokeHistory([]);
    setIsUsingSaved(false);
    onSignatureChange?.(null);
  }, [onSignatureChange]);

  const undoLastStroke = useCallback(() => {
    if (strokeHistory.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...strokeHistory];
    const lastState = newHistory.pop();
    
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
      setStrokeHistory(newHistory);
      
      // Check if canvas is now empty
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const isEmpty = imageData.data.every((value) => value === 0 || value === 255);
      
      if (isEmpty || newHistory.length === 0) {
        setHasSignature(false);
        onSignatureChange?.(null);
      } else {
        const signatureData = canvas.toDataURL('image/png');
        onSignatureChange?.(signatureData);
      }
    }
  }, [strokeHistory, onSignatureChange]);

  const handleSaveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature || isUsingSaved) return;

    const signatureData = canvas.toDataURL('image/png');
    onSaveSignature?.(signatureData);
  }, [hasSignature, isUsingSaved, onSaveSignature]);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-2">
        {/* Canvas for drawing */}
        <div 
          className={cn(
            "flex-1 border-2 border-dashed rounded-lg overflow-hidden transition-colors bg-white",
            disabled ? "border-muted bg-muted/20 cursor-not-allowed" : "border-border hover:border-primary/50",
            isDrawing && "border-primary"
          )}
        >
          <canvas
            ref={canvasRef}
            className={cn(
              "touch-none w-full",
              disabled ? "cursor-not-allowed" : "cursor-crosshair"
            )}
            style={{ height: `${height}px` }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        {/* Side toolbar with icons */}
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={undoLastStroke}
                  disabled={disabled || strokeHistory.length === 0}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Undo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearCanvas}
                  disabled={disabled || !hasSignature}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Clear</TooltipContent>
            </Tooltip>

            {onSaveSignature && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSaveSignature}
                    disabled={disabled || !hasSignature || isUsingSaved}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Save for future</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        {disabled 
          ? "Signature is disabled" 
          : isUsingSaved 
            ? "Using your saved signature • Draw to replace"
            : "Draw your signature above"
        }
      </p>
    </div>
  );
};

export default SignatureCanvas;
