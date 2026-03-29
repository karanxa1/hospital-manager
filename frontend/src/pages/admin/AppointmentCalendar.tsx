import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { appointmentApi } from "@/api/appointments"
import { doctorApi } from "@/api/doctors"

interface Appointment {
  id: string
  doctor_name: string
  patient_id: string
  doctor_id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  type: string
  token_number: number
  chief_complaint: string | null
}

export default function AppointmentCalendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState("")
  const [filterDoctor, setFilterDoctor] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [doctors, setDoctors] = useState<any[]>([])

  useEffect(() => {
    doctorApi.list().then(res => setDoctors(res.data.data))
  }, [])

  const fetchAppointments = async () => {
    try {
      const params: any = {}
      if (filterDate) params.date_from = filterDate
      if (filterDate) params.date_to = filterDate
      if (filterDoctor !== "all") params.doctor_id = filterDoctor
      if (filterStatus !== "all") params.status = filterStatus
      
      // Prevent fetching the entire database if no filters are applied
      if (!filterDate && filterDoctor === "all" && filterStatus === "all") {
        params.limit = 50;
      }

      const res = await appointmentApi.listAll(params)
      setAppointments(res.data.data)
    } catch {
      toast.error("Failed to load appointments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAppointments() }, [filterDate, filterDoctor, filterStatus])

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    confirmed: "default",
    completed: "secondary",
    cancelled: "destructive",
    no_show: "destructive",
  }

  const handleStatusChange = async (id: string, action: string) => {
    try {
      await (appointmentApi as any)[action](id)
      toast.success(`Updated`)
      fetchAppointments()
    } catch {
      toast.error("Failed")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Appointments</h1>

      <div className="flex gap-3 flex-wrap">
        <Input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="w-40"
        />
        <Select value={filterDoctor} onValueChange={setFilterDoctor}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Doctors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Doctors</SelectItem>
            {doctors.map(d => (
              <SelectItem key={d.id} value={d.id}>Dr. {d.user_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.length === 0 ? (
            <p className="text-muted-foreground">No appointments found</p>
          ) : (
            appointments.map(appt => (
              <Card key={appt.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{appt.doctor_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {appt.appointment_date} · {appt.start_time}-{appt.end_time} · Token #{appt.token_number}
                    </p>
                    {appt.chief_complaint && (
                      <p className="text-xs text-muted-foreground">{appt.chief_complaint}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[appt.status]}>{appt.status}</Badge>
                    {appt.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(appt.id, "confirm")}>Confirm</Button>
                    )}
                    {["pending", "confirmed"].includes(appt.status) && (
                      <Button size="sm" variant="ghost" onClick={() => handleStatusChange(appt.id, "cancel")}>Cancel</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
