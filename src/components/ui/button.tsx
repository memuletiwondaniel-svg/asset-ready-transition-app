import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { useRipple } from "@/hooks/useRipple"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.96] active:rotate-[0.5deg]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.96] active:rotate-[-0.5deg]",
        outline:
          "border border-input bg-background hover:bg-muted/50 hover:border-border hover:scale-[1.01] active:scale-[0.97] active:rotate-[0.5deg]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover hover:scale-[1.01] active:scale-[0.97] active:rotate-[-0.5deg]",
        ghost: "hover:bg-muted/50 hover:scale-[1.01] active:scale-[0.97] active:rotate-[0.5deg]",
        link: "text-primary underline-offset-4 hover:underline hover:opacity-80 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const createRipple = useRipple()
    const [isPressed, setIsPressed] = React.useState(false)
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      createRipple(e)
      
      // Micro-interaction: brief press animation
      setIsPressed(true)
      setTimeout(() => setIsPressed(false), 150)
      
      props.onClick?.(e)
    }
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }), 
          "relative overflow-hidden",
          isPressed && "animate-micro-press"
        )}
        ref={ref}
        {...props}
        onClick={handleClick}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
