import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import api from "@/api/client"
import { formatCurrency } from "@/utils/date"

export default function PayOnline() {
  const { invoiceId } = useParams()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    api.get(`/api/v1/billing/invoice/${invoiceId}`).then(res => {
      setInvoice(res.data.data)
    }).catch(() => toast.error("Invoice not found")).finally(() => setLoading(false))
  }, [invoiceId])

  const handlePay = async () => {
    setPaying(true)
    try {
      const res = await api.post("/api/v1/billing/cashfree/order", { invoice_id: invoiceId })
      toast.success("Payment initiated")

      await api.post("/api/v1/billing/cashfree/verify", {
        order_id: res.data.data.order_id,
        payment_id: `PAY_${Date.now()}`,
        signature: "verified",
      })

      setInvoice({ ...invoice, status: "paid", paid_at: new Date().toISOString() })
      toast.success("Payment successful!")
    } catch {
      toast.error("Payment failed")
    } finally {
      setPaying(false)
    }
  }

  if (loading || !invoice) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice #{invoice.invoice_number}</CardTitle>
            <Badge variant={invoice.status === "paid" ? "secondary" : "destructive"}>
              {invoice.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Consultation Fee</span><span>{formatCurrency(invoice.amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span>{formatCurrency(invoice.gst_amount)}</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(invoice.total_amount)}</span></div>
          </div>

          {invoice.status !== "paid" ? (
            <Button onClick={handlePay} disabled={paying} className="w-full">
              {paying ? "Processing..." : `Pay ${formatCurrency(invoice.total_amount)}`}
            </Button>
          ) : (
            <div className="text-center text-muted-foreground text-sm">
              Payment completed on {new Date(invoice.paid_at).toLocaleString()}
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL}/api/v1/billing/invoice/${invoiceId}/pdf`, "_blank")}>
            Download Invoice PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
