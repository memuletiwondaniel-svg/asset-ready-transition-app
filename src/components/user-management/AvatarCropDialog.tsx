import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ZoomIn, ZoomOut, RotateCw, Circle, RectangleHorizontal, RectangleVertical } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

export const AvatarCropDialog: React.FC<AvatarCropDialogProps> = ({
  open,
  imageSrc,
  onCropComplete,
  onCancel
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [cropShape, setCropShape] = useState<'round' | 'rect'>('round');
  
  // Image filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  const onCropChange = (location: Point) => {
    setCrop(location);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createCroppedImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx || !croppedAreaPixels) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas size to the cropped area
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        // Apply filters
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

        // Draw the cropped image
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        // Reset filter for clean output
        ctx.filter = 'none';

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.95);
      };
      image.onerror = () => reject(new Error('Failed to load image'));
    });
  };

  const handleAspectRatioChange = (ratio: number, shape: 'round' | 'rect') => {
    setAspectRatio(ratio);
    setCropShape(shape);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      setLoading(true);
      const croppedBlob = await createCroppedImage();
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Avatar Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aspect Ratio Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Aspect Ratio</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={aspectRatio === 1 && cropShape === 'round' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAspectRatioChange(1, 'round')}
                className="flex items-center gap-2"
              >
                <Circle className="h-4 w-4" />
                Circle (1:1)
              </Button>
              <Button
                type="button"
                variant={aspectRatio === 1 && cropShape === 'rect' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAspectRatioChange(1, 'rect')}
                className="flex items-center gap-2"
              >
                <RectangleHorizontal className="h-4 w-4" />
                Square (1:1)
              </Button>
              <Button
                type="button"
                variant={aspectRatio === 4/3 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAspectRatioChange(4/3, 'rect')}
                className="flex items-center gap-2"
              >
                <RectangleHorizontal className="h-4 w-4" />
                4:3
              </Button>
              <Button
                type="button"
                variant={aspectRatio === 16/9 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAspectRatioChange(16/9, 'rect')}
                className="flex items-center gap-2"
              >
                <RectangleVertical className="h-4 w-4" />
                16:9
              </Button>
            </div>
          </div>

          {/* Cropper */}
          <div className="relative w-full h-96 bg-muted rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={0.5}
              maxZoom={3}
              rotation={rotation}
              aspect={aspectRatio}
              cropShape={cropShape}
              showGrid={cropShape === 'rect'}
              restrictPosition={false}
              objectFit="contain"
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onRotationChange={setRotation}
              onCropComplete={onCropCompleteHandler}
            />
          </div>

          <Tabs defaultValue="adjustments" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
            </TabsList>

            <TabsContent value="adjustments" className="space-y-4 pt-4">
              {/* Zoom Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Zoom</Label>
                  <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-4">
                  <ZoomOut className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[zoom]}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onValueChange={(value) => setZoom(value[0])}
                    className="flex-1"
                  />
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Rotation Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Rotation</Label>
                  <span className="text-xs text-muted-foreground">{rotation}°</span>
                </div>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[rotation]}
                    min={0}
                    max={360}
                    step={1}
                    onValueChange={(value) => setRotation(value[0])}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                    title="Rotate 90°"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4 pt-4">
              {/* Brightness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Brightness</Label>
                  <span className="text-xs text-muted-foreground">{brightness}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  min={50}
                  max={150}
                  step={1}
                  onValueChange={(value) => setBrightness(value[0])}
                />
              </div>

              {/* Contrast */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Contrast</Label>
                  <span className="text-xs text-muted-foreground">{contrast}%</span>
                </div>
                <Slider
                  value={[contrast]}
                  min={50}
                  max={150}
                  step={1}
                  onValueChange={(value) => setContrast(value[0])}
                />
              </div>

              {/* Saturation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Saturation</Label>
                  <span className="text-xs text-muted-foreground">{saturation}%</span>
                </div>
                <Slider
                  value={[saturation]}
                  min={0}
                  max={200}
                  step={1}
                  onValueChange={(value) => setSaturation(value[0])}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="w-full"
              >
                Reset Filters
              </Button>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center">
            Drag to reposition • Pinch or scroll to zoom • Adjust filters to enhance your image
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !croppedAreaPixels}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
