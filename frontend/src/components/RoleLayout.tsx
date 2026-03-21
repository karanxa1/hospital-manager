import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Menu } from "lucide-react"
import { Sidebar } from "@/components/Sidebar"
import { Button } from "@/components/ui/button"

export default function RoleLayout() {
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3 md:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 touch-manipulation"
          aria-label="Open menu"
          onClick={() => setMobileNav(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="min-w-0 truncate text-sm font-semibold">Clinic</span>
      </header>

      {mobileNav ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <Sidebar mobileOpen={mobileNav} onNavigate={() => setMobileNav(false)} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto bg-muted/30">
        <div className="flex-1 p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
