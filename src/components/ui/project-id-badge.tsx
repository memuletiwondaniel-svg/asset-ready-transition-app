import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const projectIdBadgeVariants = cva(
  "inline-flex items-center rounded-md border font-mono font-semibold transition-colors",
  {
    variants: {
      size: {
        default: "px-2.5 py-1 text-xs",
        sm: "px-1.5 py-0 text-[10px]",
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
}

function ProjectIdBadge({ className, size, children, ...props }: ProjectIdBadgeProps) {
  return (
    <div
      className={cn(
        projectIdBadgeVariants({ size }),
        "bg-blue-50 text-blue-700 border-blue-200",
        "dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ProjectIdBadge, projectIdBadgeVariants };
