import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { doctorApi } from "@/api/doctors"
import { useAuthStore } from "@/store/authStore"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface AvailabilitySlot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

interface Leave {
  id: string
  leave_date: string
  reason: string | null
}

export default function MySchedule() {
  const { user } = useAuthStore()
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [availDialogOpen, setAvailDialogOpen] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [newSlot, setNewSlot] = useState({ start_time: "09:00", end_time: "12:00" })
  const [leaveDate, setLeaveDate] = useState("")
  const [leaveReason, setLeaveReason] = useState("")

  const doctorId = user?.id

  const fetchData = async () => {
    if (!doctorId) return
    try {
      const [availRes, leaveRes] = await Promise.all([
        doctorApi.getAvailability(doctorId),
        doctorApi.getLeaves(doctorId),
      ])
      setSlots(availRes.data.data)
      setLeaves(leaveRes.data.data)
    } catch {
      toast.error("Failed to load schedule")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [doctorId])

  const slotsByDay = DAYS.map((day, i) => ({
    day,
    dayIndex: i,
    slots: slots.filter(s => s.day_of_week === i),
  }))

  const handleAddAvailability = async () => {
    if (!doctorId || selectedDay === null) return
    const updatedSlots = slots
      .filter(s => s.day_of_week !== selectedDay)
      .map(s => ({ day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time }))

    updatedSlots.push({
      day_of_week: selectedDay,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
    })

    try {
      await doctorApi.setAvailability(doctorId, updatedSlots)
      toast.success("Availability updated")
      setAvailDialogOpen(false)
      fetchData()
    } catch {
      toast.error("Failed to update availability")
    }
  }

  const handleRemoveSlot = async (slotId: string) => {
    if (!doctorId) return
    try {
      await doctorApi.deleteAvailabilitySlot(doctorId, slotId)
      toast.success("Slot removed")
      fetchData()
    } catch {
      toast.error("Failed to remove slot")
    }
  }

  const handleMarkLeave = async () => {
    if (!doctorId || !leaveDate) return
    try {
      await doctorApi.markLeave(doctorId, { leave_date: leaveDate, reason: leaveReason })
      toast.success("Leave marked")
      setLeaveDialogOpen(false)
      setLeaveDate("")
      setLeaveReason("")
      fetchData()
    } catch {
      toast.error("Failed to mark leave")
    }
  }

  const handleCancelLeave = async (leaveId: string) => {
    if (!doctorId) return
    try {
      await doctorApi.cancelLeave(doctorId, leaveId)
      toast.success("Leave cancelled")
      fetchData()
    } catch {
      toast.error("Failed to cancel leave")
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground text-sm">Manage your weekly availability and leave</p>
        </div>
        <Button variant="outline" onClick={() => setLeaveDialogOpen(true)}>Mark Leave</Button>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {slotsByDay.map(({ day, dayIndex, slots: daySlots }) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-center">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {daySlots.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No slots</p>
              ) : (
                daySlots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between bg-muted rounded px-2 py-1">
                    <span className="text-xs">{slot.start_time}-{slot.end_time}</span>
                    <button
                      className="text-xs text-destructive hover:underline"
                      onClick={() => handleRemoveSlot(slot.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setSelectedDay(dayIndex)
                  setAvailDialogOpen(true)
                }}
              >
                + Add
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Leaves</CardTitle>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leaves marked</p>
          ) : (
            <div className="space-y-2">
              {leaves.map(leave => (
                <div key={leave.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{leave.leave_date}</p>
                    <p className="text-xs text-muted-foreground">{leave.reason || "No reason provided"}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCancelLeave(leave.id)}>
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={availDialogOpen} onOpenChange={setAvailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability — {selectedDay !== null ? DAYS[selectedDay] : ""}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={newSlot.start_time} onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={newSlot.end_time} onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAvailability}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Leave</DialogTitle>
            <DialogDescription>Select a date you'll be unavailable</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Leave Date</Label>
              <Input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Personal leave..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkLeave}>Mark Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
