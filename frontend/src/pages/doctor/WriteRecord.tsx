import { useState } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import api from "@/api/client"

interface Prescription {
  drug_name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

export default function WriteRecord() {
  const { appointmentId } = useParams()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    vital_bp: "",
    vital_pulse: "",
    vital_temp: "",
    vital_weight: "",
  })
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])

  const addRow = () => {
    setPrescriptions([...prescriptions, { drug_name: "", dosage: "", frequency: "", duration: "", instructions: "" }])
  }

  const updateRow = (i: number, field: keyof Prescription, value: string) => {
    const updated = [...prescriptions]
    updated[i][field] = value
    setPrescriptions(updated)
  }

  const removeRow = (i: number) => {
    setPrescriptions(prescriptions.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.post("/api/v1/records", {
        appointment_id: appointmentId,
        subjective: form.subjective,
        objective: form.objective,
        assessment: form.assessment,
        plan: form.plan,
        vital_bp: form.vital_bp || null,
        vital_pulse: form.vital_pulse ? parseInt(form.vital_pulse) : null,
        vital_temp: form.vital_temp ? parseFloat(form.vital_temp) : null,
        vital_weight: form.vital_weight ? parseFloat(form.vital_weight) : null,
        prescriptions: prescriptions.filter(p => p.drug_name).map(p => ({
          ...p,
          instructions: p.instructions || null,
        })),
      })
      toast.success("Record saved")
      window.open(`${import.meta.env.VITE_API_BASE_URL}/api/v1/records/${res.data.data.id}/prescription/pdf`, "_blank")
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Write Medical Record</h1>

      <Card>
        <CardHeader><CardTitle>Vitals</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>BP</Label>
              <Input value={form.vital_bp} onChange={e => setForm({ ...form, vital_bp: e.target.value })} placeholder="120/80" />
            </div>
            <div className="space-y-2">
              <Label>Pulse</Label>
              <Input type="number" value={form.vital_pulse} onChange={e => setForm({ ...form, vital_pulse: e.target.value })} placeholder="72" />
            </div>
            <div className="space-y-2">
              <Label>Temp (°F)</Label>
              <Input type="number" step="0.1" value={form.vital_temp} onChange={e => setForm({ ...form, vital_temp: e.target.value })} placeholder="98.6" />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" value={form.vital_weight} onChange={e => setForm({ ...form, vital_weight: e.target.value })} placeholder="70" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>SOAP Notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subjective</Label>
            <Textarea value={form.subjective} onChange={e => setForm({ ...form, subjective: e.target.value })} placeholder="Patient complaint..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Objective</Label>
            <Textarea value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="Examination findings..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Assessment</Label>
            <Textarea value={form.assessment} onChange={e => setForm({ ...form, assessment: e.target.value })} placeholder="Diagnosis..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Textarea value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} placeholder="Treatment plan..." rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Prescriptions</CardTitle>
            <Button variant="outline" size="sm" onClick={addRow}>Add Drug</Button>
          </div>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prescriptions added yet</p>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((p, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Drug Name</Label>
                    <Input value={p.drug_name} onChange={e => updateRow(i, "drug_name", e.target.value)} placeholder="Paracetamol" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dosage</Label>
                    <Input value={p.dosage} onChange={e => updateRow(i, "dosage", e.target.value)} placeholder="500mg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Frequency</Label>
                    <Input value={p.frequency} onChange={e => updateRow(i, "frequency", e.target.value)} placeholder="3 times/day" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duration</Label>
                    <Input value={p.duration} onChange={e => updateRow(i, "duration", e.target.value)} placeholder="5 days" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeRow(i)}>Remove</Button>
                  <div className="col-span-5">
                    <Input value={p.instructions} onChange={e => updateRow(i, "instructions", e.target.value)} placeholder="Take after meals..." className="text-xs" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Record & Generate PDF"}
        </Button>
      </div>
    </div>
  )
}
