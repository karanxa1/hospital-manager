import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { appointmentApi } from "@/api/appointments"
import { doctorApi } from "@/api/doctors"
import { useAuthStore } from "@/store/authStore"
import { formatRelativeDate } from "@/utils/date"

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
  const [todayAppts, setTodayAppts] = useState<TodayAppointment[]>([])
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todayRes, availRes] = await Promise.all([
          appointmentApi.doctorToday(),
          doctorApi.getAvailability(user?.id || ""),
        ])
        setTodayAppts(todayRes.data.data)
        setAvailability(availRes.data.data)
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
            <p className="text-xs text-muted-foreground mt-1">Pending patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-3xl font-bold">{completedToday.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Today</p>
            <p className="text-3xl font-bold">{todayAppts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Schedule</p>
            <p className="text-3xl font-bold">{todaySlots.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Slots today</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Patient */}
      {pendingQueue.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
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

      {/* Queue & Schedule */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today's Queue</CardTitle>
              <Link to="/doctor/today"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingQueue.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No patients in queue</p>
                <p className="text-xs text-muted-foreground mt-1">Enjoy your break!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingQueue.slice(0, 5).map((appt, i) => (
                  <div
                    key={appt.id}
                    className={`flex items-center justify-between border-b py-3 last:border-0 ${i === 0 ? "bg-primary/5 -mx-2 px-2 rounded-lg border-0" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                        #{appt.token_number}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{appt.patient_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {appt.start_time} - {appt.end_time}
                          {appt.chief_complaint && ` · ${appt.chief_complaint}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={appt.status === "confirmed" ? "default" : "outline"}>
                        {appt.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today's Schedule</CardTitle>
              <Link to="/doctor/schedule"><Button variant="ghost" size="sm">Manage</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {todaySlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No schedule set for today</p>
                <Link to="/doctor/schedule">
                  <Button variant="outline" size="sm" className="mt-2">Set Availability</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">{DAY_NAMES[today]}</p>
                {todaySlots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between border-b py-2 last:border-0">
                    <span className="text-sm">{slot.start_time} - {slot.end_time}</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link to="/doctor/today">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <span className="text-lg">Q</span>
              </div>
              <p className="font-medium text-sm">Today's Queue</p>
              <p className="text-xs text-muted-foreground">{pendingQueue.length} waiting</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/doctor/schedule">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <span className="text-lg">S</span>
              </div>
              <p className="font-medium text-sm">My Schedule</p>
              <p className="text-xs text-muted-foreground">{availability.length} slots</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/doctor/patients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <span className="text-lg">P</span>
              </div>
              <p className="font-medium text-sm">Patients</p>
              <p className="text-xs text-muted-foreground">View records</p>
            </CardContent>
          </Card>
        </Link>
        {pendingQueue.length > 0 && (
          <Link to={`/doctor/record/${pendingQueue[0].id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20">
              <CardContent className="pt-6 text-center">
                <div className="mx-auto h-10 w-10 rounded-full bg-primary flex items-center justify-center mb-2">
                  <span className="text-primary-foreground text-lg">+</span>
                </div>
                <p className="font-medium text-sm">Write Record</p>
                <p className="text-xs text-muted-foreground">Current patient</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}
