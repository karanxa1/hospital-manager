import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { appointmentApi } from "@/api/appointments"
import { formatCurrency } from "@/utils/date"

interface Appointment {
  id: string
  doctor_name: string
  doctor_specialization: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  token_number: number
  chief_complaint: string | null
  payment_amount: number
  payment_status: string
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  completed: "secondary",
  cancelled: "destructive",
  no_show: "destructive",
}

export default function MyAppointments() {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await appointmentApi.myAppointments()
      const rows = res.data?.data
      setAppointments(Array.isArray(rows) ? rows : [])
    } catch (err: unknown) {
      setAppointments([])
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status && status >= 500) toast.error("Failed to load appointments")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    void fetchAppointments()
  }, [user?.id, fetchAppointments])

  const handleCancel = async (id: string) => {
    try {
      await appointmentApi.cancel(id)
      toast.success("Appointment cancelled")
      fetchAppointments()
    } catch {
      toast.error("Failed to cancel")
    }
  }

  const upcoming = appointments.filter(a => ["pending", "confirmed"].includes(a.status))
  const past = appointments.filter(a => !["pending", "confirmed"].includes(a.status))

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">My Appointments</h1>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming appointments</p>
        ) : (
          upcoming.map(appt => (
            <Card key={appt.id}>
              <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{appt.doctor_name}</p>
                  <p className="text-sm text-muted-foreground">{appt.doctor_specialization}</p>
                  <p className="text-sm">{appt.appointment_date} at {appt.start_time}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end sm:text-right">
                  <Badge className="w-fit" variant={statusColors[appt.status]}>{appt.status}</Badge>
                  <p className="text-sm">Token #{appt.token_number}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(appt.payment_amount)}</p>
                  <Button variant="ghost" size="sm" className="touch-manipulation sm:self-end" onClick={() => handleCancel(appt.id)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past appointments</p>
        ) : (
          past.map(appt => (
            <Card key={appt.id}>
              <CardContent className="flex flex-col gap-3 pt-4 opacity-70 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{appt.doctor_name}</p>
                  <p className="text-sm">{appt.appointment_date} at {appt.start_time}</p>
                </div>
                <Badge className="w-fit shrink-0" variant={statusColors[appt.status]}>{appt.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
