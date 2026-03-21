import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { appointmentApi } from "@/api/appointments"
import { useAuthStore } from "@/store/authStore"

interface TodayAppointment {
  id: string
  patient_name: string
  patient_phone: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  token_number: number
  chief_complaint: string | null
  type: string
}

export default function TodayQueue() {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState<TodayAppointment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchToday = async () => {
    try {
      const res = await appointmentApi.doctorToday()
      setAppointments(res.data.data)
    } catch {
      toast.error("Failed to load queue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchToday() }, [])

  const handleComplete = async (id: string) => {
    try {
      await appointmentApi.complete(id)
      toast.success("Completed")
      fetchToday()
    } catch {
      toast.error("Failed")
    }
  }

  const handleNoShow = async (id: string) => {
    try {
      await appointmentApi.noShow(id)
      toast.success("Marked as no-show")
      fetchToday()
    } catch {
      toast.error("Failed")
    }
  }

  const pendingQueue = appointments.filter(a => ["pending", "confirmed"].includes(a.status))

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today's Queue</h1>
        <Button variant="outline" onClick={fetchToday}>Refresh</Button>
      </div>

      {pendingQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-3xl font-bold">
                  #{pendingQueue[0].token_number}
                </span>
              </div>
              <p className="mt-2 font-medium">{pendingQueue[0].patient_name}</p>
              <p className="text-sm text-muted-foreground">
                {pendingQueue[0].start_time} - {pendingQueue[0].end_time}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">Queue</h2>
        {pendingQueue.length === 0 ? (
          <p className="text-muted-foreground">No appointments in queue</p>
        ) : (
          pendingQueue.map(appt => (
            <Card key={appt.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                    #{appt.token_number}
                  </div>
                  <div>
                    <p className="font-medium">{appt.patient_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {appt.start_time} - {appt.end_time}
                      {appt.chief_complaint && ` · ${appt.chief_complaint}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={appt.status === "confirmed" ? "default" : "outline"}>
                    {appt.status}
                  </Badge>
                  <Button size="sm" onClick={() => handleComplete(appt.id)}>Complete</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleNoShow(appt.id)}>No Show</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
