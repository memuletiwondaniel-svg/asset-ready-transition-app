import { useEffect, useRef, useState, useCallback } from 'react';
import { P2ASystem } from '../hooks/useP2ASystems';
import { getVCRColor } from '../utils/vcrColors';

/** One bundled connection from a group of systems to a single VCR */
export interface MappingBundle {
  vcrId: string;
  vcrCode: string;
  /** Centroid Y of all system cards in this group */
  systemCenterY: number;
  /** Individual Y positions of each system card's right-center */
  systemYs: number[];
  /** X position: right edge of system cards (all same column) */
  systemX: number;
  /** VCR card left-center */
  vcrX: number;
  vcrY: number;
  /** VCR color */
  color: string;
  borderColor: string;
  systemCount: number;
}

/**
 * Compute a mapping-friendly sort order for assigned systems.
 *
 * Goal: systems assigned to the same VCR sit next to each other,
 * and VCR groups are ordered by the VCR's Y-position in the workspace
 * so that the horizontal trunk lines are roughly aligned and minimally cross.
 */
export const getMappingSortOrder = (
  systems: P2ASystem[],
  containerEl: HTMLElement | null,
): P2ASystem[] => {
  if (!containerEl) return systems;

  // Build a map of VCR id → Y position
  const vcrYMap: Record<string, number> = {};
  const vcrEls = containerEl.querySelectorAll('[data-vcr-id]');
  vcrEls.forEach((el) => {
    const id = el.getAttribute('data-vcr-id');
    if (id) {
      const rect = el.getBoundingClientRect();
      vcrYMap[id] = rect.top + rect.height / 2;
    }
  });

  return [...systems].sort((a, b) => {
    const aVcr = a.assigned_handover_point_id || '';
    const bVcr = b.assigned_handover_point_id || '';
    // Primary: sort by VCR Y position
    const aY = vcrYMap[aVcr] ?? Infinity;
    const bY = vcrYMap[bVcr] ?? Infinity;
    if (aY !== bY) return aY - bY;
    // Secondary: group by VCR code
    const aCode = a.assigned_vcr_code || '';
    const bCode = b.assigned_vcr_code || '';
    if (aCode !== bCode) return aCode.localeCompare(bCode);
    return a.name.localeCompare(b.name);
  });
};

export const useMappingPositions = (
  systems: P2ASystem[],
  showMapping: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
) => {
  const [bundles, setBundles] = useState<MappingBundle[]>([]);
  const rafRef = useRef<number>(0);

  const recalculate = useCallback(() => {
    if (!showMapping || !containerRef.current) {
      setBundles([]);
      return;
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Find the systems panel scroll viewport to check visibility
    const systemsPanelViewport = container.querySelector(
      '[data-systems-panel] [data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;

    const viewportRect = systemsPanelViewport?.getBoundingClientRect();

    // DOM-driven approach: scan all elements with data-system-id and data-assigned-vcr-id
    // This picks up both full system cards AND subsystem cards
    const systemEls = container.querySelectorAll('[data-system-id][data-assigned-vcr-id]');
    
    // Group by VCR ID
    const vcrGroups: Record<string, { el: HTMLElement; id: string }[]> = {};
    const vcrCodes: Record<string, string> = {};

    systemEls.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const vcrId = htmlEl.getAttribute('data-assigned-vcr-id');
      if (!vcrId) return;
      if (!vcrGroups[vcrId]) vcrGroups[vcrId] = [];
      vcrGroups[vcrId].push({ el: htmlEl, id: htmlEl.getAttribute('data-system-id') || '' });
    });

    // Also collect VCR codes from system data for coloring
    for (const system of systems) {
      if (system.assigned_handover_point_id && system.assigned_vcr_code) {
        vcrCodes[system.assigned_handover_point_id] = system.assigned_vcr_code;
      }
      // Also from subsystem assignments
      if (system.assigned_subsystems) {
        for (const sub of system.assigned_subsystems) {
          vcrCodes[sub.assigned_handover_point_id] = sub.assigned_vcr_code;
        }
      }
    }

    const newBundles: MappingBundle[] = [];

    for (const [vcrId, groupEls] of Object.entries(vcrGroups)) {
      const vcrEl = container.querySelector(`[data-vcr-id="${vcrId}"]`);
      if (!vcrEl) continue;

      const vcrRect = vcrEl.getBoundingClientRect();

      // Check if VCR card is fully visible within its phase column's scroll viewport
      const phaseViewport = vcrEl.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      if (phaseViewport) {
        const phaseVpRect = phaseViewport.getBoundingClientRect();
        if (vcrRect.top < phaseVpRect.top || vcrRect.bottom > phaseVpRect.bottom) {
          continue; // VCR card is scrolled out of its phase column
        }
      }

      const systemYs: number[] = [];
      let systemX = 0;
      let allVisible = true;

      for (const { el } of groupEls) {
        const r = el.getBoundingClientRect();

        // Check if this card is fully visible within the scroll viewport
        if (viewportRect) {
          if (r.top < viewportRect.top || r.bottom > viewportRect.bottom) {
            allVisible = false;
          }
        }

        systemYs.push(r.top + r.height / 2 - containerRect.top);
        systemX = r.right - containerRect.left;
      }

      // Only show mapping lines when ALL cards for this VCR are visible
      if (!allVisible || systemYs.length === 0) continue;

      const vcrCode = vcrCodes[vcrId] || '';
      const vcrColor = getVCRColor(vcrCode);
      const avgY = systemYs.reduce((a, b) => a + b, 0) / systemYs.length;

      newBundles.push({
        vcrId,
        vcrCode,
        systemCenterY: avgY,
        systemYs: systemYs.sort((a, b) => a - b),
        systemX,
        vcrX: vcrRect.left - containerRect.left,
        vcrY: vcrRect.top + vcrRect.height / 2 - containerRect.top,
        color: vcrColor?.background || 'hsl(var(--primary))',
        borderColor: vcrColor?.border || 'hsl(var(--primary))',
        systemCount: systemYs.length,
      });
    }

    // Sort bundles by VCR Y position for consistent layering
    newBundles.sort((a, b) => a.vcrY - b.vcrY);
    setBundles(newBundles);
  }, [systems, showMapping, containerRef]);

  useEffect(() => {
    if (!showMapping) {
      setBundles([]);
      return;
    }

    // Debounced recalc for resize/mutation (less frequent)
    const debouncedRecalc = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(recalculate);
    };

    // Direct recalc on scroll for instant response (scroll events are frame-synced)
    const handleScroll = () => {
      recalculate();
    };

    // Initial calculation — single RAF instead of setTimeout
    rafRef.current = requestAnimationFrame(recalculate);

    const observer = new ResizeObserver(debouncedRecalc);
    if (containerRef.current) observer.observe(containerRef.current);

    const scrollContainers = containerRef.current?.querySelectorAll('[data-radix-scroll-area-viewport]');
    scrollContainers?.forEach(el => {
      el.addEventListener('scroll', handleScroll, { passive: true });
    });

    window.addEventListener('resize', debouncedRecalc);

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
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      mutationObserver.disconnect();
      scrollContainers?.forEach(el => el.removeEventListener('scroll', handleScroll));
      window.removeEventListener('resize', debouncedRecalc);
    };
  }, [showMapping, recalculate, containerRef]);

  return { bundles, recalculate };
};
