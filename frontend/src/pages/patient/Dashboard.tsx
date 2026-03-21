import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Link } from "react-router-dom"
import { appointmentApi } from "@/api/appointments"
import { useAuthStore } from "@/store/authStore"

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    setLoading(true)

    appointmentApi
      .myAppointments()
      .then((res) => {
        if (cancelled) return
        const rows = res.data?.data
        setAppointments(Array.isArray(rows) ? rows : [])
      })
      .catch((err) => {
        if (cancelled) return
        setAppointments([])
        const status = err.response?.status
        if (status && status >= 500) toast.error("Failed to load appointments")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const upcoming = appointments.filter(a => ["pending", "confirmed"].includes(a.status)).slice(0, 3)

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground text-sm">Your clinic dashboard</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/patient/book">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xl">+</span>
              </div>
              <p className="font-medium">Book Appointment</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/patient/history">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xl">H</span>
              </div>
              <p className="font-medium">Medical History</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Upcoming Appointments</CardTitle>
            <Link to="/patient/appointments" className="shrink-0"><Button variant="ghost" size="sm" className="touch-manipulation">View All</Button></Link>
          </div>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map(a => (
                <div key={a.id} className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.doctor_name}</p>
                    <p className="text-xs text-muted-foreground">{a.appointment_date} at {a.start_time}</p>
                  </div>
                  <Badge variant="outline" className="w-fit shrink-0">Token #{a.token_number}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
