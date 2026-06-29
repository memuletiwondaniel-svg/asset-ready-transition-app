/**
 * Shared helper for composing the canonical VCR item code.
 * Single source of truth so the admin Items table and the item-detail
 * surfaces can never diverge.
 *
 *   formatVcrItemCode('DI', 3) → 'DI-03'
 */
export const formatVcrItemCode = (
  categoryCode: string | null | undefined,
  displayOrder: number | null | undefined,
): string => {
  const code = (categoryCode ?? '').trim() || '??';
  const order = typeof displayOrder === 'number' && displayOrder > 0 ? displayOrder : 0;
  return `${code}-${String(order).padStart(2, '0')}`;
};
