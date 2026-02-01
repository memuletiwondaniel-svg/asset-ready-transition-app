import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const projectIdBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border font-mono font-semibold transition-colors leading-none",
  {
    variants: {
      size: {
        default: "px-2.5 py-1 text-xs",
        sm: "px-1.5 py-0.5 text-[10px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface ProjectIdBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof projectIdBadgeVariants> {
  children: React.ReactNode;
  /** Optional project ID for dynamic color generation. If not provided, uses the children as the ID. */
  projectId?: string;
}

/**
 * Generates a unique, subtle HSL-based color from a project ID string.
 * Excludes red/amber/green hue ranges to avoid confusion with status indicators.
 */
function getProjectIdColor(id: string) {
  // Generate unique hash from project ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
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
  
  return {
    background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${hue}, ${saturation - 5}%, ${lightness + 15}%)`,
    text: `hsl(${hue}, ${saturation + 20}%, 20%)`,
    // Dark mode variants
    darkBackground: `hsl(${hue}, ${saturation}%, 15%)`,
    darkBorder: `hsl(${hue}, ${saturation}%, 30%)`,
    darkText: `hsl(${hue}, ${saturation + 10}%, 70%)`,
  };
}

function ProjectIdBadge({ className, size, children, projectId, ...props }: ProjectIdBadgeProps) {
  // Use projectId prop or extract from children
  const idString = projectId || (typeof children === 'string' ? children : String(children));
  const colors = getProjectIdColor(idString);
  
  return (
    <div
      className={cn(projectIdBadgeVariants({ size }), className)}
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        color: colors.text,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export { ProjectIdBadge, projectIdBadgeVariants };
