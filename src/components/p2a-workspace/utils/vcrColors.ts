// Shared VCR color generation utility
// Used by both VCR cards and System cards for visual consistency

/**
 * Simple string hash to produce a stable numeric index from any string.
 * Uses the full VCR code so that even VCRs with the same prefix
 * (e.g., VCR-001-DP300 vs VCR-001-DP301) get distinct colors.
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

export const getVCRColor = (vcrCode: string | undefined) => {
  if (!vcrCode) return null;
  
  const code = vcrCode || 'DEFAULT';
  const hash = hashString(code);
  
  // Well-separated hues across the color wheel for maximum distinction
  const baseHues = [
    200,  // sky blue
    340,  // rose/pink
    160,  // teal
    30,   // warm orange
    270,  // purple
    50,   // gold/yellow
    130,  // green
    300,  // magenta
    185,  // cyan
    15,   // coral
    240,  // indigo
    80,   // lime
  ];
  const hueIndex = hash % baseHues.length;
  const hue = baseHues[hueIndex];
  
  // Add slight hue variation from the hash for extra uniqueness
  const hueShift = (hash >> 4) % 15; // 0-14° shift
  const finalHue = (hue + hueShift) % 360;
  
  // Vibrant but tasteful pastel colors, varied per VCR
  const saturation = 50 + ((hash >> 8) % 15);  // 50-65%
  const lightness = 92 + ((hash >> 12) % 3);    // 92-94% (light bg)
  const borderSaturation = saturation + 5;
  const borderLightness = 58 + ((hash >> 16) % 12); // 58-70% (visible border)
  const accentLightness = 78 + ((hash >> 20) % 7);  // 78-85% (mid tone)
  
  return {
    background: `hsl(${finalHue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${finalHue}, ${borderSaturation}%, ${borderLightness}%)`,
    accent: `hsl(${finalHue}, ${saturation + 10}%, ${accentLightness}%)`,
  };
};
