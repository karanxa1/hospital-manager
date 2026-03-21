import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { doctorApi } from "@/api/doctors"
import api from "@/api/client"

interface QueueItem {
  id: string
  token_number: number
  patient_name: string
  status: string
  start_time: string
}

export default function WalkInDesk() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [patientName, setPatientName] = useState("")
  const [patientPhone, setPatientPhone] = useState("")
  const [complaint, setComplaint] = useState("")
  const [queue, setQueue] = useState<{ current_token: number; appointments: QueueItem[] }>({ current_token: 0, appointments: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    doctorApi.list().then(res => setDoctors(res.data.data))
  }, [])

  const fetchQueue = async () => {
    if (!selectedDoctor) return
    try {
      const res = await api.get(`/api/v1/walkin/queue/${selectedDoctor}`)
      setQueue(res.data.data)
    } catch {
      toast.error("Failed to load queue")
    }
  }

  useEffect(() => { fetchQueue() }, [selectedDoctor])

  const handleIssueToken = async () => {
    if (!selectedDoctor || !patientName || !patientPhone) {
      toast.error("Fill all required fields")
      return
    }
    setLoading(true)
    try {
      const res = await api.post("/api/v1/walkin", {
        doctor_id: selectedDoctor,
        patient_name: patientName,
        patient_phone: patientPhone,
        chief_complaint: complaint,
      })
      if (res.data.success) {
        toast.success(`Token #${res.data.data.token_number} issued`)
        setPatientName("")
        setPatientPhone("")
        setComplaint("")
        fetchQueue()
      } else {
        toast.error(res.data.message)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.message || "Failed to issue token")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Walk-In Desk</h1>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Issue Walk-In Token</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {doctors.map(d => (
                    <SelectItem key={d.id} value={d.id}>Dr. {d.user_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Patient Name</Label>
              <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="space-y-2">
              <Label>Chief Complaint</Label>
              <Input value={complaint} onChange={e => setComplaint(e.target.value)} placeholder="Reason for visit" />
            </div>
            <Button onClick={handleIssueToken} disabled={loading} className="w-full">
              {loading ? "Issuing..." : "Issue Token"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Queue</CardTitle>
            {queue.current_token > 0 && (
              <p className="text-sm text-muted-foreground">Current: Token #{queue.current_token}</p>
            )}
          </CardHeader>
          <CardContent>
            {queue.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tokens issued yet</p>
            ) : (
              <div className="space-y-2">
                {queue.appointments.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                        #{item.token_number}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{item.start_time}</p>
                      </div>
                    </div>
                    <Badge variant={item.status === "completed" ? "secondary" : "outline"}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
