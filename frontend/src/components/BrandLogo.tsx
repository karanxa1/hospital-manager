import logo from "@/assets/clinic-brand-logo.png"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  className?: string
  labelClassName?: string
  showLabel?: boolean
}

export function BrandLogo({ className, labelClassName, showLabel = true }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img src={logo} alt="Clinic logo" className="h-9 w-9 rounded-xl object-cover" />
      {showLabel ? <span className={cn("font-semibold tracking-tight text-white", labelClassName)}>Clinic</span> : null}
    </div>
  )
}
