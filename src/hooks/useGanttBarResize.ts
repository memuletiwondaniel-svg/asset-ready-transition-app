import { useRef, useCallback, useState, useEffect } from 'react';
import { addDays, differenceInDays } from 'date-fns';

interface DragState {
  activityId: string;
  edge: 'left' | 'right';
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewLeft, setPreviewLeft] = useState<number | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    edge: 'left' | 'right',
    activityId: string,
    barLeft: number,
    barWidth: number,
    startDate: Date,
    endDate: Date
  ) => {
    e.stopPropagation();
    e.preventDefault();
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.initialMouseX;

      if (drag.edge === 'right') {
        const newWidth = Math.max(dayWidth, drag.initialWidth + dx);
        setPreviewWidth(newWidth);
      } else {
        const newLeft = drag.initialLeft + dx;
        const newWidth = Math.max(dayWidth, drag.initialWidth - dx);
        setPreviewLeft(newLeft);
        setPreviewWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = previewLeft !== null && previewWidth !== null ? undefined : 0;

      if (drag.edge === 'right') {
        const finalWidth = previewWidth ?? drag.initialWidth;
        const newDays = Math.max(1, Math.round(finalWidth / dayWidth));
        const newEnd = addDays(drag.initialStartDate, newDays);
        onResize(drag.activityId, drag.initialStartDate, newEnd);
      } else {
        const finalLeft = previewLeft ?? drag.initialLeft;
        const dayOffset = Math.round(finalLeft / dayWidth);
        const newStart = addDays(minDate, dayOffset);
        const newEnd = drag.initialEndDate; // keep end date fixed
        if (newStart < newEnd) {
          onResize(drag.activityId, newStart, newEnd);
        }
      }

      dragRef.current = null;
      setDraggingId(null);
      setPreviewLeft(null);
      setPreviewWidth(null);
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
  };
}
