import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { patientApi } from "@/api/patients"
import { useAuthStore } from "@/store/authStore"

export default function PatientView() {
  const { user } = useAuthStore()
  const [patients, setPatients] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await patientApi.list(search || undefined)
        setPatients(res.data.data)
      } catch {
        toast.error("Failed to load patients")
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [search])

  const selectPatient = async (id: string) => {
    try {
      const [profileRes, recordsRes] = await Promise.all([
        patientApi.get(id),
        patientApi.getRecords(id),
      ])
      setSelected(profileRes.data.data)
      setRecords(recordsRes.data.data)
    } catch {
      toast.error("Failed to load patient details")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Patient Records</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-3">
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Search patients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-1 max-h-[70vh] overflow-auto">
              {patients.map(p => (
                <button
                  key={p.id}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selected?.id === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                  onClick={() => selectPatient(p.id)}
                >
                  <p className="font-medium">{p.user_name}</p>
                  <p className="text-xs opacity-70">{p.user_phone || p.user_email}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2">
          {!selected ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Select a patient to view records
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{selected.user_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">DOB</p>
                      <p className="font-medium">{selected.date_of_birth || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium">{selected.gender || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Blood Group</p>
                      <p className="font-medium">{selected.blood_group || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Allergies</p>
                      <p className="font-medium">{selected.allergies || "None"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Chronic</p>
                      <p className="font-medium">{selected.chronic_conditions || "None"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h3 className="font-semibold">Medical History</h3>
                {records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No records found</p>
                ) : (
                  records.map(rec => (
                    <Card key={rec.id}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{rec.doctor_name}</span>
                          <span className="text-xs text-muted-foreground">{new Date(rec.created_at).toLocaleDateString()}</span>
                        </div>
                        {rec.assessment && <p className="text-sm"><strong>Diagnosis:</strong> {rec.assessment}</p>}
                        {rec.prescriptions?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Prescriptions:</p>
                            {rec.prescriptions.map((p: any, i: number) => (
                              <Badge key={i} variant="outline" className="mr-1 mt-1">{p.drug_name} — {p.dosage}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
