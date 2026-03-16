import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Annotation, AnnotationType } from '@/hooks/useAttachmentCollaboration';
import type { ToolMode } from './AnnotationToolbar';
import { MessageCircle, Check } from 'lucide-react';
import { SignaturePadDialog } from './SignaturePadDialog';

interface AnnotationLayerProps {
  annotations: Annotation[];
  activeTool: ToolMode;
  activeColor: string;
  pageNumber: number;
  onCreateAnnotation: (params: {
    annotation_type: AnnotationType;
    page_number: number;
    position_data: any;
    content?: string;
    color?: string;
  }) => void;
  onUpdateAnnotation: (params: { id: string; content?: string; resolved?: boolean; color?: string; position_data?: any }) => void;
  onSelectAnnotation: (annotation: Annotation | null) => void;
  selectedAnnotationId: string | null;
}

const STAMP_LABELS = ['Approved', 'Rejected', 'For Review', 'Needs Revision'];

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  annotations,
  activeTool,
  activeColor,
  pageNumber,
  onCreateAnnotation,
  onUpdateAnnotation,
  onSelectAnnotation,
  selectedAnnotationId,
}) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [drawingPath, setDrawingPath] = useState<string>('');
  const [showStampMenu, setShowStampMenu] = useState<{ x: number; y: number } | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signaturePos, setSignaturePos] = useState<{ x: number; y: number } | null>(null);

  // Drag-to-move state
  const [draggingAnnotation, setDraggingAnnotation] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Optimistic positions to prevent bounce-back
  const [optimisticPositions, setOptimisticPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Resize state
  const [resizing, setResizing] = useState<{ id: string; corner: string; startX: number; startY: number; origW: number; origH: number; origPosX: number; origPosY: number } | null>(null);

  // Text box drawing state
  const [textBoxDraw, setTextBoxDraw] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);

  // Clear optimistic positions when annotations update
  useEffect(() => {
    setOptimisticPositions({});
  }, [annotations]);

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    if (!layerRef.current) return { x: 0, y: 0 };
    const rect = layerRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const pageAnnotations = annotations.filter(a => a.page_number === pageNumber);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'pointer') return;
    e.preventDefault();
    const pos = getRelativePos(e);

    if (activeTool === 'comment_pin') {
      const content = prompt('Enter comment:');
      if (content) {
        onCreateAnnotation({
          annotation_type: 'comment_pin',
          page_number: pageNumber,
          position_data: { x: pos.x, y: pos.y },
          content,
          color: activeColor,
        });
      }
      return;
    }

    if (activeTool === 'text_box') {
      setTextBoxDraw({ start: pos, current: pos });
      return;
    }

    if (activeTool === 'stamp') {
      setShowStampMenu(pos);
      return;
    }

    if (activeTool === 'signature') {
      setSignaturePos(pos);
      setShowSignaturePad(true);
      return;
    }

    if (activeTool === 'drawing') {
      setDrawingPath(`M ${pos.x} ${pos.y}`);
      setDragStart(pos);
      return;
    }

    // Highlight
    setDragStart(pos);
    setDragCurrent(pos);
  }, [activeTool, pageNumber, activeColor, getRelativePos, onCreateAnnotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getRelativePos(e);

    // Resizing
    if (resizing) {
      const dx = pos.x - resizing.startX;
      const dy = pos.y - resizing.startY;
      // handled in mouseup
      setResizing(prev => prev ? { ...prev, _dx: dx, _dy: dy } as any : null);
      // Update drag current for visual preview
      setDragCurrent(pos);
      return;
    }

    // Dragging annotation
    if (draggingAnnotation) {
      setDragOffset({
        dx: pos.x - draggingAnnotation.startX,
        dy: pos.y - draggingAnnotation.startY,
      });
      return;
    }

    // Text box drawing
    if (textBoxDraw) {
      setTextBoxDraw(prev => prev ? { ...prev, current: pos } : null);
      return;
    }

    if (!dragStart) return;

    if (activeTool === 'drawing') {
      setDrawingPath(prev => `${prev} L ${pos.x} ${pos.y}`);
      return;
    }

    if (activeTool === 'highlight') {
      setDragCurrent(pos);
    }
  }, [dragStart, activeTool, getRelativePos, draggingAnnotation, textBoxDraw, resizing]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Finish resize
    if (resizing) {
      const pos = getRelativePos(e);
      const dx = pos.x - resizing.startX;
      const dy = pos.y - resizing.startY;
      const ann = annotations.find(a => a.id === resizing.id);
      if (ann) {
        let newW = resizing.origW;
        let newH = resizing.origH;
        let newX = resizing.origPosX;
        let newY = resizing.origPosY;

        if (resizing.corner.includes('r')) newW = Math.max(5, resizing.origW + dx);
        if (resizing.corner.includes('l')) { newW = Math.max(5, resizing.origW - dx); newX = resizing.origPosX + dx; }
        if (resizing.corner.includes('b')) newH = Math.max(3, resizing.origH + dy);
        if (resizing.corner.includes('t')) { newH = Math.max(3, resizing.origH - dy); newY = resizing.origPosY + dy; }

        onUpdateAnnotation({
          id: ann.id,
          position_data: { ...ann.position_data, x: newX, y: newY, width: newW, height: newH },
        });
      }
      setResizing(null);
      setDragCurrent(null);
      return;
    }

    // Finish annotation drag
    if (draggingAnnotation) {
      const ann = annotations.find(a => a.id === draggingAnnotation.id);
      if (ann && (Math.abs(dragOffset.dx) > 0.5 || Math.abs(dragOffset.dy) > 0.5)) {
        const newX = draggingAnnotation.origX + dragOffset.dx;
        const newY = draggingAnnotation.origY + dragOffset.dy;
        // Set optimistic position to prevent bounce-back
        setOptimisticPositions(prev => ({ ...prev, [ann.id]: { x: newX, y: newY } }));

        const newPos = { ...ann.position_data, x: newX, y: newY };
        // Also update anchor if it exists (for text boxes with arrows)
        if (ann.position_data.anchor) {
          newPos.anchor = {
            x: ann.position_data.anchor.x + dragOffset.dx,
            y: ann.position_data.anchor.y + dragOffset.dy,
          };
        }
        onUpdateAnnotation({ id: ann.id, position_data: newPos });
      }
      setDraggingAnnotation(null);
      setDragOffset({ dx: 0, dy: 0 });
      return;
    }

    // Finish text box drawing
    if (textBoxDraw) {
      const anchorPt = { x: textBoxDraw.start.x, y: textBoxDraw.start.y };
      const x = Math.min(textBoxDraw.start.x, textBoxDraw.current.x);
      const y = Math.min(textBoxDraw.start.y, textBoxDraw.current.y);
      const w = Math.abs(textBoxDraw.current.x - textBoxDraw.start.x);
      const h = Math.abs(textBoxDraw.current.y - textBoxDraw.start.y);
      setTextBoxDraw(null);

      if (w > 2 && h > 1) {
        const content = prompt('Enter text:');
        if (content) {
          // Place the text box offset from anchor so arrow is visible
          const boxX = x + w + 2; // offset right of the drawn area
          const boxY = y;
          onCreateAnnotation({
            annotation_type: 'text_box',
            page_number: pageNumber,
            position_data: {
              x: boxX, y: boxY, width: w, height: h,
              anchor: anchorPt,
            },
            content,
            color: activeColor,
          });
        }
      }
      return;
    }

    if (!dragStart) return;

    if (activeTool === 'highlight' && dragCurrent) {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);
      if (w > 1 && h > 1) {
        onCreateAnnotation({
          annotation_type: 'highlight',
          page_number: pageNumber,
          position_data: { x, y, width: w, height: h },
          color: activeColor,
        });
      }
    }

    if (activeTool === 'drawing' && drawingPath.length > 10) {
      onCreateAnnotation({
        annotation_type: 'drawing',
        page_number: pageNumber,
        position_data: { x: 0, y: 0, path: drawingPath },
        color: activeColor,
      });
    }

    setDragStart(null);
    setDragCurrent(null);
    setDrawingPath('');
  }, [dragStart, dragCurrent, activeTool, drawingPath, pageNumber, activeColor, onCreateAnnotation, draggingAnnotation, dragOffset, annotations, onUpdateAnnotation, textBoxDraw, resizing, getRelativePos]);

  const handleStampSelect = (label: string) => {
    if (!showStampMenu) return;
    onCreateAnnotation({
      annotation_type: 'stamp',
      page_number: pageNumber,
      position_data: { x: showStampMenu.x, y: showStampMenu.y },
      content: label,
      color: activeColor,
    });
    setShowStampMenu(null);
  };

  const handleSignatureConfirm = (signatureDataUrl: string) => {
    if (!signaturePos) return;
    onCreateAnnotation({
      annotation_type: 'signature',
      page_number: pageNumber,
      position_data: { x: signaturePos.x, y: signaturePos.y, width: 15, height: 6, signatureData: signatureDataUrl },
      color: activeColor,
    });
    setShowSignaturePad(false);
    setSignaturePos(null);
  };

  const startDragAnnotation = (e: React.MouseEvent, ann: Annotation) => {
    if (activeTool !== 'pointer') return;
    e.stopPropagation();
    e.preventDefault();
    const pos = getRelativePos(e);
    const currentPos = getDisplayPos(ann);
    setDraggingAnnotation({
      id: ann.id,
      startX: pos.x,
      startY: pos.y,
      origX: currentPos.x,
      origY: currentPos.y,
    });
    setDragOffset({ dx: 0, dy: 0 });
    onSelectAnnotation(ann);
  };

  const startResize = (e: React.MouseEvent, ann: Annotation, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = getRelativePos(e);
    const currentPos = getDisplayPos(ann);
    setResizing({
      id: ann.id,
      corner,
      startX: pos.x,
      startY: pos.y,
      origW: ann.position_data.width || 15,
      origH: ann.position_data.height || 6,
      origPosX: currentPos.x,
      origPosY: currentPos.y,
    });
  };

  const getDisplayPos = (ann: Annotation) => {
    // Priority: dragging > optimistic > actual
    if (draggingAnnotation?.id === ann.id) {
      return {
        x: draggingAnnotation.origX + dragOffset.dx,
        y: draggingAnnotation.origY + dragOffset.dy,
      };
    }
    if (optimisticPositions[ann.id]) {
      return optimisticPositions[ann.id];
    }
    return { x: ann.position_data.x, y: ann.position_data.y };
  };

  // Get resize preview dimensions
  const getResizedDims = (ann: Annotation) => {
    if (resizing?.id !== ann.id || !dragCurrent) {
      return { w: ann.position_data.width, h: ann.position_data.height, x: getDisplayPos(ann).x, y: getDisplayPos(ann).y };
    }
    const dx = dragCurrent.x - resizing.startX;
    const dy = dragCurrent.y - resizing.startY;
    let w = resizing.origW;
    let h = resizing.origH;
    let x = resizing.origPosX;
    let y = resizing.origPosY;

    if (resizing.corner.includes('r')) w = Math.max(5, resizing.origW + dx);
    if (resizing.corner.includes('l')) { w = Math.max(5, resizing.origW - dx); x = resizing.origPosX + dx; }
    if (resizing.corner.includes('b')) h = Math.max(3, resizing.origH + dy);
    if (resizing.corner.includes('t')) { h = Math.max(3, resizing.origH - dy); y = resizing.origPosY + dy; }

    return { w, h, x, y };
  };

  // Resize handles for selected text_box/signature
  const renderResizeHandles = (ann: Annotation) => {
    if (selectedAnnotationId !== ann.id || activeTool !== 'pointer') return null;
    const displayPos = getDisplayPos(ann);
    const w = ann.position_data.width || 15;
    const h = ann.position_data.height || 6;

    const handles = [
      { corner: 'tl', style: { left: `${displayPos.x}%`, top: `${displayPos.y}%`, transform: 'translate(-50%, -50%)' } },
      { corner: 'tr', style: { left: `${displayPos.x + w}%`, top: `${displayPos.y}%`, transform: 'translate(-50%, -50%)' } },
      { corner: 'bl', style: { left: `${displayPos.x}%`, top: `${displayPos.y + h}%`, transform: 'translate(-50%, -50%)' } },
      { corner: 'br', style: { left: `${displayPos.x + w}%`, top: `${displayPos.y + h}%`, transform: 'translate(-50%, -50%)' } },
    ];

    return handles.map(({ corner, style }) => (
      <div
        key={`${ann.id}-${corner}`}
        className="absolute w-2.5 h-2.5 bg-primary border border-primary-foreground rounded-sm cursor-nwse-resize z-20"
        style={style}
        onMouseDown={(e) => startResize(e, ann, corner)}
      />
    ));
  };

  // Preview highlight rect
  const previewRect = dragStart && dragCurrent && activeTool === 'highlight' ? {
    x: Math.min(dragStart.x, dragCurrent.x),
    y: Math.min(dragStart.y, dragCurrent.y),
    w: Math.abs(dragCurrent.x - dragStart.x),
    h: Math.abs(dragCurrent.y - dragStart.y),
  } : null;

  // Text box draw preview
  const textBoxPreview = textBoxDraw ? {
    x: Math.min(textBoxDraw.start.x, textBoxDraw.current.x),
    y: Math.min(textBoxDraw.start.y, textBoxDraw.current.y),
    w: Math.abs(textBoxDraw.current.x - textBoxDraw.start.x),
    h: Math.abs(textBoxDraw.current.y - textBoxDraw.start.y),
  } : null;

  return (
    <>
      <div
        ref={layerRef}
        className={cn(
          'absolute inset-0 z-10',
          activeTool !== 'pointer' && 'cursor-crosshair'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Existing annotations */}
        {pageAnnotations.map((ann) => {
          const pos = ann.position_data;
          const isSelected = selectedAnnotationId === ann.id;
          const isDragging = draggingAnnotation?.id === ann.id;
          const displayPos = getDisplayPos(ann);

          if (ann.annotation_type === 'highlight') {
            return (
              <div
                key={ann.id}
                className={cn(
                  'absolute rounded-sm transition-colors',
                  isSelected && 'ring-2 ring-primary',
                  ann.resolved && 'opacity-40'
                )}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  width: `${pos.width}%`,
                  height: `${pos.height}%`,
                  backgroundColor: `${ann.color}33`,
                  border: `2px solid ${ann.color}88`,
                }}
                onClick={(e) => { e.stopPropagation(); onSelectAnnotation(isSelected ? null : ann); }}
              />
            );
          }

          if (ann.annotation_type === 'comment_pin') {
            return (
              <div
                key={ann.id}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 hover:scale-110',
                  isSelected && 'scale-125',
                  activeTool === 'pointer' && 'cursor-grab',
                  isDragging && 'cursor-grabbing'
                )}
                style={{ left: `${displayPos.x}%`, top: `${displayPos.y}%` }}
                onMouseDown={(e) => startDragAnnotation(e, ann)}
                onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelectAnnotation(isSelected ? null : ann); }}
              >
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-full shadow-md"
                  style={{ backgroundColor: ann.color }}
                >
                  {ann.resolved ? (
                    <Check className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <MessageCircle className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
              </div>
            );
          }

          if (ann.annotation_type === 'text_box') {
            const anchor = pos.anchor as { x: number; y: number } | undefined;
            const dims = getResizedDims(ann);
            return (
              <React.Fragment key={ann.id}>
                {/* Arrow from anchor to text box */}
                {anchor && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-[9]" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <marker id={`arrowhead-${ann.id}`} markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                        <polygon points="0 0, 6 2, 0 4" fill={ann.color} />
                      </marker>
                    </defs>
                    <line
                      x1={anchor.x}
                      y1={anchor.y}
                      x2={dims.x ?? displayPos.x}
                      y2={(dims.y ?? displayPos.y) + (dims.h || 0) / 2}
                      stroke={ann.color}
                      strokeWidth="0.2"
                      markerEnd={`url(#arrowhead-${ann.id})`}
                    />
                  </svg>
                )}
                <div
                  className={cn(
                    'absolute px-2 py-1 text-xs rounded border shadow-sm bg-card overflow-auto',
                    isSelected && 'ring-2 ring-primary',
                    activeTool === 'pointer' && 'cursor-grab',
                    isDragging && 'cursor-grabbing'
                  )}
                  style={{
                    left: `${dims.x ?? displayPos.x}%`,
                    top: `${dims.y ?? displayPos.y}%`,
                    width: dims.w ? `${dims.w}%` : undefined,
                    height: dims.h ? `${dims.h}%` : undefined,
                    borderColor: ann.color,
                  }}
                  onMouseDown={(e) => startDragAnnotation(e, ann)}
                  onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelectAnnotation(isSelected ? null : ann); }}
                >
                  {ann.content}
                </div>
                {renderResizeHandles(ann)}
              </React.Fragment>
            );
          }

          if (ann.annotation_type === 'stamp') {
            return (
              <div
                key={ann.id}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2',
                  isSelected && 'ring-2 ring-primary rounded',
                  activeTool === 'pointer' && 'cursor-grab',
                  isDragging && 'cursor-grabbing'
                )}
                style={{ left: `${displayPos.x}%`, top: `${displayPos.y}%` }}
                onMouseDown={(e) => startDragAnnotation(e, ann)}
                onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelectAnnotation(isSelected ? null : ann); }}
              >
                <div
                  className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded border-2 rotate-[-12deg] opacity-80"
                  style={{ borderColor: ann.color, color: ann.color }}
                >
                  {ann.content}
                </div>
              </div>
            );
          }

          if (ann.annotation_type === 'signature' && pos.signatureData) {
            const dims = getResizedDims(ann);
            return (
              <React.Fragment key={ann.id}>
                <div
                  className={cn(
                    'absolute',
                    isSelected && 'ring-2 ring-primary rounded',
                    activeTool === 'pointer' && 'cursor-grab',
                    isDragging && 'cursor-grabbing'
                  )}
                  style={{
                    left: `${dims.x ?? displayPos.x}%`,
                    top: `${dims.y ?? displayPos.y}%`,
                    width: `${dims.w || 15}%`,
                    height: dims.h ? `${dims.h}%` : undefined,
                  }}
                  onMouseDown={(e) => startDragAnnotation(e, ann)}
                  onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelectAnnotation(isSelected ? null : ann); }}
                >
                  <img
                    src={pos.signatureData}
                    alt="Signature"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                </div>
                {renderResizeHandles(ann)}
              </React.Fragment>
            );
          }

          if (ann.annotation_type === 'drawing' && pos.path) {
            return (
              <svg key={ann.id} className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  d={pos.path}
                  fill="none"
                  stroke={ann.color}
                  strokeWidth="0.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(ann.resolved && 'opacity-40')}
                />
              </svg>
            );
          }

          return null;
        })}

        {/* Preview highlight */}
        {previewRect && (
          <div
            className="absolute rounded-sm pointer-events-none"
            style={{
              left: `${previewRect.x}%`,
              top: `${previewRect.y}%`,
              width: `${previewRect.w}%`,
              height: `${previewRect.h}%`,
              backgroundColor: `${activeColor}22`,
              border: `2px dashed ${activeColor}`,
            }}
          />
        )}

        {/* Text box draw preview with arrow */}
        {textBoxPreview && textBoxDraw && (
          <>
            <div
              className="absolute rounded pointer-events-none"
              style={{
                left: `${textBoxPreview.x}%`,
                top: `${textBoxPreview.y}%`,
                width: `${textBoxPreview.w}%`,
                height: `${textBoxPreview.h}%`,
                backgroundColor: `${activeColor}11`,
                border: `2px dashed ${activeColor}`,
              }}
            />
            {/* Preview arrow from start to box */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[9]" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line
                x1={textBoxDraw.start.x}
                y1={textBoxDraw.start.y}
                x2={textBoxPreview.x + textBoxPreview.w}
                y2={textBoxPreview.y + textBoxPreview.h / 2}
                stroke={activeColor}
                strokeWidth="0.2"
                strokeDasharray="0.5"
              />
            </svg>
          </>
        )}

        {/* Drawing preview */}
        {drawingPath && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={drawingPath} fill="none" stroke={activeColor} strokeWidth="0.3" strokeLinecap="round" />
          </svg>
        )}

        {/* Stamp menu */}
        {showStampMenu && (
          <div
            className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[140px]"
            style={{ left: `${showStampMenu.x}%`, top: `${showStampMenu.y}%` }}
          >
            {STAMP_LABELS.map((label) => (
              <button
                key={label}
                className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-accent rounded transition-colors"
                onClick={(e) => { e.stopPropagation(); handleStampSelect(label); }}
              >
                {label}
              </button>
            ))}
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded"
              onClick={(e) => { e.stopPropagation(); setShowStampMenu(null); }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Signature pad dialog */}
      <SignaturePadDialog
        open={showSignaturePad}
        onClose={() => { setShowSignaturePad(false); setSignaturePos(null); }}
        onConfirm={handleSignatureConfirm}
      />
    </>
  );
};
