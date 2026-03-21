import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { doctorApi } from "@/api/doctors"

interface Doctor {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_profile_picture: string | null
  specialization: string
  qualification: string
  experience_years: number
  bio: string | null
  consultation_fee: number
  avg_consultation_minutes: number
  created_at: string
}

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [form, setForm] = useState({
    user_id: "",
    specialization: "",
    qualification: "",
    experience_years: 0,
    bio: "",
    consultation_fee: 0,
    avg_consultation_minutes: 15,
  })

  const fetchDoctors = async () => {
    try {
      const res = await doctorApi.list()
      setDoctors(res.data.data)
    } catch {
      toast.error("Failed to load doctors")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDoctors() }, [])

  const handleSubmit = async () => {
    try {
      if (selectedDoctor) {
        await doctorApi.update(selectedDoctor.id, {
          specialization: form.specialization,
          qualification: form.qualification,
          experience_years: form.experience_years,
          bio: form.bio,
          consultation_fee: form.consultation_fee,
          avg_consultation_minutes: form.avg_consultation_minutes,
        })
        toast.success("Doctor updated")
      } else {
        await doctorApi.create(form)
        toast.success("Doctor created")
      }
      setDialogOpen(false)
      fetchDoctors()
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.message || "Operation failed")
    }
  }

  const openCreate = () => {
    setSelectedDoctor(null)
    setForm({
      user_id: "",
      specialization: "",
      qualification: "",
      experience_years: 0,
      bio: "",
      consultation_fee: 0,
      avg_consultation_minutes: 15,
    })
    setDialogOpen(true)
  }

  const openEdit = (doc: Doctor) => {
    setSelectedDoctor(doc)
    setForm({
      user_id: doc.user_id,
      specialization: doc.specialization,
      qualification: doc.qualification,
      experience_years: doc.experience_years,
      bio: doc.bio || "",
      consultation_fee: doc.consultation_fee,
      avg_consultation_minutes: doc.avg_consultation_minutes,
    })
    setDialogOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Doctors</h1>
          <p className="text-muted-foreground text-sm">Manage doctor profiles and availability</p>
        </div>
        <Button onClick={openCreate}>Add Doctor</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Slot Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No doctors found. Add your first doctor.
                    </TableCell>
                  </TableRow>
                ) : (
                  doctors.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={doc.user_profile_picture || undefined} />
                            <AvatarFallback>{doc.user_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">Dr. {doc.user_name}</p>
                            <p className="text-xs text-muted-foreground">{doc.qualification}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{doc.specialization}</Badge></TableCell>
                      <TableCell>₹{doc.consultation_fee}</TableCell>
                      <TableCell>{doc.avg_consultation_minutes} min</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(doc)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDoctor ? "Edit Doctor" : "Add Doctor"}</DialogTitle>
            <DialogDescription>
              {selectedDoctor ? "Update doctor profile details." : "Enter the user ID of an existing user to create a doctor profile."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedDoctor && (
              <div className="space-y-2">
                <Label>User ID (UUID)</Label>
                <Input
                  value={form.user_id}
                  onChange={e => setForm({ ...form, user_id: e.target.value })}
                  placeholder="UUID of existing user"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={form.specialization}
                  onChange={e => setForm({ ...form, specialization: e.target.value })}
                  placeholder="e.g. Cardiology"
                />
              </div>
              <div className="space-y-2">
                <Label>Qualification</Label>
                <Input
                  value={form.qualification}
                  onChange={e => setForm({ ...form, qualification: e.target.value })}
                  placeholder="e.g. MBBS, MD"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Experience (years)</Label>
                <Input
                  type="number"
                  value={form.experience_years}
                  onChange={e => setForm({ ...form, experience_years: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Consultation Fee (₹)</Label>
                <Input
                  type="number"
                  value={form.consultation_fee}
                  onChange={e => setForm({ ...form, consultation_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Slot Duration (min)</Label>
                <Input
                  type="number"
                  value={form.avg_consultation_minutes}
                  onChange={e => setForm({ ...form, avg_consultation_minutes: parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Brief description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {selectedDoctor ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
