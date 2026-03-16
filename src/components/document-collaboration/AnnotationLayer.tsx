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

// Edge detection threshold in % units
const EDGE_ZONE = 1.2;

type EdgeZone = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'body' | 'none';

const edgeCursors: Record<EdgeZone, string> = {
  tl: 'cursor-nwse-resize',
  br: 'cursor-nwse-resize',
  tr: 'cursor-nesw-resize',
  bl: 'cursor-nesw-resize',
  t: 'cursor-ns-resize',
  b: 'cursor-ns-resize',
  l: 'cursor-ew-resize',
  r: 'cursor-ew-resize',
  body: 'cursor-grab',
  none: '',
};

function getEdgeZone(
  mouseX: number, mouseY: number,
  boxX: number, boxY: number, boxW: number, boxH: number
): EdgeZone {
  const inBox = mouseX >= boxX - EDGE_ZONE && mouseX <= boxX + boxW + EDGE_ZONE &&
                mouseY >= boxY - EDGE_ZONE && mouseY <= boxY + boxH + EDGE_ZONE;
  if (!inBox) return 'none';

  const nearL = Math.abs(mouseX - boxX) < EDGE_ZONE;
  const nearR = Math.abs(mouseX - (boxX + boxW)) < EDGE_ZONE;
  const nearT = Math.abs(mouseY - boxY) < EDGE_ZONE;
  const nearB = Math.abs(mouseY - (boxY + boxH)) < EDGE_ZONE;

  if (nearT && nearL) return 'tl';
  if (nearT && nearR) return 'tr';
  if (nearB && nearL) return 'bl';
  if (nearB && nearR) return 'br';
  if (nearT) return 't';
  if (nearB) return 'b';
  if (nearL) return 'l';
  if (nearR) return 'r';
  return 'body';
}

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

  // Arrow tip dragging state
  const [draggingAnchor, setDraggingAnchor] = useState<{ id: string; startX: number; startY: number; origAnchor: { x: number; y: number } } | null>(null);
  const [anchorOffset, setAnchorOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

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

    // Dragging arrow tip
    if (draggingAnchor) {
      setAnchorOffset({
        dx: pos.x - draggingAnchor.startX,
        dy: pos.y - draggingAnchor.startY,
      });
      return;
    }

    // Resizing
    if (resizing) {
      const dx = pos.x - resizing.startX;
      const dy = pos.y - resizing.startY;
      setResizing(prev => prev ? { ...prev, _dx: dx, _dy: dy } as any : null);
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
  }, [dragStart, activeTool, getRelativePos, draggingAnnotation, textBoxDraw, resizing, draggingAnchor]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Finish anchor drag
    if (draggingAnchor) {
      const pos = getRelativePos(e);
      const ann = annotations.find(a => a.id === draggingAnchor.id);
      if (ann) {
        const newAnchor = {
          x: draggingAnchor.origAnchor.x + (pos.x - draggingAnchor.startX),
          y: draggingAnchor.origAnchor.y + (pos.y - draggingAnchor.startY),
        };
        onUpdateAnnotation({
          id: ann.id,
          position_data: { ...ann.position_data, anchor: newAnchor },
        });
      }
      setDraggingAnchor(null);
      setAnchorOffset({ dx: 0, dy: 0 });
      return;
    }

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

    // Finish annotation drag — anchor stays independent
    if (draggingAnnotation) {
      const ann = annotations.find(a => a.id === draggingAnnotation.id);
      if (ann && (Math.abs(dragOffset.dx) > 0.5 || Math.abs(dragOffset.dy) > 0.5)) {
        const newX = draggingAnnotation.origX + dragOffset.dx;
        const newY = draggingAnnotation.origY + dragOffset.dy;
        setOptimisticPositions(prev => ({ ...prev, [ann.id]: { x: newX, y: newY } }));

        // Do NOT move anchor — it stays independent
        const newPos = { ...ann.position_data, x: newX, y: newY };
        onUpdateAnnotation({ id: ann.id, position_data: newPos });
      }
      setDraggingAnnotation(null);
      setDragOffset({ dx: 0, dy: 0 });
      return;
    }

    // Finish text box drawing
    if (textBoxDraw) {
      const x = Math.min(textBoxDraw.start.x, textBoxDraw.current.x);
      const y = Math.min(textBoxDraw.start.y, textBoxDraw.current.y);
      const w = Math.abs(textBoxDraw.current.x - textBoxDraw.start.x);
      const h = Math.abs(textBoxDraw.current.y - textBoxDraw.start.y);
      setTextBoxDraw(null);

      if (w > 2 && h > 1) {
        const content = prompt('Enter text:');
        if (content) {
          // Place box where drawn, anchor offset to the left so arrow protrudes
          const anchorPt = { x: x - 5, y: y + h / 2 };
          onCreateAnnotation({
            annotation_type: 'text_box',
            page_number: pageNumber,
            position_data: {
              x, y, width: w, height: h,
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
  }, [dragStart, dragCurrent, activeTool, drawingPath, pageNumber, activeColor, onCreateAnnotation, draggingAnnotation, dragOffset, annotations, onUpdateAnnotation, textBoxDraw, resizing, getRelativePos, draggingAnchor]);

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

  const startAnchorDrag = (e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = getRelativePos(e);
    const anchor = ann.position_data.anchor as { x: number; y: number };
    setDraggingAnchor({
      id: ann.id,
      startX: pos.x,
      startY: pos.y,
      origAnchor: { ...anchor },
    });
    setAnchorOffset({ dx: 0, dy: 0 });
  };

  const getDisplayPos = (ann: Annotation) => {
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

  const getDisplayAnchor = (ann: Annotation) => {
    const anchor = ann.position_data.anchor as { x: number; y: number } | undefined;
    if (!anchor) return null;
    if (draggingAnchor?.id === ann.id) {
      return {
        x: draggingAnchor.origAnchor.x + anchorOffset.dx,
        y: draggingAnchor.origAnchor.y + anchorOffset.dy,
      };
    }
    return anchor;
  };

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

  // Edge-based resize zones for text_box and signature
  const renderEdgeResizeZones = (ann: Annotation) => {
    const displayPos = getDisplayPos(ann);
    const w = ann.position_data.width || 15;
    const h = ann.position_data.height || 6;
    const zone = EDGE_ZONE;

    const edges: { corner: string; style: React.CSSProperties; cursor: string }[] = [
      // Corners
      { corner: 'tl', cursor: 'cursor-nwse-resize', style: { left: `${displayPos.x - zone / 2}%`, top: `${displayPos.y - zone / 2}%`, width: `${zone}%`, height: `${zone}%` } },
      { corner: 'tr', cursor: 'cursor-nesw-resize', style: { left: `${displayPos.x + w - zone / 2}%`, top: `${displayPos.y - zone / 2}%`, width: `${zone}%`, height: `${zone}%` } },
      { corner: 'bl', cursor: 'cursor-nesw-resize', style: { left: `${displayPos.x - zone / 2}%`, top: `${displayPos.y + h - zone / 2}%`, width: `${zone}%`, height: `${zone}%` } },
      { corner: 'br', cursor: 'cursor-nwse-resize', style: { left: `${displayPos.x + w - zone / 2}%`, top: `${displayPos.y + h - zone / 2}%`, width: `${zone}%`, height: `${zone}%` } },
      // Edges
      { corner: 't', cursor: 'cursor-ns-resize', style: { left: `${displayPos.x + zone / 2}%`, top: `${displayPos.y - zone / 2}%`, width: `${w - zone}%`, height: `${zone}%` } },
      { corner: 'b', cursor: 'cursor-ns-resize', style: { left: `${displayPos.x + zone / 2}%`, top: `${displayPos.y + h - zone / 2}%`, width: `${w - zone}%`, height: `${zone}%` } },
      { corner: 'l', cursor: 'cursor-ew-resize', style: { left: `${displayPos.x - zone / 2}%`, top: `${displayPos.y + zone / 2}%`, width: `${zone}%`, height: `${h - zone}%` } },
      { corner: 'r', cursor: 'cursor-ew-resize', style: { left: `${displayPos.x + w - zone / 2}%`, top: `${displayPos.y + zone / 2}%`, width: `${zone}%`, height: `${h - zone}%` } },
    ];

    return edges.map(({ corner, style, cursor }) => (
      <div
        key={`${ann.id}-edge-${corner}`}
        className={cn('absolute z-20', cursor)}
        style={style}
        onMouseDown={(e) => startResize(e, ann, corner)}
      />
    ));
  };

  // Arrow tip draggable handle
  const renderArrowTipHandle = (ann: Annotation) => {
    const anchor = getDisplayAnchor(ann);
    if (!anchor) return null;
    const isSelected = selectedAnnotationId === ann.id;
    return (
      <div
        className={cn(
          'absolute z-30 rounded-full border-2 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-60',
          'cursor-crosshair'
        )}
        style={{
          left: `${anchor.x}%`,
          top: `${anchor.y}%`,
          width: 10,
          height: 10,
          transform: 'translate(-50%, -50%)',
          backgroundColor: ann.color,
          borderColor: 'white',
        }}
        onMouseDown={(e) => startAnchorDrag(e, ann)}
      />
    );
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
                  'cursor-grab',
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
            const anchor = getDisplayAnchor(ann);
            const dims = getResizedDims(ann);
            const boxX = dims.x ?? displayPos.x;
            const boxY = dims.y ?? displayPos.y;
            const boxW = dims.w || 15;
            const boxH = dims.h || 6;

            return (
              <React.Fragment key={ann.id}>
                {/* Arrow from anchor to text box edge */}
                {anchor && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-[9]" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <marker id={`arrowhead-${ann.id}`} markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
                        <polygon points="0 0, 6 2, 0 4" fill={ann.color} />
                      </marker>
                    </defs>
                    <line
                      x1={anchor.x}
                      y1={anchor.y}
                      x2={boxX}
                      y2={boxY + boxH / 2}
                      stroke={ann.color}
                      strokeWidth="0.2"
                      markerStart={`url(#arrowhead-${ann.id})`}
                    />
                  </svg>
                )}
                {/* Arrow tip drag handle */}
                {renderArrowTipHandle(ann)}
                {/* Text box */}
                <div
                  className={cn(
                    'absolute px-2 py-1 text-xs rounded border shadow-sm bg-card overflow-auto font-medium',
                    isSelected && 'ring-2 ring-primary',
                    'cursor-grab',
                    isDragging && '!cursor-grabbing'
                  )}
                  style={{
                    left: `${boxX}%`,
                    top: `${boxY}%`,
                    width: `${boxW}%`,
                    height: `${boxH}%`,
                    borderColor: ann.color,
                    color: ann.color,
                  }}
                  onMouseDown={(e) => startDragAnnotation(e, ann)}
                  onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelectAnnotation(isSelected ? null : ann); }}
                >
                  {ann.content}
                </div>
                {/* Edge resize zones */}
                {renderEdgeResizeZones(ann)}
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
                  'cursor-grab',
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
                    'cursor-grab',
                    isDragging && '!cursor-grabbing'
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
                {/* Edge resize zones */}
                {renderEdgeResizeZones(ann)}
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
            {/* Preview arrow from anchor to box left edge */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[9]" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line
                x1={textBoxPreview.x - 5}
                y1={textBoxPreview.y + textBoxPreview.h / 2}
                x2={textBoxPreview.x}
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
