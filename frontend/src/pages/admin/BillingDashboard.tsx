import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import api from "@/api/client"
import { formatCurrency } from "@/utils/date"

interface Invoice {
  id: string
  invoice_number: string
  patient_name: string
  total_amount: number
  status: string
  created_at: string
  paid_at: string | null
}

export default function BillingDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    api.get("/api/v1/billing/all").then(res => {
      setInvoices(res.data.data)
    }).catch(() => toast.error("Failed to load invoices")).finally(() => setLoading(false))
  }, [])

  const filtered = filter === "all" ? invoices : invoices.filter(i => i.status === filter)
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.total_amount, 0)
  const outstanding = invoices.filter(i => i.status !== "paid").reduce((sum, i) => sum + i.total_amount, 0)

  const downloadPdf = (id: string) => {
    window.open(`${import.meta.env.VITE_API_BASE_URL}/api/v1/billing/invoice/${id}/pdf`, "_blank")
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {["all", "unpaid", "paid", "partial"].map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => (
            <Card key={inv.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{inv.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">{inv.patient_name} · {new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${inv.status !== "paid" ? "text-destructive" : ""}`}>
                    {formatCurrency(inv.total_amount)}
                  </span>
                  <Badge variant={inv.status === "paid" ? "secondary" : "destructive"}>{inv.status}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => downloadPdf(inv.id)}>PDF</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
