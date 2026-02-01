import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const projectIdBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-md font-mono font-semibold transition-colors leading-none text-white border-0",
  {
    variants: {
      size: {
        default: "px-2.5 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
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
 * Generates a unique HSL-based gradient color from a project ID string.
 * Uses vibrant colors matching the Projects homepage styling.
 */
function getProjectIdColor(id: string) {
  // Use a better hash function (djb2) for more distinct distribution
  const str = id.replace(/-/g, '').toUpperCase();
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  hash = Math.abs(hash);
  
  // Define distinct hue anchors to ensure variety (excludes red/amber/green per memory)
  // Cyan(180), Blue(220), Indigo(250), Purple(280), Magenta(320), Teal(165), Slate-Blue(200)
  const hueAnchors = [165, 180, 200, 220, 250, 280, 320];
  const anchorIndex = hash % hueAnchors.length;
  const baseHue = hueAnchors[anchorIndex];
  
  // Add slight variation within the anchor range (+/- 12 degrees)
  const hueVariation = ((hash >> 8) % 25) - 12;
  const hue = (baseHue + hueVariation + 360) % 360;
  
  const saturation = 30 + ((hash >> 12) % 15); // 30-45% saturation
  const lightness = 50 + ((hash >> 16) % 12); // 50-62% lightness
  
  const bgStart = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const bgEnd = `hsl(${hue}, ${saturation + 8}%, ${lightness - 10}%)`;
  
  return { bgStart, bgEnd };
}

function ProjectIdBadge({ className, size, children, projectId, ...props }: ProjectIdBadgeProps) {
  // Use projectId prop or extract from children
  const idString = projectId || (typeof children === 'string' ? children : String(children));
  const colors = getProjectIdColor(idString);
  
  return (
    <div
      className={cn(projectIdBadgeVariants({ size }), className)}
      style={{
        background: `linear-gradient(to right, ${colors.bgStart}, ${colors.bgEnd})`,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export { ProjectIdBadge, projectIdBadgeVariants };
