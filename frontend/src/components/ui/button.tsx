import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium touch-manipulation select-none transition-[color,background-color,border-color,transform,box-shadow] duration-150 ease-out will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/88 hover:shadow-md active:bg-primary/95 active:shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/88 hover:shadow active:bg-destructive/95",
        outline:
          "border-2 border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-ring/40 hover:shadow active:bg-accent/90",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/65 active:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/70",
        link: "min-h-11 px-1 text-primary underline-offset-4 hover:underline active:text-primary/80 active:scale-100",
      },
      size: {
        default: "min-h-11 px-5 py-2.5",
        sm: "min-h-10 rounded-md px-3.5 py-2 text-xs",
        lg: "min-h-12 rounded-md px-8 py-3 text-base",
        icon: "size-11 min-h-11 min-w-11 shrink-0 p-0",
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
