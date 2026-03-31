import { Link, useLocation } from "react-router-dom"
import { BrandLogo } from "@/components/BrandLogo"
import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/store/authStore"

type SidebarProps = {
  /** When false on small screens, drawer is off-canvas */
  mobileOpen?: boolean
  /** Close mobile drawer after navigation */
  onNavigate?: () => void
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

export function Sidebar({ mobileOpen = false, onNavigate }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const roleNavItems: Record<string, NavItem[]> = {
    patient: [
      { label: "Dashboard", href: "/patient/dashboard", icon: "O" },
      { label: "Find Hospitals", href: "/patient/hospitals", icon: "M" },
      { label: "Book Appointment", href: "/patient/book", icon: "B" },
      { label: "My Appointments", href: "/patient/appointments", icon: "A" },
      { label: "Medical History", href: "/patient/history", icon: "H" },
      { label: "Profile", href: "/patient/profile", icon: "P" },
    ],
    doctor: [
      { label: "Dashboard", href: "/doctor/dashboard", icon: "O" },
      { label: "Today's Queue", href: "/doctor/today", icon: "Q" },
      { label: "My Schedule", href: "/doctor/schedule", icon: "S" },
      { label: "Patients", href: "/doctor/patients", icon: "P" },
    ],
    admin: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "O" },
      { label: "Doctors", href: "/admin/doctors", icon: "D" },
      { label: "Patients", href: "/admin/patients", icon: "P" },
      { label: "Appointments", href: "/admin/appointments", icon: "A" },
      { label: "Walk-In Desk", href: "/admin/walkin", icon: "W" },
      { label: "Billing", href: "/admin/billing", icon: "$" },
      { label: "Analytics", href: "/admin/analytics", icon: "C" },
    ],
  }

  const items = user ? roleNavItems[user.role] || [] : []

  return (
    <aside
      className={cn(
        "flex w-[min(100vw-2rem,16rem)] flex-col border-r bg-background sm:w-64",
        "fixed bottom-0 left-0 z-50 md:sticky md:top-0 md:z-0",
        "top-14 max-h-[calc(100dvh-3.5rem)] transition-transform duration-200 ease-out md:max-h-none md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "md:h-screen md:shrink-0"
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-semibold" onClick={onNavigate}>
          <BrandLogo labelClassName="text-lg" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "flex touch-manipulation items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors md:py-2",
              location.pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center text-xs">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <Separator />

      <div className="shrink-0 p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profile_picture || undefined} />
            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={logout}>
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
