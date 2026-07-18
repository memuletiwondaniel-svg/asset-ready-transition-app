/**
 * Plant code → human label dictionary.
 *
 * Data-driven per Daniel's directive: only APPROVED entries are seeded here.
 * Any code not in this map renders AS-IS (raw code chip) — never invent a
 * label. To add a plant label later, add one line below (or migrate to a
 * `plant_code_labels` table); no component changes needed.
 *
 * Approved (2026-07-18): CS, DS. All others fall through.
 */
export const PLANT_CODE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  CS: 'Compression Station (CS)',
  DS: 'Degassing Station (DS)',
});

/**
 * Resolve a plant code to its display label.
 * Returns the raw code untouched when no approved label exists.
 * Trims + upper-cases the lookup key so "cs" / " CS " both resolve.
 */
export function resolvePlantLabel(code: string | null | undefined): string {
  if (!code) return '';
  const key = code.trim().toUpperCase();
  return PLANT_CODE_LABELS[key] ?? code.trim();
}

/**
 * True when the given plant code has an approved label in the dictionary.
 * Useful for QAQC / reporting the incomplete-dictionary set.
 */
export function hasPlantLabel(code: string | null | undefined): boolean {
  if (!code) return false;
  return code.trim().toUpperCase() in PLANT_CODE_LABELS;
}
