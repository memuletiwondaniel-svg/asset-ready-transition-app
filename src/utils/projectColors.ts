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
  
  // Generate unique subtle HSL color - low saturation for muted look
  const hue = Math.abs(hash) % 360;
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
