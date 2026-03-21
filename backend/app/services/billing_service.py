import io
from datetime import datetime
from uuid import UUID

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from app.firestore_store import Store


def generate_invoice_number(store: Store) -> str:
    return store.next_invoice_number()


def generate_invoice_pdf(store: Store, invoice_id: UUID) -> io.BytesIO:
    invoice = store.invoice_get(str(invoice_id))
    if not invoice:
        raise ValueError("Invoice not found")

    patient = store.patient_get(invoice["patient_id"])
    pat_user = store.user_get(patient["user_id"]) if patient else None

    created = invoice.get("created_at") or ""
    try:
        if "T" in created:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            date_str = dt.strftime("%d-%m-%Y")
        else:
            date_str = created[:10]
    except Exception:
        date_str = str(created)[:10]

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    c.setFont("Helvetica-Bold", 16)
    c.drawString(2 * cm, h - 2 * cm, "Clinic Platform")
    c.setFont("Helvetica", 9)
    c.drawString(2 * cm, h - 2.6 * cm, "Invoice")

    c.setLineWidth(1)
    c.line(2 * cm, h - 3 * cm, w - 2 * cm, h - 3 * cm)

    y = h - 3.8 * cm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, f"Invoice #{invoice['invoice_number']}")
    y -= 0.5 * cm
    c.setFont("Helvetica", 9)
    c.drawString(2 * cm, y, f"Date: {date_str}")
    c.drawString(12 * cm, y, f"Status: {str(invoice.get('status', '')).upper()}")
    y -= 0.8 * cm

    c.drawString(2 * cm, y, f"Patient: {pat_user.get('name') if pat_user else 'N/A'}")
    y -= 1.5 * cm

    c.setFont("Helvetica-Bold", 10)
    c.drawString(2 * cm, y, "Description")
    c.drawString(12 * cm, y, "Amount")
    y -= 0.3 * cm
    c.line(2 * cm, y, w - 2 * cm, y)
    y -= 0.5 * cm

    c.setFont("Helvetica", 9)
    c.drawString(2 * cm, y, "Consultation Fee")
    c.drawString(12 * cm, y, f"₹ {invoice.get('amount', 0)}")
    y -= 0.5 * cm
    c.drawString(2 * cm, y, "GST (18%)")
    c.drawString(12 * cm, y, f"₹ {invoice.get('gst_amount', 0)}")
    y -= 0.3 * cm
    c.line(11 * cm, y, w - 2 * cm, y)
    y -= 0.5 * cm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(2 * cm, y, "Total")
    c.drawString(12 * cm, y, f"₹ {invoice.get('total_amount', 0)}")

    y -= 2 * cm
    if invoice.get("status") == "paid":
        c.setFont("Helvetica-Bold", 14)
        c.setFillColorRGB(0, 0.6, 0)
        c.drawString(10 * cm, y, "PAID")
        c.setFillColorRGB(0, 0, 0)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
