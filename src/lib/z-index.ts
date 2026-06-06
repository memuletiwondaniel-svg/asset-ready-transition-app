/**
 * Z-INDEX SCALE — single source of truth.
 *
 * Use the matching Tailwind utilities (z-dropdown, z-modal, z-toast, …)
 * configured in tailwind.config.ts. Constants below mirror those values
 * for non-Tailwind / inline-style use.
 *
 * Tiers (low → high). Gaps between tiers leave room to insert future layers.
 *
 *   base          0..10    Normal page content
 *   sticky        20       Sticky in-page headers / sidebars
 *
 *   overlay       1200     Standard dialog / sheet / alert backdrop
 *   modal         1210     Standard dialog / sheet / alert content
 *
 *   overlayNested 1300     Nested-overlay backdrop (escape hatch — usually
 *   modalNested   1310     unnecessary because later portals already paint above)
 *
 *   overlayViewer 1400     Full-screen viewer backdrop (DocumentViewerOverlay,
 *   modalViewer   1410     VCRDetailOverlay)
 *
 *   overlayCrit   1500     Critical confirm above viewer (SignaturePad, etc.)
 *   modalCritical 1510
 *
 *   dropdown      1600     Popovers, dropdowns, selects, comboboxes,
 *                          context menus — kept above every modal tier so a
 *                          popover opened from inside any dialog renders above it.
 *   tooltip       1650     Tooltips sit above menus/popovers.
 *   toast         1700     Always on top.
 *
 * Rules:
 * - Backdrops live one tier below their own content.
 * - A child overlay's backdrop sits ABOVE the parent overlay's content
 *   (use the nested / viewer / critical tiers when you need that ordering;
 *    otherwise Radix portals naturally render later-opened overlays on top).
 * - Stacking-context traps (ancestor with transform / filter / opacity<1 /
 *   isolation / will-change) defeat z-index — overlays MUST portal to body.
 *   Prefer Radix primitives (Dialog/Sheet/Popover/Tooltip) which portal by
 *   default; do NOT disable their portals.
 */
export const Z_INDEX = {
  base: 0,
  sticky: 20,
  overlay: 1200,
  modal: 1210,
  overlayNested: 1300,
  modalNested: 1310,
  overlayViewer: 1400,
  modalViewer: 1410,
  overlayCritical: 1500,
  modalCritical: 1510,
  dropdown: 1600,
  tooltip: 1650,
  toast: 1700,
} as const;

export type ZIndexTier = keyof typeof Z_INDEX;
