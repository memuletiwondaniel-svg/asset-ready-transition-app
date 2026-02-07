// Shared VCR color generation utility
// Used by both VCR cards and System cards for visual consistency

export const getVCRColor = (vcrCode: string | undefined) => {
  if (!vcrCode) return null;
  
  const code = vcrCode || 'DEFAULT';
  
  // Extract sequence number from new format VCR-XXX-DPYYY
  // e.g., "VCR-001-DP300" -> "001" -> 1
  const seqMatch = code.match(/^VCR-(\d+)-DP/);
  let seqNumber = 0;
  
  if (seqMatch) {
    seqNumber = parseInt(seqMatch[1], 10);
  } else {
    // Fallback for old format VCR-YYY-XXX: use last number
    const numericMatches = code.match(/\d+/g);
    seqNumber = numericMatches && numericMatches.length > 0 
      ? parseInt(numericMatches[numericMatches.length - 1], 10) 
      : 0;
  }
  
  // Well-separated hues across the color wheel for maximum distinction
  // Each hue is ~30-40° apart to ensure clearly different colors
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
  const hueIndex = seqNumber % baseHues.length;
  const hue = baseHues[hueIndex];
  
  // More vibrant but still tasteful pastel: clearly distinguishable at a glance
  const saturation = 50 + ((seqNumber * 5) % 15); // 50-65%
  const lightness = 92 + (seqNumber % 3);          // 92-94% (light bg)
  const borderSaturation = saturation + 5;
  const borderLightness = 60 + ((seqNumber * 3) % 10); // 60-70% (visible border)
  const accentLightness = 80 + (seqNumber % 5);         // 80-85% (mid tone)
  
  return {
    background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${hue}, ${borderSaturation}%, ${borderLightness}%)`,
    accent: `hsl(${hue}, ${saturation + 10}%, ${accentLightness}%)`,
  };
};
