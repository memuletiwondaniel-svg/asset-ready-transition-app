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
  
  // Safe hue values spread across different color families for better distinction
  // Index 0=cyan, 1=teal, 2=blue, 3=orange, 4=purple, 5=pink, 6=green, 7=rose, 8=indigo
  const baseHues = [180, 165, 210, 30, 250, 330, 145, 350, 270];
  const hueIndex = seqNumber % baseHues.length;
  const hue = baseHues[hueIndex];
  
  // Softer saturation and higher lightness for a more muted, pastel look
  const saturation = 35 + ((seqNumber * 3) % 10); // 35-45% (was 55-70%)
  const lightness = 92 + (seqNumber % 4); // 92-96% (was 88-93%)
  const borderLightness = 70 + ((seqNumber * 2) % 10); // 70-80% (was 55-70%)
  
  return {
    background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${hue}, ${saturation}%, ${borderLightness}%)`,
    accent: `hsl(${hue}, ${saturation + 10}%, ${lightness - 10}%)`,
  };
};
