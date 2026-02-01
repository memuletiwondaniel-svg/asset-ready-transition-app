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
  // Generate unique hash from project ID
  const str = id.replace(/-/g, ''); // Remove dashes for consistent hashing
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  
  // Generate vibrant HSL color (full hue range for variety)
  const hue = Math.abs(hash) % 360;
  const saturation = 25 + (Math.abs(hash >> 8) % 15); // 25-40% saturation (subtle but visible)
  const lightness = 55 + (Math.abs(hash >> 16) % 10); // 55-65% lightness
  
  const bgStart = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const bgEnd = `hsl(${hue}, ${saturation + 5}%, ${lightness - 8}%)`;
  
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
