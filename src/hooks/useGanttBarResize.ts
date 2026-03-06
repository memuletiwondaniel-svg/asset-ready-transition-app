import { useRef, useCallback, useState, useEffect } from 'react';
import { addDays } from 'date-fns';

interface DragState {
  activityId: string;
  edge: 'left' | 'right' | 'move';
  initialMouseX: number;
  initialLeft: number;
  initialWidth: number;
  initialStartDate: Date;
  initialEndDate: Date;
}

interface UseGanttBarResizeOptions {
  minDate: Date;
  dayWidth: number;
  onResize: (activityId: string, newStartDate: Date, newEndDate: Date) => void;
}

export function useGanttBarResize({ minDate, dayWidth, onResize }: UseGanttBarResizeOptions) {
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const previewLeftRef = useRef<number | null>(null);
  const previewWidthRef = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewLeft, setPreviewLeft] = useState<number | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);

  // Keep refs in sync for closure access
  const minDateRef = useRef(minDate);
  const dayWidthRef = useRef(dayWidth);
  const onResizeRef = useRef(onResize);
  minDateRef.current = minDate;
  dayWidthRef.current = dayWidth;
  onResizeRef.current = onResize;

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    edge: 'left' | 'right' | 'move',
    activityId: string,
    barLeft: number,
    barWidth: number,
    startDate: Date,
    endDate: Date
  ) => {
    e.stopPropagation();
    e.preventDefault();
    didDragRef.current = false;
    dragRef.current = {
      activityId,
      edge,
      initialMouseX: e.clientX,
      initialLeft: barLeft,
      initialWidth: barWidth,
      initialStartDate: startDate,
      initialEndDate: endDate,
    };
    previewLeftRef.current = barLeft;
    previewWidthRef.current = barWidth;
    setDraggingId(activityId);
    setPreviewLeft(barLeft);
    setPreviewWidth(barWidth);
  }, []);

  /** Returns true if a drag operation just completed (suppress click) */
  const wasDragging = useCallback(() => didDragRef.current, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dw = dayWidthRef.current;
      const dx = e.clientX - drag.initialMouseX;

      if (Math.abs(dx) > 3) {
        didDragRef.current = true;
      }

      if (drag.edge === 'right') {
        const newWidth = Math.max(dw, drag.initialWidth + dx);
        previewWidthRef.current = newWidth;
        setPreviewWidth(newWidth);
      } else if (drag.edge === 'left') {
        const newLeft = drag.initialLeft + dx;
        const newWidth = Math.max(dw, drag.initialWidth - dx);
        previewLeftRef.current = newLeft;
        previewWidthRef.current = newWidth;
        setPreviewLeft(newLeft);
        setPreviewWidth(newWidth);
      } else {
        const newLeft = drag.initialLeft + dx;
        previewLeftRef.current = newLeft;
        setPreviewLeft(newLeft);
      }
    };

    const handleMouseUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      const dw = dayWidthRef.current;
      const md = minDateRef.current;

      if (didDragRef.current) {
        if (drag.edge === 'right') {
          const finalWidth = previewWidthRef.current ?? drag.initialWidth;
          const newDays = Math.max(1, Math.round(finalWidth / dw));
          const newEnd = addDays(drag.initialStartDate, newDays);
          onResizeRef.current(drag.activityId, drag.initialStartDate, newEnd);
        } else if (drag.edge === 'left') {
          const finalLeft = previewLeftRef.current ?? drag.initialLeft;
          const dayOffset = Math.round(finalLeft / dw);
          const newStart = addDays(md, dayOffset);
          const finalWidth = previewWidthRef.current ?? drag.initialWidth;
          const endDayOffset = Math.round((finalLeft + finalWidth) / dw);
          const newEnd = addDays(md, endDayOffset);
          onResizeRef.current(drag.activityId, newStart, newEnd);
        } else {
          const finalLeft = previewLeftRef.current ?? drag.initialLeft;
          const dayOffset = Math.round((finalLeft - drag.initialLeft) / dw);
          const newStart = addDays(drag.initialStartDate, dayOffset);
          const newEnd = addDays(drag.initialEndDate, dayOffset);
          onResizeRef.current(drag.activityId, newStart, newEnd);
        }
      }

      dragRef.current = null;
      previewLeftRef.current = null;
      previewWidthRef.current = null;
      setDraggingId(null);
      setPreviewLeft(null);
      setPreviewWidth(null);
      setTimeout(() => { didDragRef.current = false; }, 0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // No dependencies - uses refs only

  return {
    draggingId,
    previewLeft,
    previewWidth,
    handleMouseDown,
    wasDragging,
  };
}
