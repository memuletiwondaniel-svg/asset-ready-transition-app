import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eraser, Check } from 'lucide-react';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useUserSignature } from '@/hooks/useUserSignature';

interface SignaturePadDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (signatureDataUrl: string) => void;
}

export const SignaturePadDialog: React.FC<SignaturePadDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const { user } = useAuth();
  const { signatureData: savedSignature, saveSignature } = useUserSignature(user?.id);

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
      }
    }
  }, [open]);

  const getPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(x, y);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [getPos]);

  const moveDraw = useCallback((x: number, y: number) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  }, [isDrawing, getPos]);

  const endDraw = useCallback(() => setIsDrawing(false), []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => startDraw(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => moveDraw(e.clientX, e.clientY);
  const handleMouseUp = () => endDraw();

  // Touch events
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    startDraw(t.clientX, t.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    moveDraw(t.clientX, t.clientY);
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    endDraw();
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasDrawn(false);
    }
  };

  const handleConfirmDraw = () => {
    if (!canvasRef.current || !hasDrawn) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onConfirm(dataUrl);
  };

  const handleUseSaved = () => {
    if (savedSignature) {
      onConfirm(savedSignature);
    }
  };

  const handleSaveAndConfirm = () => {
    if (!canvasRef.current || !hasDrawn) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    saveSignature.mutate(dataUrl);
    onConfirm(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-md !z-[250] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Signature</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={savedSignature ? 'saved' : 'draw'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw" className="text-xs min-h-[36px]">Draw New</TabsTrigger>
            <TabsTrigger value="saved" disabled={!savedSignature} className="text-xs min-h-[36px]">
              Use Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-3">
            <div className="border border-border rounded-lg bg-background p-1 relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={160}
                className="w-full h-[120px] sm:h-[160px] cursor-crosshair rounded"
                style={{ touchAction: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground">Draw your signature here</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1.5 text-xs min-h-[36px]">
                <Eraser className="h-3.5 w-3.5" />
                Clear
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleSaveAndConfirm} disabled={!hasDrawn} className="gap-1.5 text-xs min-h-[36px]">
                Save & Use
              </Button>
              <Button size="sm" onClick={handleConfirmDraw} disabled={!hasDrawn} className="gap-1.5 text-xs min-h-[36px]">
                <Check className="h-3.5 w-3.5" />
                Place
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-3">
            {savedSignature && (
              <div className="border border-border rounded-lg bg-background p-4 flex items-center justify-center">
                <img src={savedSignature} alt="Saved signature" className="max-h-[100px] sm:max-h-[120px] object-contain" />
              </div>
            )}
            <DialogFooter className="mt-3 flex-row gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs min-h-[36px] flex-1 sm:flex-none">Cancel</Button>
              <Button size="sm" onClick={handleUseSaved} className="gap-1.5 text-xs min-h-[36px] flex-1 sm:flex-none">
                <Check className="h-3.5 w-3.5" />
                Place Signature
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
