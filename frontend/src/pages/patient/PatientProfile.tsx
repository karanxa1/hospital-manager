import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { patientApi } from "@/api/patients"
import { useAuthStore } from "@/store/authStore"

export default function PatientProfile() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [form, setForm] = useState({
    date_of_birth: "",
    gender: "",
    blood_group: "",
    allergies: "",
    chronic_conditions: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    address: "",
  })

  const fetchProfile = async () => {
    if (!user) return
    try {
      const res = await patientApi.getMe()
      if (res.data.success) {
        const d = res.data.data
        setHasProfile(true)
        setForm({
          date_of_birth: d.date_of_birth || "",
          gender: d.gender || "",
          blood_group: d.blood_group || "",
          allergies: d.allergies || "",
          chronic_conditions: d.chronic_conditions || "",
          emergency_contact_name: d.emergency_contact_name || "",
          emergency_contact_phone: d.emergency_contact_phone || "",
          address: d.address || "",
        })
      }
    } catch {
      setHasProfile(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProfile() }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await patientApi.upsertProfile({
        ...form,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
      })
      toast.success("Profile saved")
      setHasProfile(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const isProfileComplete = form.date_of_birth && form.gender

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">My Profile</h1>
        <p className="text-muted-foreground text-sm">Your personal and medical details</p>
      </div>

      {!isProfileComplete && !hasProfile && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
          <p className="text-sm font-medium text-warning">Profile Incomplete</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please fill in your details to book appointments.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={form.date_of_birth}
                onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select value={form.blood_group} onValueChange={v => setForm({ ...form, blood_group: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Your address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medical Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Allergies</Label>
            <Textarea
              value={form.allergies}
              onChange={e => setForm({ ...form, allergies: e.target.value })}
              placeholder="List any known allergies..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Chronic Conditions</Label>
            <Textarea
              value={form.chronic_conditions}
              onChange={e => setForm({ ...form, chronic_conditions: e.target.value })}
              placeholder="Diabetes, hypertension, etc..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                value={form.emergency_contact_name}
                onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                value={form.emergency_contact_phone}
                onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-stretch sm:justify-end">
        <Button className="w-full touch-manipulation sm:w-auto" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  )
}
