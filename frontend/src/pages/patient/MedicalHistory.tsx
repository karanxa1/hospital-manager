import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { patientApi } from "@/api/patients"
import { useAuthStore } from "@/store/authStore"
import { formatCurrency } from "@/utils/date"

interface Record {
  id: string
  doctor_name: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  vital_bp: string | null
  vital_pulse: number | null
  vital_temp: number | null
  vital_weight: number | null
  prescriptions?: { drug_name: string; dosage: string; frequency: string; duration: string }[]
  created_at: string
}

export default function MedicalHistory() {
  const { user } = useAuthStore()
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    patientApi.getMyRecords().then(res => {
      const rows = res.data?.data
      setRecords(Array.isArray(rows) ? rows : [])
    }).catch(() => {
      toast.error("Failed to load history")
    }).finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">Medical History</h1>

      {records.length === 0 ? (
        <p className="text-muted-foreground">No medical records found</p>
      ) : (
        <div className="space-y-4">
          {records.map(rec => (
            <Card key={rec.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">{rec.doctor_name}</CardTitle>
                  <span className="text-xs text-muted-foreground sm:text-sm">
                    {new Date(rec.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {rec.assessment && (
                  <p className="text-sm"><strong>Diagnosis:</strong> {rec.assessment}</p>
                )}
                {(rec.prescriptions?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(rec.prescriptions ?? []).map((p, i) => (
                      <Badge key={i} variant="outline">{p.drug_name} {p.dosage}</Badge>
                    ))}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
                >
                  {expanded === rec.id ? "Hide Details" : "Show Details"}
                </Button>

                {expanded === rec.id && (
                  <div className="mt-3 space-y-3 text-sm border-t pt-3">
                    {(rec.vital_bp || rec.vital_pulse || rec.vital_temp) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {rec.vital_bp && <span>BP: {rec.vital_bp}</span>}
                        {rec.vital_pulse && <span>Pulse: {rec.vital_pulse}</span>}
                        {rec.vital_temp && <span>Temp: {rec.vital_temp}°F</span>}
                        {rec.vital_weight && <span>Weight: {rec.vital_weight}kg</span>}
                      </div>
                    )}
                    {rec.subjective && <div><strong>S:</strong> {rec.subjective}</div>}
                    {rec.objective && <div><strong>O:</strong> {rec.objective}</div>}
                    {rec.assessment && <div><strong>A:</strong> {rec.assessment}</div>}
                    {rec.plan && <div><strong>P:</strong> {rec.plan}</div>}
                    {(rec.prescriptions?.length ?? 0) > 0 && (
                      <div className="min-w-0 overflow-x-auto">
                        <strong>Prescriptions:</strong>
                        <table className="mt-1 w-full min-w-[280px] text-xs">
                          <thead><tr className="border-b"><th className="py-1 text-left">Drug</th><th>Dosage</th><th>Freq</th><th>Duration</th></tr></thead>
                          <tbody>
                            {(rec.prescriptions ?? []).map((p, i) => (
                              <tr key={i} className="border-b"><td className="py-1">{p.drug_name}</td><td>{p.dosage}</td><td>{p.frequency}</td><td>{p.duration}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full touch-manipulation sm:w-auto"
                      onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL}/api/v1/records/${rec.id}/prescription/pdf`, "_blank")}
                    >
                      Download Prescription PDF
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
