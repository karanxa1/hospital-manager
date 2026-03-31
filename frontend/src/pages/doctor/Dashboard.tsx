import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { appointmentApi } from "@/api/appointments"
import { doctorApi } from "@/api/doctors"
import { useAuthStore } from "@/store/authStore"

interface Appointment {
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

interface AvailabilitySlot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function DoctorDashboard() {
  const { user } = useAuthStore()
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([])
  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([])
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await doctorApi.getMe()
        const doctorId = meRes.data.data.id

        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dateFrom = tomorrow.toISOString().split('T')[0]

        const [todayRes, availRes, upcomingRes] = await Promise.all([
          appointmentApi.doctorToday(),
          doctorApi.getAvailability(doctorId),
          appointmentApi.listAll({ doctor_id: doctorId, date_from: dateFrom })
        ])
        
        setTodayAppts(todayRes.data.data)
        setAvailability(availRes.data.data)
        setUpcomingAppts(upcomingRes.data.data.filter((a: any) => ["pending", "confirmed"].includes(a.status)))
      } catch {
        toast.error("Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }
    if (user?.id) fetchData()
  }, [user?.id])

  const pendingQueue = todayAppts.filter(a => ["pending", "confirmed"].includes(a.status))
  const completedToday = todayAppts.filter(a => a.status === "completed")
  const today = new Date().getDay()
  const todaySlots = availability.filter(s => s.day_of_week === today && s.is_active)

  // Calculate Clinic Hours
  let clinicOpen = "N/A"
  let clinicClose = "N/A"
  if (todaySlots.length > 0) {
    const sortedSlots = [...todaySlots].sort((a, b) => a.start_time.localeCompare(b.start_time))
    clinicOpen = sortedSlots[0].start_time
    const sortedEnds = [...todaySlots].sort((a, b) => b.end_time.localeCompare(a.end_time))
    clinicClose = sortedEnds[0].end_time
  }

  // Upcoming by Type
  const upcomingByType = upcomingAppts.reduce((acc, appt) => {
    const typeLabel = appt.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    if (!acc[typeLabel]) acc[typeLabel] = []
    acc[typeLabel].push(appt)
    return acc
  }, {} as Record<string, Appointment[]>)

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, Dr. {user?.name}</h1>
        <p className="text-muted-foreground text-sm">Your clinic dashboard for today</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">In Queue</p>
            <p className="text-3xl font-bold">{pendingQueue.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending patients today</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-3xl font-bold">{completedToday.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Patients seen today</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Clinic Hours</p>
            <p className="text-lg font-bold mt-1 leading-none">{clinicOpen}</p>
            <p className="text-sm font-medium leading-none text-muted-foreground">to {clinicClose}</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Upcoming</p>
            <p className="text-3xl font-bold text-primary">{upcomingAppts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Future appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Patient */}
      {pendingQueue.length > 0 && (
        <Card className="border-primary/20 bg-primary/5 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Currently Serving</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-2xl font-bold">
                  #{pendingQueue[0].token_number}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold">{pendingQueue[0].patient_name}</p>
                <p className="text-sm text-muted-foreground">
                  {pendingQueue[0].start_time} - {pendingQueue[0].end_time}
                  {pendingQueue[0].chief_complaint && ` · ${pendingQueue[0].chief_complaint}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Link to={`/doctor/record/${pendingQueue[0].id}`}>
                  <Button size="sm">Write Record</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Queue */}
        <Card className="flex flex-col">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-primary">Today's Queue</CardTitle>
                <CardDescription>Patients scheduled for today</CardDescription>
              </div>
              <Link to="/doctor/today"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {pendingQueue.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-muted-foreground font-medium">No patients in queue</p>
                <p className="text-sm text-muted-foreground mt-1">Enjoy your break!</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingQueue.map((appt, i) => (
                  <div key={appt.id} className={`flex items-center justify-between p-4 ${i === 0 ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shadow-sm">
                        #{appt.token_number}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{appt.patient_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {appt.start_time} - {appt.end_time}
                          {appt.chief_complaint && ` · ${appt.chief_complaint}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={appt.status === "confirmed" ? "default" : "secondary"} className="capitalize">
                      {appt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments By Class */}
        <Card className="flex flex-col">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-primary">Upcoming Appointments</CardTitle>
                <CardDescription>Future bookings by category</CardDescription>
              </div>
              <Link to="/doctor/schedule"><Button variant="ghost" size="sm">Manage</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-6">
            {upcomingAppts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">No upcoming appointments</p>
                <p className="text-sm mt-1">Your future schedule is clear.</p>
              </div>
            ) : (
              Object.entries(upcomingByType).map(([type, appts]) => (
                <div key={type} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{type}</h3>
                    <Badge variant="secondary" className="rounded-full px-2 text-xs">{appts.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {appts.slice(0, 3).map(appt => (
                      <div key={appt.id} className="flex justify-between items-center bg-muted/20 rounded-lg p-3 border border-border/50 transition-colors hover:bg-muted/40">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{appt.patient_name || 'Patient'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(appt.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {appt.start_time}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2 text-[10px] bg-background">Pending</Badge>
                      </div>
                    ))}
                    {appts.length > 3 && (
                      <p className="text-xs text-center text-muted-foreground italic pt-1">
                        + {appts.length - 3} more {type.toLowerCase()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
