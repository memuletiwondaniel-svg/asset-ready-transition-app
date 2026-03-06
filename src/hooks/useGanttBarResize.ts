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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewLeft, setPreviewLeft] = useState<number | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);

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
      const dx = e.clientX - drag.initialMouseX;

      // Only count as a real drag if moved more than 3px
      if (Math.abs(dx) > 3) {
        didDragRef.current = true;
      }

      if (drag.edge === 'right') {
        const newWidth = Math.max(dayWidth, drag.initialWidth + dx);
        setPreviewWidth(newWidth);
      } else if (drag.edge === 'left') {
        const newLeft = drag.initialLeft + dx;
        const newWidth = Math.max(dayWidth, drag.initialWidth - dx);
        setPreviewLeft(newLeft);
        setPreviewWidth(newWidth);
      } else {
        // move: shift both left, keep width
        setPreviewLeft(drag.initialLeft + dx);
      }
    };

    const handleMouseUp = () => {
      const drag = dragRef.current;
      if (!drag) return;

      // Only fire onResize if user actually dragged
      if (didDragRef.current) {
        if (drag.edge === 'right') {
          const finalWidth = previewWidth ?? drag.initialWidth;
          const newDays = Math.max(1, Math.round(finalWidth / dayWidth));
          const newEnd = addDays(drag.initialStartDate, newDays);
          onResize(drag.activityId, drag.initialStartDate, newEnd);
        } else if (drag.edge === 'left') {
          const finalLeft = previewLeft ?? drag.initialLeft;
          const dayOffset = Math.round(finalLeft / dayWidth);
          const newStart = addDays(minDate, dayOffset);
          if (newStart < drag.initialEndDate) {
            onResize(drag.activityId, newStart, drag.initialEndDate);
          }
        } else {
          // move
          const finalLeft = previewLeft ?? drag.initialLeft;
          const dayOffset = Math.round((finalLeft - drag.initialLeft) / dayWidth);
          const newStart = addDays(drag.initialStartDate, dayOffset);
          const newEnd = addDays(drag.initialEndDate, dayOffset);
          onResize(drag.activityId, newStart, newEnd);
        }
      }

      dragRef.current = null;
      setDraggingId(null);
      setPreviewLeft(null);
      setPreviewWidth(null);
      // Keep didDragRef.current true briefly so the click handler can check it
      setTimeout(() => { didDragRef.current = false; }, 0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dayWidth, minDate, onResize, previewLeft, previewWidth]);

  return {
    draggingId,
    previewLeft,
    previewWidth,
    handleMouseDown,
    wasDragging,
  };
}
