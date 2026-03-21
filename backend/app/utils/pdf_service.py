import io
from datetime import datetime
from uuid import UUID

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from app.firestore_store import Store


def generate_prescription_pdf(store: Store, record_id: UUID) -> io.BytesIO:
    record = store.record_get(str(record_id))
    if not record:
        raise ValueError("Record not found")

    doctor = store.doctor_get(record["doctor_id"])
    doc_user = store.user_get(doctor["user_id"]) if doctor else None
    patient = store.patient_get(record["patient_id"])
    pat_user = store.user_get(patient["user_id"]) if patient else None
    prescriptions = store.prescriptions_for_record(str(record_id))

    created = record.get("created_at") or ""
    try:
        if "T" in str(created):
            dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
            rec_date = dt.strftime("%d-%m-%Y")
        else:
            rec_date = str(created)[:10]
    except Exception:
        rec_date = ""

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    c.setFont("Helvetica-Bold", 16)
    c.drawString(2 * cm, h - 2 * cm, "Clinic Platform")
    c.setFont("Helvetica", 9)
    c.drawString(2 * cm, h - 2.6 * cm, "Healthcare Management System")

    c.setLineWidth(1)
    c.line(2 * cm, h - 3 * cm, w - 2 * cm, h - 3 * cm)

    y = h - 3.8 * cm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(2 * cm, y, f"Dr. {doc_user.get('name') if doc_user else 'N/A'}")
    y -= 0.4 * cm
    c.setFont("Helvetica", 9)
    if doctor:
        c.drawString(
            2 * cm,
            y,
            f"{doctor.get('qualification') or ''} | {doctor.get('specialization') or ''}",
        )
    y -= 0.6 * cm

    c.setFont("Helvetica", 9)
    c.drawString(2 * cm, y, f"Patient: {pat_user.get('name') if pat_user else 'N/A'}")
    if patient and patient.get("date_of_birth"):
        c.drawString(10 * cm, y, f"DOB: {patient['date_of_birth'][:10]}")
    if patient and patient.get("gender"):
        c.drawString(15 * cm, y, f"Gender: {patient['gender']}")
    y -= 0.4 * cm
    c.drawString(2 * cm, y, f"Date: {rec_date}")

    y -= 1 * cm

    for field, label in [
        ("subjective", "Subjective"),
        ("objective", "Objective"),
        ("assessment", "Assessment"),
        ("plan", "Plan"),
    ]:
        val = record.get(field)
        if val:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(2 * cm, y, label)
            y -= 0.4 * cm
            c.setFont("Helvetica", 9)
            for line in _wrap_text(str(val), 70):
                c.drawString(2.5 * cm, y, line)
                y -= 0.35 * cm
            y -= 0.3 * cm

    if prescriptions:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(2 * cm, y, "Rx")
        y -= 0.6 * cm

        c.setFont("Helvetica-Bold", 9)
        c.drawString(2.5 * cm, y, "Drug")
        c.drawString(7 * cm, y, "Dosage")
        c.drawString(10 * cm, y, "Frequency")
        c.drawString(13 * cm, y, "Duration")
        y -= 0.2 * cm
        c.setLineWidth(0.5)
        c.line(2 * cm, y, w - 2 * cm, y)
        y -= 0.4 * cm

        c.setFont("Helvetica", 9)
        for p in prescriptions:
            c.drawString(2.5 * cm, y, (p.get("drug_name") or "")[:20])
            c.drawString(7 * cm, y, p.get("dosage") or "")
            c.drawString(10 * cm, y, p.get("frequency") or "")
            c.drawString(13 * cm, y, p.get("duration") or "")
            if p.get("instructions"):
                y -= 0.3 * cm
                c.setFont("Helvetica-Oblique", 8)
                c.drawString(3 * cm, y, f"  {p['instructions']}")
                c.setFont("Helvetica", 9)
            y -= 0.5 * cm
            if y < 4 * cm:
                c.showPage()
                y = h - 3 * cm

    y -= 2 * cm
    c.line(2 * cm, y, 6 * cm, y)
    c.drawString(2 * cm, y - 0.4 * cm, "Doctor's Signature")

    c.showPage()
    c.save()

    buffer.seek(0)
    return buffer


def _wrap_text(text: str, max_chars: int) -> list:
    words = text.split()
    lines = []
    current = ""
    for word in words:
        if len(current) + len(word) + 1 <= max_chars:
            current += (" " if current else "") + word
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]
