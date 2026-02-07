import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Computes target Y positions (relative to the workspace container) for each VCR
 * by reading the DOM positions of system cards grouped by their assigned VCR.
 *
 * When mapping mode is active, each VCR card should be vertically positioned so
 * its center aligns with the center of its system group — producing perfectly
 * horizontal connection lines.
 *
 * IMPORTANT: This hook reads system card positions (stable, in their own panel flow)
 * and is NOT triggered by VCR card repositioning, avoiding circular layout loops.
 */
export const useVCRAlignment = (
  showMapping: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
): Record<string, number> => {
  const [targets, setTargets] = useState<Record<string, number>>({});
  const rafRef = useRef<number>(0);

  const recalculate = useCallback(() => {
    if (!showMapping || !containerRef.current) {
      setTargets({});
      return;
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Find the systems panel scroll viewport to check visibility
    const systemsPanelViewport = container.querySelector(
      '[data-systems-panel] [data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
    const viewportRect = systemsPanelViewport?.getBoundingClientRect();

    // Read all system card elements and group by their assigned VCR
    const systemEls = container.querySelectorAll('[data-system-id]');
    const vcrSystemYs: Record<string, number[]> = {};
    const vcrSystemCounts: Record<string, number> = {};
    const vcrVisibleCounts: Record<string, number> = {};

    systemEls.forEach((el) => {
      const systemEl = el as HTMLElement;
      const vcrId = systemEl.getAttribute('data-assigned-vcr-id');
      if (!vcrId) return;

      // Track total system count for this VCR
      vcrSystemCounts[vcrId] = (vcrSystemCounts[vcrId] || 0) + 1;

      const rect = systemEl.getBoundingClientRect();

      // Check if this system card is fully visible within the scroll viewport
      let isVisible = true;
      if (viewportRect) {
        if (rect.top < viewportRect.top || rect.bottom > viewportRect.bottom) {
          isVisible = false;
        }
      }

      if (isVisible) {
        vcrVisibleCounts[vcrId] = (vcrVisibleCounts[vcrId] || 0) + 1;
        const centerY = rect.top + rect.height / 2 - containerRect.top;
        if (!vcrSystemYs[vcrId]) vcrSystemYs[vcrId] = [];
        vcrSystemYs[vcrId].push(centerY);
      }
    });

    // Only produce alignment targets for VCRs where ALL systems are visible
    const newTargets: Record<string, number> = {};
    for (const [vcrId, ys] of Object.entries(vcrSystemYs)) {
      if (ys.length === 0) continue;
      // Skip if not all systems for this VCR are visible
      if ((vcrVisibleCounts[vcrId] || 0) < (vcrSystemCounts[vcrId] || 0)) continue;
      const avgY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
      newTargets[vcrId] = avgY;
    }

    setTargets(newTargets);
  }, [showMapping, containerRef]);

  useEffect(() => {
    if (!showMapping) {
      setTargets({});
      return;
    }

    const debouncedRecalc = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(recalculate);
    };

    // Initial calculation with delay to let layout settle
    const timer = setTimeout(debouncedRecalc, 100);

    // Observe resize
    const observer = new ResizeObserver(debouncedRecalc);
    if (containerRef.current) observer.observe(containerRef.current);

    // Observe scroll in Radix scroll areas
    const scrollContainers = containerRef.current?.querySelectorAll('[data-radix-scroll-area-viewport]');
    scrollContainers?.forEach((el) => {
      el.addEventListener('scroll', debouncedRecalc, { passive: true });
    });

    window.addEventListener('resize', debouncedRecalc);

    // Observe DOM mutations (system cards being added/removed/reordered)
    const mutationObserver = new MutationObserver(debouncedRecalc);
    if (containerRef.current) {
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'data-assigned-vcr-id'],
      });
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      mutationObserver.disconnect();
      scrollContainers?.forEach((el) => el.removeEventListener('scroll', debouncedRecalc));
      window.removeEventListener('resize', debouncedRecalc);
    };
  }, [showMapping, recalculate, containerRef]);

  return targets;
};
