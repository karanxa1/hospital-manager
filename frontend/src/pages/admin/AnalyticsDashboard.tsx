import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
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

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [apptTrend, setApptTrend] = useState<any[]>([])
  const [revenueTrend, setRevenueTrend] = useState<any[]>([])
  const [utilization, setUtilization] = useState<any[]>([])
  const [range, setRange] = useState("30d")
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/analytics/dashboard-summary");
      const summary = res.data.data;
      
      setOverview(summary.overview || {});
      setApptTrend(summary.charts?.appointmentsTrend || []);
      setRevenueTrend(summary.charts?.revenueTrend || []);
      setUtilization(summary.charts?.doctorUtilization || []);
    } catch {
      toast.error("Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [range])

  if (loading || !overview) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          {["7d", "30d", "90d"].map(r => (
            <Button key={r} variant={range === r ? "default" : "outline"} size="sm" onClick={() => setRange(r)}>
              {r}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Patients</p><p className="text-2xl font-bold">{overview.total_patients}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Today's Appointments</p><p className="text-2xl font-bold">{overview.appointments_today}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Monthly Revenue</p><p className="text-2xl font-bold">{formatCurrency(overview.revenue_this_month)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">No-Show Rate</p><p className="text-2xl font-bold">{overview.no_show_rate}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Appointments Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={apptTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#000" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#000" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Doctor Utilization</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {utilization.map((d, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-32 text-sm">{d.doctor_name}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, d.utilization)}%` }} />
                </div>
                <span className="text-sm font-medium w-12">{d.utilization}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
