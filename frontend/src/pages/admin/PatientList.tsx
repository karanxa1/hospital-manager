import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { patientApi } from "@/api/patients"

interface Patient {
  id: string
  user_name: string
  user_email: string
  user_phone: string | null
  date_of_birth: string | null
  gender: string | null
  blood_group: string | null
  created_at: string
}

export default function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchPatients = async () => {
    try {
      const res = await patientApi.list(search || undefined)
      setPatients(res.data.data)
    } catch {
      toast.error("Failed to load patients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [search])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-muted-foreground text-sm">Search and manage patient records</p>
      </div>

      <Input
        placeholder="Search by name or phone..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

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
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Blood</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No patients found.
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.user_name}</TableCell>
                      <TableCell>{p.user_phone || "—"}</TableCell>
                      <TableCell>{p.date_of_birth || "—"}</TableCell>
                      <TableCell>{p.gender ? <Badge variant="secondary">{p.gender}</Badge> : "—"}</TableCell>
                      <TableCell>{p.blood_group || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
