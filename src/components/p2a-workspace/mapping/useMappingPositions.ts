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

    // Group assigned systems by VCR
    const vcrGroups: Record<string, P2ASystem[]> = {};
    for (const system of systems) {
      if (!system.assigned_handover_point_id) continue;
      const key = system.assigned_handover_point_id;
      if (!vcrGroups[key]) vcrGroups[key] = [];
      vcrGroups[key].push(system);
    }

    const newBundles: MappingBundle[] = [];

    for (const [vcrId, groupSystems] of Object.entries(vcrGroups)) {
      const vcrEl = container.querySelector(`[data-vcr-id="${vcrId}"]`);
      if (!vcrEl) continue;

      const vcrRect = vcrEl.getBoundingClientRect();
      const systemYs: number[] = [];
      let systemX = 0;

      for (const sys of groupSystems) {
        const el = container.querySelector(`[data-system-id="${sys.id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        systemYs.push(r.top + r.height / 2 - containerRect.top);
        systemX = r.right - containerRect.left;
      }

      if (systemYs.length === 0) continue;

      const vcrColor = getVCRColor(groupSystems[0].assigned_vcr_code);
      const avgY = systemYs.reduce((a, b) => a + b, 0) / systemYs.length;

      newBundles.push({
        vcrId,
        vcrCode: groupSystems[0].assigned_vcr_code || '',
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

    const debouncedRecalc = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(recalculate);
    };

    const timer = setTimeout(debouncedRecalc, 80);

    const observer = new ResizeObserver(debouncedRecalc);
    if (containerRef.current) observer.observe(containerRef.current);

    const scrollContainers = containerRef.current?.querySelectorAll('[data-radix-scroll-area-viewport]');
    scrollContainers?.forEach(el => {
      el.addEventListener('scroll', debouncedRecalc, { passive: true });
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
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      mutationObserver.disconnect();
      scrollContainers?.forEach(el => el.removeEventListener('scroll', debouncedRecalc));
      window.removeEventListener('resize', debouncedRecalc);
    };
  }, [showMapping, recalculate, containerRef]);

  return { bundles, recalculate };
};
