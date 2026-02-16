// Shared VCR color generation utility
// Used by both VCR cards and System cards for visual consistency

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getVCRColor = (vcrCode: string | undefined) => {
  if (!vcrCode) return null;
  
  const code = vcrCode || 'DEFAULT';
  const hash = hashString(code);
  
  const baseHues = [
    200, 340, 160, 30, 270, 50, 130, 300, 185, 15, 240, 80,
  ];
  const hueIndex = hash % baseHues.length;
  const hue = baseHues[hueIndex];
  const hueShift = (hash >> 4) % 15;
  const finalHue = (hue + hueShift) % 360;
  
  const sat = 40 + ((hash >> 8) % 10); // 40-50% — muted

  return {
    hue: finalHue,
    saturation: sat,
    // Light mode — very subtle tint
    background: `hsl(${finalHue}, ${sat}%, 96%)`,
    border: `hsl(${finalHue}, ${sat + 15}%, 38%)`,
    accent: `hsl(${finalHue}, ${sat}%, 88%)`,
    // Dark mode — barely tinted dark
    backgroundDark: `hsl(${finalHue}, ${Math.round(sat * 0.25)}%, 13%)`,
    borderDark: `hsl(${finalHue}, ${sat}%, 72%)`,
    accentDark: `hsl(${finalHue}, ${Math.round(sat * 0.3)}%, 20%)`,
  };
};
