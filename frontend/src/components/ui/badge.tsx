import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline"
}) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border-border bg-background/80 text-foreground dark:bg-transparent",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
