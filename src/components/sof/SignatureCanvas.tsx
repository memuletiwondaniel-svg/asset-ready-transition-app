import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, RotateCcw, Save, Trash2, Check, Pen } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [useSaved, setUseSaved] = useState(false);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const lastPointRef = useRef<Point | null>(null);

  // Initialize canvas
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

    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  // Handle saved signature selection
  useEffect(() => {
    if (useSaved && savedSignature) {
      onSignatureChange?.(savedSignature);
    }
  }, [useSaved, savedSignature, onSignatureChange]);

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
    if (disabled || useSaved) return;
    
    e.preventDefault();
    const point = getCoordinates(e);
    if (!point) return;

    saveCurrentState();
    setIsDrawing(true);
    lastPointRef.current = point;
  }, [disabled, useSaved, getCoordinates, saveCurrentState]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled || useSaved) return;

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
  }, [isDrawing, disabled, useSaved, getCoordinates]);

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

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setStrokeHistory([]);
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
      const isEmpty = imageData.data.every((value, index) => {
        // Check if all pixels are white (255, 255, 255, 255)
        return value === 255;
      });
      
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
    if (!canvas || !hasSignature) return;

    const signatureData = canvas.toDataURL('image/png');
    onSaveSignature?.(signatureData);
  }, [hasSignature, onSaveSignature]);

  const handleUseSaved = useCallback(() => {
    setUseSaved(true);
    clearCanvas();
  }, [clearCanvas]);

  const handleDrawNew = useCallback(() => {
    setUseSaved(false);
    onSignatureChange?.(null);
  }, [onSignatureChange]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Pen className="h-4 w-4" />
          Signature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Option to use saved signature */}
        {showSavedOption && savedSignature && (
          <div className="flex gap-2 mb-3">
            <Button
              type="button"
              variant={useSaved ? "default" : "outline"}
              size="sm"
              onClick={handleUseSaved}
              disabled={disabled}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-1" />
              Use Saved Signature
            </Button>
            <Button
              type="button"
              variant={!useSaved ? "default" : "outline"}
              size="sm"
              onClick={handleDrawNew}
              disabled={disabled}
              className="flex-1"
            >
              <Pen className="h-4 w-4 mr-1" />
              Draw New
            </Button>
          </div>
        )}

        {/* Saved signature preview */}
        {useSaved && savedSignature ? (
          <div className="border-2 border-primary rounded-lg p-2 bg-white">
            <img 
              src={savedSignature} 
              alt="Saved signature" 
              className="max-h-[150px] mx-auto"
            />
            <p className="text-xs text-center text-muted-foreground mt-2">
              Using your saved signature
            </p>
          </div>
        ) : (
          <>
            {/* Canvas for drawing */}
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg overflow-hidden transition-colors",
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

            {/* Instructions */}
            <p className="text-xs text-muted-foreground text-center">
              {disabled ? "Signature is disabled" : "Draw your signature above using mouse or touch"}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={undoLastStroke}
                disabled={disabled || strokeHistory.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                disabled={disabled || !hasSignature}
              >
                <Eraser className="h-4 w-4 mr-1" />
                Clear
              </Button>
              {onSaveSignature && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSaveSignature}
                  disabled={disabled || !hasSignature}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save for Future
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SignatureCanvas;
