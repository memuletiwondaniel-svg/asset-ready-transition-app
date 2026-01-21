/**
 * Generates a unique, subtle HSL-based color from a project ID.
 * Used to visually differentiate projects while maintaining a professional appearance.
 */
export const getProjectColor = (prefix: string, number: string) => {
  // Generate unique hash from project ID
  const str = `${prefix}${number}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  
  // Safe hue ranges that avoid red (0-30, 330-360), amber (30-60), and green (90-150)
  // Using: cyan (170-200), blue (200-260), purple (260-290), magenta/pink (290-330)
  const safeHueRanges = [
    { start: 170, end: 200 },  // Cyan
    { start: 200, end: 260 },  // Blue
    { start: 260, end: 290 },  // Purple
    { start: 290, end: 330 },  // Magenta/Pink
  ];
  
  // Calculate total safe range
  const totalRange = safeHueRanges.reduce((sum, range) => sum + (range.end - range.start), 0);
  
  // Map hash to a position within the total safe range
  let position = Math.abs(hash) % totalRange;
  let hue = 0;
  
  for (const range of safeHueRanges) {
    const rangeSize = range.end - range.start;
    if (position < rangeSize) {
      hue = range.start + position;
      break;
    }
    position -= rangeSize;
  }
  
  // Generate unique subtle HSL color - low saturation for muted look
  const saturation = 25 + (Math.abs(hash >> 8) % 15); // 25-40% saturation (subtle)
  const lightness = 55 + (Math.abs(hash >> 16) % 10); // 55-65% lightness (muted)
  
  const bgStart = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const bgEnd = `hsl(${hue}, ${saturation + 5}%, ${lightness - 8}%)`;
  const borderColor = `hsl(${hue}, ${saturation - 5}%, ${lightness + 15}%)`;
  
  return { bgStart, bgEnd, borderColor };
};

/**
 * Formats a project ID with prefix and number separated by a dash.
 */
export const formatProjectId = (prefix: string, number: string) => {
  return `${prefix}-${number}`;
};
