import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { appointmentApi } from "@/api/appointments"
import { useAuthStore } from "@/store/authStore"

export default function DoctorDashboard() {
  const { user } = useAuthStore()
  const [todayCount, setTodayCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    appointmentApi.doctorToday().then(res => {
      setTodayCount(res.data.data.length)
    }).catch(() => toast.error("Failed")).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, Dr. {user?.name}</h1>
        <p className="text-muted-foreground text-sm">Today's overview</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{todayCount}</p>
            <p className="text-sm text-muted-foreground">Today's Appointments</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
