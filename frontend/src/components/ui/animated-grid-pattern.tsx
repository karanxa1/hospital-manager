import type { CSSProperties } from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

type AnimatedGridPatternProps = {
  className?: string
  width?: number
  height?: number
  x?: number
  y?: number
  squares?: [number, number][]
}

const DEFAULT_SQUARES: [number, number][] = [
  [2, 2],
  [4, 7],
  [8, 3],
  [11, 8],
  [14, 4],
  [17, 9],
]

export function AnimatedGridPattern({
  className,
  width = 56,
  height = 56,
  x = -1,
  y = -1,
  squares = DEFAULT_SQUARES,
}: AnimatedGridPatternProps) {
  const style = {
    "--grid-width": `${width}px`,
    "--grid-height": `${height}px`,
    "--grid-x": `${x}px`,
    "--grid-y": `${y}px`,
  } as CSSProperties

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/35" />
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundSize: "var(--grid-width) var(--grid-height)",
          backgroundPosition: "var(--grid-x) var(--grid-y)",
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 1px)",
        }}
        animate={{ backgroundPositionX: ["0px", "56px"], backgroundPositionY: ["0px", "56px"] }}
        transition={{ duration: 12, ease: "linear", repeat: Infinity }}
      />
      {squares.map(([sx, sy], i) => (
        <motion.div
          key={`${sx}-${sy}`}
          className="absolute rounded-sm border border-primary/25 bg-primary/10"
          style={{
            left: `calc(${sx} * var(--grid-width))`,
            top: `calc(${sy} * var(--grid-height))`,
            width: "calc(var(--grid-width) - 1px)",
            height: "calc(var(--grid-height) - 1px)",
          }}
          animate={{ opacity: [0.15, 0.45, 0.15] }}
          transition={{ duration: 3 + i * 0.35, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}
