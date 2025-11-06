import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] rounded-md",
          className
        )}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div className="w-full space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`} 
          className="flex gap-4 items-center"
          style={{ animationDelay: `${rowIndex * 50}ms` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={cn(
                "h-8",
                colIndex === 0 ? "flex-1" : "w-24"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

const CardSkeleton = ({ rows = 3 }: { rows?: number }) => {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div 
            key={`card-row-${i}`} 
            className="space-y-2"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
      
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}

const FormSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {Array.from({ length: 4 }).map((_, i) => (
        <div 
          key={`form-field-${i}`} 
          className="space-y-2"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

const ListSkeleton = ({ items = 5 }: { items?: number }) => {
  return (
    <div className="space-y-3 animate-fade-in">
      {Array.from({ length: items }).map((_, i) => (
        <div 
          key={`list-item-${i}`} 
          className="flex items-center gap-4 p-4 rounded-lg border bg-card"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, FormSkeleton, ListSkeleton }
