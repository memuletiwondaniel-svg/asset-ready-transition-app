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
  
  const saturation = 50 + ((hash >> 8) % 15);

  return {
    hue: finalHue,
    saturation,
    // Light mode colors
    background: `hsl(${finalHue}, ${saturation}%, 93%)`,
    border: `hsl(${finalHue}, ${saturation + 5}%, 55%)`,
    accent: `hsl(${finalHue}, ${saturation + 10}%, 82%)`,
    // Dark mode colors
    backgroundDark: `hsl(${finalHue}, ${Math.round(saturation * 0.4)}%, 16%)`,
    borderDark: `hsl(${finalHue}, ${saturation}%, 65%)`,
    accentDark: `hsl(${finalHue}, ${Math.round(saturation * 0.5)}%, 25%)`,
  };
};
