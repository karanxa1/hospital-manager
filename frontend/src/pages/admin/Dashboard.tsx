import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import api from "@/api/client"
import { formatCurrency } from "@/utils/date"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface Overview {
  total_patients: number
  total_doctors: number
  appointments_today: number
  appointments_this_month: number
  revenue_this_month: number
  no_show_rate: string
  top_doctors: { doctor_name: string; appointment_count: number }[]
}

interface AppointmentTrend {
  date: string
  count: number
}

interface DoctorUtilization {
  doctor_name: string
  booked_slots: number
  available_slots: number
  utilization: number
}

const COLORS = ["#000000", "#333333", "#666666", "#999999", "#cccccc"]

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [apptTrend, setApptTrend] = useState<AppointmentTrend[]>([])
  const [utilization, setUtilization] = useState<DoctorUtilization[]>([])
  const [recentAppts, setRecentAppts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ovRes, apptRes, utilRes, recentRes] = await Promise.all([
          api.get("/api/v1/analytics/overview"),
          api.get("/api/v1/analytics/appointments?range=7d"),
          api.get("/api/v1/analytics/doctor-utilization"),
          api.get("/api/v1/appointments", { params: { status: "pending" } }),
        ])
        setOverview(ovRes.data.data)
        setApptTrend(apptRes.data.data)
        setUtilization(utilRes.data.data)
        setRecentAppts(recentRes.data.data.slice(0, 5))
      } catch {
        toast.error("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const triggerSync = async (city: string = "Pune") => {
    toast.promise(api.post(`/api/v1/hospitals/sync?city=${city}`), {
      loading: `Syncing hospitals from ${city}...`,
      success: (res) => `Successfully added ${res.data.data.added} new hospitals!`,
      error: "Sync failed. Please try again.",
    })
  }

  if (loading || !overview) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  const statusData = [
    { name: "Today", value: overview.appointments_today },
    { name: "This Month", value: overview.appointments_this_month },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Clinic overview and management</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/appointments"><Button variant="outline" size="sm">View Calendar</Button></Link>
          <Link to="/admin/analytics"><Button size="sm">Full Analytics</Button></Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-3xl font-bold">{overview.total_patients}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xl">P</span>
              </div>
            </div>
            <Link to="/admin/patients" className="text-xs text-primary mt-2 block hover:underline">
              View all patients
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Doctors</p>
                <p className="text-3xl font-bold">{overview.total_doctors}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xl">D</span>
              </div>
            </div>
            <Link to="/admin/doctors" className="text-xs text-primary mt-2 block hover:underline">
              Manage doctors
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Appts</p>
                <p className="text-3xl font-bold">{overview.appointments_today}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xl">A</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {overview.appointments_this_month} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(overview.revenue_this_month)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xl">₹</span>
              </div>
            </div>
            <Link to="/admin/billing" className="text-xs text-primary mt-2 block hover:underline">
              View billing
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {apptTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No appointment data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={apptTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#000" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Doctors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Doctors</CardTitle>
              <Link to="/admin/doctors"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {overview.top_doctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No doctor data</p>
            ) : (
              <div className="space-y-3">
                {overview.top_doctors.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium">{doc.doctor_name}</span>
                    </div>
                    <Badge variant="secondary">{doc.appointment_count} appts</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctor Utilization */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Doctor Utilization</CardTitle>
              <Link to="/admin/analytics"><Button variant="ghost" size="sm">Details</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {utilization.length === 0 ? (
              <p className="text-sm text-muted-foreground">No utilization data</p>
            ) : (
              <div className="space-y-3">
                {utilization.slice(0, 5).map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{d.doctor_name}</span>
                      <span className="text-muted-foreground">{d.utilization}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, d.utilization)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Appointments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pending Appointments</CardTitle>
            <Link to="/admin/appointments"><Button variant="ghost" size="sm">View All</Button></Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending appointments</p>
          ) : (
            <div className="space-y-2">
              {recentAppts.map(appt => (
                <div key={appt.id} className="flex items-center justify-between border-b py-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{appt.doctor_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {appt.appointment_date} at {appt.start_time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Token #{appt.token_number}</Badge>
                    <Badge>{appt.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link to="/admin/doctors">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <p className="font-medium">Manage Doctors</p>
              <p className="text-xs text-muted-foreground mt-1">Add, edit, availability</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/patients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <p className="font-medium">Patient Records</p>
              <p className="text-xs text-muted-foreground mt-1">View all patients</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/walkin">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <p className="font-medium">Walk-In Desk</p>
              <p className="text-xs text-muted-foreground mt-1">Register walk-ins</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/billing">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <p className="font-medium">Billing</p>
              <p className="text-xs text-muted-foreground mt-1">Invoices & payments</p>
            </CardContent>
          </Card>
        </Link>
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer bg-primary text-primary-foreground"
          onClick={() => triggerSync("Pune")}
        >
          <CardContent className="pt-6 text-center">
            <p className="font-medium">Sync Hospitals</p>
            <p className="text-xs opacity-70 mt-1">Import from OpenStreetMap</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
