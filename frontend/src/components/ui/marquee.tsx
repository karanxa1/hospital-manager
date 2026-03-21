import { type ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  pauseOnHover?: boolean
  durationSec?: number
}

/** Two-track horizontal marquee (infinite). */
export function Marquee({ className, pauseOnHover = false, durationSec = 32, children, style, ...props }: MarqueeProps) {
  return (
    <div {...props} className={cn("group flex overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max min-w-full shrink-0 gap-8 motion-safe:animate-marquee-loop",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        style={{ ...style, animationDuration: `${durationSec}s` }}
      >
        <div className="flex items-center gap-8 px-2">{children}</div>
        <div className="flex items-center gap-8 px-2" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}
