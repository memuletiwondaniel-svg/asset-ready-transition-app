interface LocationInput {
  plant_name?: string | null;
  station_name?: string | null;
}

/**
 * Format the project's location per business rules:
 * - BNGL / KAZ / NRNGL → plant code only
 * - UQ → UQ-ST or UQ-MT (based on station; fallback UQ)
 * - CS → station only (drop the CS prefix)
 * - else → plant_name (or em-dash if unknown)
 */
export function formatProjectLocation({ plant_name, station_name }: LocationInput): string {
  const plant = (plant_name ?? '').trim();
  const station = (station_name ?? '').trim();
  if (!plant) return '—';

  const plantUpper = plant.toUpperCase();

  if (['BNGL', 'KAZ', 'NRNGL'].includes(plantUpper)) {
    return plantUpper;
  }

  if (plantUpper === 'UQ') {
    const s = station.toLowerCase();
    if (/sweet|\bst\b|-st\b/.test(s)) return 'UQ-ST';
    if (/murjan|\bmt\b|-mt\b/.test(s)) return 'UQ-MT';
    return 'UQ';
  }

  if (plantUpper === 'CS') {
    return station || 'CS';
  }

  return plant;
}
