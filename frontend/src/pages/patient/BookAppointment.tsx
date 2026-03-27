import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { doctorApi } from "@/api/doctors"
import { appointmentApi } from "@/api/appointments"
import { DoctorCard } from "@/components/DoctorCard"
import { formatCurrency } from "@/utils/date"

interface Doctor {
  id: string
  user_name: string
  user_profile_picture: string | null
  specialization: string
  qualification: string
  experience_years: number
  consultation_fee: number
  avg_consultation_minutes: number
}

interface Slot {
  start_time: string
  end_time: string
}

export default function BookAppointment() {
  const [step, setStep] = useState(1)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedDate, setSelectedDate] = useState("")
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [consultationType, setConsultationType] = useState<string>("offline_checkup")
  const [complaint, setComplaint] = useState("")
  const [loading, setLoading] = useState(false)
  const [booked, setBooked] = useState<any>(null)

  useEffect(() => {
    doctorApi.list().then(res => setDoctors(res.data.data))
  }, [])

  const loadSlots = async (doctorId: string, date: string) => {
    const res = await doctorApi.getSlots(doctorId, date)
    setSlots(res.data.data)
  }

  const handleDoctorSelect = (doc: Doctor) => {
    setSelectedDoctor(doc)
    setStep(2)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    if (selectedDoctor) {
      loadSlots(selectedDoctor.id, date)
      setStep(3)
    }
  }

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot)
    setStep(4)
  }

  const handleTypeSelect = (type: string) => {
    setConsultationType(type)
    setStep(5)
  }

  const handleBook = async () => {
    if (!selectedDoctor || !selectedSlot) return
    setLoading(true)
    try {
      const res = await appointmentApi.create({
        doctor_id: selectedDoctor.id,
        appointment_date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        type: consultationType,
        chief_complaint: complaint,
      })
      setBooked(res.data.data)
      setStep(6)
      toast.success("Appointment booked!")
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.message || "Booking failed")
    } finally {
      setLoading(false)
    }
  }

  if (booked) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xl font-bold">{booked.token_number}</span>
            </div>
            <CardTitle>Booking Confirmed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span>{booked.doctor_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{booked.type?.replace(/_/g, " ")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{booked.appointment_date}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{booked.start_time} - {booked.end_time}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Token</span><span className="font-bold">#{booked.token_number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>{formatCurrency(booked.payment_amount)}</span></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-sm text-muted-foreground">
        {["Select Doctor", "Pick Date", "Pick Time", "Type", "Confirm"].map((label, i) => (
          <span key={i} className={step > i ? "text-primary font-medium" : step === i + 1 ? "font-medium" : ""}>
            {i + 1}. {label} {i < 4 && "→ "}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map(doc => (
            <DoctorCard
              key={doc.id}
              {...doc}
              onClick={() => handleDoctorSelect(doc)}
            />
          ))}
        </div>
      )}

      {step === 2 && selectedDoctor && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep(1)}>← Back to doctors</Button>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-6">
                <Badge variant="secondary">{selectedDoctor.specialization}</Badge>
                <span className="text-sm text-muted-foreground">{formatCurrency(selectedDoctor.consultation_fee)}</span>
              </div>
              <Label>Select Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => handleDateSelect(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="max-w-xs mt-2"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
          <h3 className="font-semibold">Available Slots for {selectedDate}</h3>
          {slots.length === 0 ? (
            <p className="text-muted-foreground">No slots available on this date.</p>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {slots.map((slot, i) => (
                <Button
                  key={i}
                  variant={selectedSlot === slot ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSlotSelect(slot)}
                >
                  {slot.start_time}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 max-w-md">
          <Button variant="ghost" onClick={() => setStep(3)}>← Back</Button>
          <h3 className="text-lg font-semibold">Choose Consultation Method</h3>
          <div className="grid grid-cols-1 gap-4">
            <Card 
              className={`cursor-pointer hover:border-primary transition-colors ${consultationType === 'video_consultation' ? 'border-primary ring-1 ring-primary' : ''}`}
              onClick={() => handleTypeSelect('video_consultation')}
            >
              <CardContent className="pt-6">
                <h4 className="font-bold">Video Call</h4>
                <p className="text-sm text-muted-foreground">Consultancy only. Perfect for follow-ups or initial discussions from home.</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer hover:border-primary transition-colors ${consultationType === 'offline_checkup' ? 'border-primary ring-1 ring-primary' : ''}`}
              onClick={() => handleTypeSelect('offline_checkup')}
            >
              <CardContent className="pt-6">
                <h4 className="font-bold">Offline Checkup</h4>
                <p className="text-sm text-muted-foreground">In-person visit to the hospital clinic for physical examination.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {step === 5 && selectedDoctor && selectedSlot && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Confirm Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span>Dr. {selectedDoctor.user_name}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="secondary" className="capitalize">
                  {consultationType.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{selectedDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{selectedSlot.start_time} - {selectedSlot.end_time}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>{formatCurrency(selectedDoctor.consultation_fee)}</span></div>
            </div>
            <div className="space-y-2">
              <Label>Chief Complaint (optional)</Label>
              <Textarea
                value={complaint}
                onChange={e => setComplaint(e.target.value)}
                placeholder="Describe your symptoms..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(4)}>← Back</Button>
              <Button onClick={handleBook} disabled={loading} className="flex-1">
                {loading ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

