/**
 * BGC ITR-to-Equipment Type Allocation Matrix
 * Source: 1000-BGC-G000-ISGP-G00000-BA-6603-00001 Rev 04A
 *
 * Each entry: equipment_type → { a_itrs: string[], b_itrs: string[] }
 * A-ITRs = Mechanical Completion (Construction phase)
 * B-ITRs = Pre-Commissioning (Pre-Comm/CSU phase)
 */

export interface ITRAllocation {
  equipment_type: string;
  discipline: "instrument" | "mechanical" | "electrical" | "piping";
  a_itrs: string[];
  b_itrs: string[];
  description?: string;
}

export const ITR_MATRIX: ITRAllocation[] = [
  // ─── Instrument ────────────────────────────────────────────
  { equipment_type: "Pressure Transmitter", discipline: "instrument", a_itrs: ["I01A", "I02A", "I09A", "I10A", "I35A"], b_itrs: ["I20B"], description: "PT" },
  { equipment_type: "Flow Transmitter", discipline: "instrument", a_itrs: ["I01A", "I02A", "I35A", "I09A", "I10A"], b_itrs: ["I20B"], description: "FT" },
  { equipment_type: "Temperature Transmitter", discipline: "instrument", a_itrs: ["I01A", "I02A", "I35A"], b_itrs: ["I20B"], description: "TT" },
  { equipment_type: "Level Transmitter", discipline: "instrument", a_itrs: ["I01A", "I02A", "I35A"], b_itrs: ["I20B"], description: "LT" },
  { equipment_type: "SDV", discipline: "instrument", a_itrs: ["I05A", "I35A", "I09A", "I01A", "M39A"], b_itrs: ["I33B", "I34B", "M51B"], description: "Shutdown Valve / ESD Valve" },
  { equipment_type: "ESD Valve", discipline: "instrument", a_itrs: ["I05A", "I35A", "I09A", "I01A", "M39A"], b_itrs: ["I33B", "I34B", "M51B"], description: "Emergency Shutdown Valve" },
  { equipment_type: "BDV", discipline: "instrument", a_itrs: ["I05A", "I35A", "I09A", "I01A", "M39A"], b_itrs: ["I33B", "I34B", "M51B"], description: "Blowdown Valve" },
  { equipment_type: "Control Valve", discipline: "instrument", a_itrs: ["I01A", "I05A", "I35A", "I09A", "M39A"], b_itrs: ["I02B", "I05B", "M51B"], description: "CV" },
  { equipment_type: "PSV", discipline: "instrument", a_itrs: ["I07A", "I26A"], b_itrs: [], description: "Pressure Safety Valve" },
  { equipment_type: "Pressure Relief Valve", discipline: "instrument", a_itrs: ["I07A", "I26A"], b_itrs: [], description: "PRV" },
  { equipment_type: "Instrument Cable", discipline: "instrument", a_itrs: ["I16A"], b_itrs: [] },
  { equipment_type: "Instrument Junction Box", discipline: "instrument", a_itrs: ["I03A", "I35A"], b_itrs: [], description: "Instrument JB" },
  { equipment_type: "Analyzer", discipline: "instrument", a_itrs: ["I01A", "I35A"], b_itrs: ["I20B"] },
  { equipment_type: "Gas Detector", discipline: "instrument", a_itrs: ["I01A", "I35A", "I09A"], b_itrs: ["I20B"] },
  { equipment_type: "Fire Detector", discipline: "instrument", a_itrs: ["I01A", "I35A"], b_itrs: ["I20B"] },
  { equipment_type: "Thermocouple", discipline: "instrument", a_itrs: ["I01A", "I02A"], b_itrs: ["I20B"] },
  { equipment_type: "RTD", discipline: "instrument", a_itrs: ["I01A", "I02A"], b_itrs: ["I20B"], description: "Resistance Temperature Detector" },
  { equipment_type: "Orifice Plate", discipline: "instrument", a_itrs: ["I01A", "I10A"], b_itrs: [] },

  // ─── Mechanical ────────────────────────────────────────────
  { equipment_type: "Pressure Vessel", discipline: "mechanical", a_itrs: ["M01A", "M38A"], b_itrs: ["M01B", "M60B"], description: "Separator / Column" },
  { equipment_type: "Separator", discipline: "mechanical", a_itrs: ["M01A", "M38A"], b_itrs: ["M01B", "M60B"] },
  { equipment_type: "Centrifugal Pump", discipline: "mechanical", a_itrs: ["M02A", "M35A", "M36A", "M38A"], b_itrs: ["M02B", "M50B", "M55B"] },
  { equipment_type: "Reciprocating Pump", discipline: "mechanical", a_itrs: ["M02A", "M35A", "M36A", "M38A"], b_itrs: ["M02B", "M50B", "M55B"] },
  { equipment_type: "Centrifugal Compressor", discipline: "mechanical", a_itrs: ["M08A", "M33A", "M34A", "M35A", "M36A", "M38A"], b_itrs: ["M08B", "M50B", "M55B"] },
  { equipment_type: "Reciprocating Compressor", discipline: "mechanical", a_itrs: ["M08A", "M33A", "M34A", "M35A", "M36A", "M38A"], b_itrs: ["M08B", "M50B", "M55B"] },
  { equipment_type: "Gas Turbine", discipline: "mechanical", a_itrs: ["M19A", "M35A", "M36A"], b_itrs: ["M19B"] },
  { equipment_type: "Heat Exchanger", discipline: "mechanical", a_itrs: ["M09A", "M38A"], b_itrs: ["M09B"] },
  { equipment_type: "Air Cooler", discipline: "mechanical", a_itrs: ["M09A", "M38A"], b_itrs: ["M09B"] },
  { equipment_type: "Manual Valve", discipline: "mechanical", a_itrs: ["M39A"], b_itrs: [] },
  { equipment_type: "Storage Tank", discipline: "mechanical", a_itrs: ["M01A", "M38A"], b_itrs: ["M01B", "M60B"] },
  { equipment_type: "Crane", discipline: "mechanical", a_itrs: ["M38A", "M35A"], b_itrs: ["M55B"] },
  { equipment_type: "Fan", discipline: "mechanical", a_itrs: ["M02A", "M35A", "M36A"], b_itrs: ["M02B", "M50B"] },
  { equipment_type: "Diesel Engine", discipline: "mechanical", a_itrs: ["M19A", "M35A", "M36A"], b_itrs: ["M19B"] },

  // ─── Electrical ────────────────────────────────────────────
  { equipment_type: "LV Cable", discipline: "electrical", a_itrs: ["E01A"], b_itrs: ["E01B"] },
  { equipment_type: "HV Cable", discipline: "electrical", a_itrs: ["E01A"], b_itrs: ["E01B"] },
  { equipment_type: "LV Motor", discipline: "electrical", a_itrs: ["E10A", "E35A"], b_itrs: ["E10B", "E22B", "I23B"] },
  { equipment_type: "HV Motor", discipline: "electrical", a_itrs: ["E10A", "E35A"], b_itrs: ["E10B", "E22B", "I23B"] },
  { equipment_type: "LV Switchboard", discipline: "electrical", a_itrs: ["E43A", "E35A"], b_itrs: ["E09B", "E43B"] },
  { equipment_type: "HV Switchboard", discipline: "electrical", a_itrs: ["E04A", "E09A"], b_itrs: ["E04B", "E09B"] },
  { equipment_type: "Transformer", discipline: "electrical", a_itrs: ["E25A"], b_itrs: ["E25B"] },
  { equipment_type: "Battery Charger", discipline: "electrical", a_itrs: ["E27A"], b_itrs: ["E27B"] },
  { equipment_type: "UPS", discipline: "electrical", a_itrs: ["E27A"], b_itrs: ["E27B"], description: "Uninterruptible Power Supply" },
  { equipment_type: "Lighting Panel", discipline: "electrical", a_itrs: ["E35A"], b_itrs: ["E09B"] },
  { equipment_type: "Generator", discipline: "electrical", a_itrs: ["E10A", "E35A"], b_itrs: ["E10B", "E22B"] },
  { equipment_type: "VFD", discipline: "electrical", a_itrs: ["E35A", "E43A"], b_itrs: ["E09B", "E43B"], description: "Variable Frequency Drive" },

  // ─── Piping ────────────────────────────────────────────────
  { equipment_type: "Piping Hydrotest", discipline: "piping", a_itrs: ["P01A", "P03A", "P04A", "P05A"], b_itrs: [] },
  { equipment_type: "Piping Test Pack", discipline: "piping", a_itrs: ["P08A", "X05A", "X02A"], b_itrs: [] },
  { equipment_type: "Nitrogen Purge", discipline: "piping", a_itrs: [], b_itrs: ["P04B", "P05B", "P06B"], description: "N2/Gross Air Test" },
  { equipment_type: "Relief Valve Test", discipline: "piping", a_itrs: [], b_itrs: ["P07B"] },
  { equipment_type: "Chemical Clean", discipline: "piping", a_itrs: [], b_itrs: ["P06B"] },
];

/**
 * Look up ITR allocations for an equipment type.
 * Fuzzy matches by checking if the query is contained in the equipment_type or description.
 */
export function lookupITRForEquipment(
  equipmentType: string,
  disciplineFilter?: string
): ITRAllocation[] {
  const query = equipmentType.toLowerCase().trim();
  
  let results = ITR_MATRIX.filter(entry => {
    const nameMatch = entry.equipment_type.toLowerCase().includes(query) ||
      query.includes(entry.equipment_type.toLowerCase());
    const descMatch = entry.description?.toLowerCase().includes(query) || false;
    const abbrevMatch = query === entry.description?.toLowerCase();
    return nameMatch || descMatch || abbrevMatch;
  });

  if (disciplineFilter) {
    const disc = disciplineFilter.toLowerCase();
    results = results.filter(r => r.discipline === disc);
  }

  // If no exact match, try word-level matching
  if (results.length === 0) {
    const words = query.split(/\s+/).filter(w => w.length > 2);
    results = ITR_MATRIX.filter(entry => {
      const combined = `${entry.equipment_type} ${entry.description || ""}`.toLowerCase();
      return words.some(w => combined.includes(w));
    });
    if (disciplineFilter) {
      results = results.filter(r => r.discipline === disciplineFilter.toLowerCase() as any);
    }
  }

  return results;
}
