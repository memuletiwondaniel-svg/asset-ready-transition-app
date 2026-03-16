import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Annotation, AnnotationType } from '@/hooks/useAttachmentCollaboration';
import type { ToolMode } from './AnnotationToolbar';
import { MessageCircle, Check } from 'lucide-react';

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
  onSelectAnnotation,
  selectedAnnotationId,
}) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [drawingPath, setDrawingPath] = useState<string>('');
  const [showStampMenu, setShowStampMenu] = useState<{ x: number; y: number } | null>(null);

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
      const content = prompt('Enter text:');
      if (content) {
        onCreateAnnotation({
          annotation_type: 'text_box',
          page_number: pageNumber,
          position_data: { x: pos.x, y: pos.y, width: 20, height: 5 },
          content,
          color: activeColor,
        });
      }
      return;
    }

    if (activeTool === 'stamp') {
      setShowStampMenu(pos);
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
    if (!dragStart) return;
    const pos = getRelativePos(e);

    if (activeTool === 'drawing') {
      setDrawingPath(prev => `${prev} L ${pos.x} ${pos.y}`);
      return;
    }

    if (activeTool === 'highlight') {
      setDragCurrent(pos);
    }
  }, [dragStart, activeTool, getRelativePos]);

  const handleMouseUp = useCallback(() => {
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
  }, [dragStart, dragCurrent, activeTool, drawingPath, pageNumber, activeColor, onCreateAnnotation]);

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

  // Preview highlight rect
  const previewRect = dragStart && dragCurrent && activeTool === 'highlight' ? {
    x: Math.min(dragStart.x, dragCurrent.x),
    y: Math.min(dragStart.y, dragCurrent.y),
    w: Math.abs(dragCurrent.x - dragStart.x),
    h: Math.abs(dragCurrent.y - dragStart.y),
  } : null;

  return (
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

        if (ann.annotation_type === 'highlight') {
          return (
            <div
              key={ann.id}
              className={cn(
                'absolute rounded-sm transition-all',
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
                'absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110',
                isSelected && 'scale-125'
              )}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={(e) => { e.stopPropagation(); onSelectAnnotation(isSelected ? null : ann); }}
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
          return (
            <div
              key={ann.id}
              className={cn(
                'absolute px-2 py-1 text-xs rounded border shadow-sm bg-card',
                isSelected && 'ring-2 ring-primary'
              )}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                borderColor: ann.color,
                maxWidth: '30%',
              }}
              onClick={(e) => { e.stopPropagation(); onSelectAnnotation(isSelected ? null : ann); }}
            >
              {ann.content}
            </div>
          );
        }

        if (ann.annotation_type === 'stamp') {
          return (
            <div
              key={ann.id}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2',
                isSelected && 'ring-2 ring-primary rounded'
              )}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={(e) => { e.stopPropagation(); onSelectAnnotation(isSelected ? null : ann); }}
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
  );
};
