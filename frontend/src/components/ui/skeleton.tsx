import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
)
Skeleton.displayName = "Skeleton"

export { Skeleton }
