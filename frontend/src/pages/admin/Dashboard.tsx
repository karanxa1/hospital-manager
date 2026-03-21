import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import api from "@/api/client"

export default function AdminDashboard() {
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/api/v1/analytics/overview").then(res => {
      setOverview(res.data.data)
    }).catch(() => toast.error("Failed")).finally(() => setLoading(false))
  }, [])

  if (loading || !overview) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Patients</p><p className="text-2xl font-bold">{overview.total_patients}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Doctors</p><p className="text-2xl font-bold">{overview.total_doctors}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Today</p><p className="text-2xl font-bold">{overview.appointments_today}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">This Month</p><p className="text-2xl font-bold">{overview.appointments_this_month}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-2">Monthly Revenue</p>
          <p className="text-3xl font-bold">₹{overview.revenue_this_month.toLocaleString()}</p>
        </CardContent>
      </Card>
    </div>
  )
}
