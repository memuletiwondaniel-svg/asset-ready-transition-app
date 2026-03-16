import React, { useRef, useState, useEffect } from 'react';
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

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const handleMouseUp = () => setIsDrawing(false);

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
      <DialogContent className="sm:max-w-md !z-[250]">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Signature</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={savedSignature ? 'saved' : 'draw'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw" className="text-xs">Draw New</TabsTrigger>
            <TabsTrigger value="saved" disabled={!savedSignature} className="text-xs">
              Use Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-3">
            <div className="border border-border rounded-lg bg-background p-1 relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={160}
                className="w-full cursor-crosshair rounded"
                style={{ touchAction: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground">Draw your signature here</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1.5 text-xs">
                <Eraser className="h-3.5 w-3.5" />
                Clear
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleSaveAndConfirm} disabled={!hasDrawn} className="gap-1.5 text-xs">
                Save & Use
              </Button>
              <Button size="sm" onClick={handleConfirmDraw} disabled={!hasDrawn} className="gap-1.5 text-xs">
                <Check className="h-3.5 w-3.5" />
                Place Signature
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-3">
            {savedSignature && (
              <div className="border border-border rounded-lg bg-background p-4 flex items-center justify-center">
                <img src={savedSignature} alt="Saved signature" className="max-h-[120px] object-contain" />
              </div>
            )}
            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={handleUseSaved} className="gap-1.5 text-xs">
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
