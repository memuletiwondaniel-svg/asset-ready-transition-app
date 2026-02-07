import { useEffect, useRef, useState, useCallback } from 'react';
import { P2ASystem } from '../hooks/useP2ASystems';
import { getVCRColor } from '../utils/vcrColors';

export interface MappingConnection {
  systemId: string;
  vcrId: string;
  vcrCode: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  borderColor: string;
}

/**
 * Hook to compute DOM positions of system cards and VCR cards
 * for the mapping overlay SVG connections.
 */
export const useMappingPositions = (
  systems: P2ASystem[],
  showMapping: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
) => {
  const [connections, setConnections] = useState<MappingConnection[]>([]);
  const rafRef = useRef<number>(0);

  const recalculate = useCallback(() => {
    if (!showMapping || !containerRef.current) {
      setConnections([]);
      return;
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const assignedSystems = systems.filter(s => s.assigned_handover_point_id);
    const newConnections: MappingConnection[] = [];

    for (const system of assignedSystems) {
      const systemEl = container.querySelector(`[data-system-id="${system.id}"]`);
      const vcrEl = container.querySelector(`[data-vcr-id="${system.assigned_handover_point_id}"]`);

      if (!systemEl || !vcrEl) continue;

      const systemRect = systemEl.getBoundingClientRect();
      const vcrRect = vcrEl.getBoundingClientRect();

      const vcrColor = getVCRColor(system.assigned_vcr_code);

      newConnections.push({
        systemId: system.id,
        vcrId: system.assigned_handover_point_id!,
        vcrCode: system.assigned_vcr_code || '',
        // Start from right-center of system card
        startX: systemRect.right - containerRect.left,
        startY: systemRect.top + systemRect.height / 2 - containerRect.top,
        // End at left-center of VCR card
        endX: vcrRect.left - containerRect.left,
        endY: vcrRect.top + vcrRect.height / 2 - containerRect.top,
        color: vcrColor?.background || 'hsl(var(--primary))',
        borderColor: vcrColor?.border || 'hsl(var(--primary))',
      });
    }

    setConnections(newConnections);
  }, [systems, showMapping, containerRef]);

  useEffect(() => {
    if (!showMapping) {
      setConnections([]);
      return;
    }

    // Debounced recalculation
    const debouncedRecalc = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(recalculate);
    };

    // Initial calculation (slight delay for DOM to settle)
    const timer = setTimeout(debouncedRecalc, 50);

    // Observe resize
    const observer = new ResizeObserver(debouncedRecalc);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Listen for scroll events on scrollable containers within
    const scrollContainers = containerRef.current?.querySelectorAll('[data-radix-scroll-area-viewport]');
    scrollContainers?.forEach(el => {
      el.addEventListener('scroll', debouncedRecalc, { passive: true });
    });

    // Also listen on window resize
    window.addEventListener('resize', debouncedRecalc);

    // Mutation observer for DOM changes (cards appearing/disappearing)
    const mutationObserver = new MutationObserver(debouncedRecalc);
    if (containerRef.current) {
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      mutationObserver.disconnect();
      scrollContainers?.forEach(el => {
        el.removeEventListener('scroll', debouncedRecalc);
      });
      window.removeEventListener('resize', debouncedRecalc);
    };
  }, [showMapping, recalculate, containerRef]);

  return { connections, recalculate };
};
