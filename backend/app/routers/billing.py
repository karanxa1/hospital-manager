import os
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.auth.dependencies import get_current_user, require_admin_or_doctor
from app.domain_types import User, UserRole
from app.fs_client import get_store
from app.firestore_store import Store
from app.schemas.billing import CashfreeOrderRequest, CashfreeVerifyRequest, InvoiceCreate
from app.services.billing_service import generate_invoice_number, generate_invoice_pdf

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

GST_RATE = Decimal("0.18")
CASHFREE_CLIENT_ID = os.getenv("CASHFREE_CLIENT_ID", "")
CASHFREE_CLIENT_SECRET = os.getenv("CASHFREE_CLIENT_SECRET", "")
CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg"


def _verify_cashfree_payment(order_id: str, payment_id: str) -> dict:
    if not CASHFREE_CLIENT_ID or not CASHFREE_CLIENT_SECRET:
        return {"success": True, "status": "PAID", "amount": 0}
    try:
        resp = httpx.get(
            f"{CASHFREE_BASE_URL}/orders/{order_id}/payments",
            headers={
                "x-client-id": CASHFREE_CLIENT_ID,
                "x-client-secret": CASHFREE_CLIENT_SECRET,
                "x-api-version": "2023-08-01",
            },
            timeout=10,
        )
        data = resp.json()
        for payment in data.get("payments", []):
            if (
                payment.get("cf_payment_id") == payment_id
                and payment.get("payment_status") == "SUCCESS"
            ):
                return {
                    "success": True,
                    "status": "PAID",
                    "amount": payment.get("payment_amount", 0),
                }
        return {"success": False, "status": "FAILED"}
    except Exception as e:
        return {"success": False, "status": "ERROR", "detail": str(e)}


def _invoice_json(inv: dict) -> dict:
    return {
        "id": inv["id"],
        "invoice_number": inv.get("invoice_number"),
        "amount": float(inv.get("amount") or 0),
        "gst_amount": float(inv.get("gst_amount") or 0),
        "total_amount": float(inv.get("total_amount") or 0),
        "status": inv.get("status"),
        "due_date": inv.get("due_date"),
        "paid_at": inv.get("paid_at"),
        "created_at": inv.get("created_at") or "",
    }


@router.post("/invoice", response_model=dict)
def create_invoice(
    body: InvoiceCreate,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    appt = store.appointment_get(str(body.appointment_id))
    if not appt:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Appointment not found"},
        )
    if store.invoice_by_appointment(str(body.appointment_id)):
        raise HTTPException(
            status_code=400,
            detail={"success": False, "message": "Invoice already exists"},
        )
    amount = Decimal(str(body.amount))
    gst = (amount * GST_RATE).quantize(Decimal("0.01"))
    total = (amount + gst).quantize(Decimal("0.01"))
    iid = store.invoice_create(
        {
            "appointment_id": str(body.appointment_id),
            "patient_id": appt["patient_id"],
            "invoice_number": generate_invoice_number(store),
            "amount": float(amount),
            "gst_amount": float(gst),
            "total_amount": float(total),
            "status": "unpaid",
            "due_date": date.today().isoformat(),
        }
    )
    inv = store.invoice_get(iid)
    return {
        "success": True,
        "data": {
            "id": iid,
            "invoice_number": inv.get("invoice_number"),
            "amount": float(amount),
            "gst_amount": float(gst),
            "total_amount": float(total),
            "status": inv.get("status"),
        },
        "message": "Invoice created",
    }


@router.get("/invoice/{invoice_id}", response_model=dict)
def get_invoice(
    invoice_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    invoice = store.invoice_get(str(invoice_id))
    if not invoice:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Invoice not found"}
        )
    if current_user.role == UserRole.patient:
        patient = store.patient_get(invoice["patient_id"])
        if not patient or str(patient.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=403, detail={"success": False, "message": "Access denied"}
            )
    return {
        "success": True,
        "data": _invoice_json(invoice),
        "message": "Invoice fetched",
    }


@router.get("/patient/{patient_id}", response_model=dict)
def get_patient_invoices(
    patient_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    patient = store.patient_get(str(patient_id))
    if not patient:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Patient not found"}
        )
    if current_user.role == UserRole.patient and str(patient.get("user_id")) != str(current_user.id):
        raise HTTPException(
            status_code=403, detail={"success": False, "message": "Access denied"}
        )
    invoices = store.invoices_for_patient(str(patient_id))
    return {
        "success": True,
        "data": [_invoice_json(i) for i in invoices],
        "message": "Invoices fetched",
    }


@router.post("/cashfree/order", response_model=dict)
def create_cashfree_order(
    body: CashfreeOrderRequest,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    invoice = store.invoice_get(str(body.invoice_id))
    if not invoice:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Invoice not found"}
        )
    if current_user.role == UserRole.patient:
        patient = store.patient_get(invoice["patient_id"])
        if not patient or str(patient.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=403, detail={"success": False, "message": "Access denied"}
            )
    order_id = f"ORDER_{uuid.uuid4().hex[:12]}"
    store.invoice_update(str(body.invoice_id), {"cashfree_order_id": order_id})
    return {
        "success": True,
        "data": {
            "order_id": order_id,
            "amount": float(invoice.get("total_amount") or 0),
            "currency": "INR",
        },
        "message": "Cashfree order created",
    }


@router.post("/cashfree/verify", response_model=dict)
def verify_cashfree_payment(
    body: CashfreeVerifyRequest,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    invoice = None
    for inv in store.invoices_all():
        if inv.get("cashfree_order_id") == body.order_id:
            invoice = inv
            break
    if not invoice:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Invoice not found"}
        )
    if current_user.role == UserRole.patient:
        patient = store.patient_get(invoice["patient_id"])
        if not patient or str(patient.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=403, detail={"success": False, "message": "Access denied"}
            )
    verification = _verify_cashfree_payment(body.order_id, body.payment_id)
    if not verification["success"]:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": "Payment verification failed",
                "detail": verification.get("status"),
            },
        )
    paid_at = datetime.now(timezone.utc).isoformat()
    store.invoice_update(
        invoice["id"],
        {
            "status": "paid",
            "cashfree_payment_id": body.payment_id,
            "paid_at": paid_at,
        },
    )
    appt_id = invoice.get("appointment_id")
    if appt_id:
        store.appointment_update(str(appt_id), {"payment_status": "paid"})
    return {
        "success": True,
        "data": {"id": invoice["id"], "status": "paid"},
        "message": "Payment verified",
    }


@router.get("/invoice/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    invoice = store.invoice_get(str(invoice_id))
    if not invoice:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Invoice not found"}
        )
    if current_user.role == UserRole.patient:
        patient = store.patient_get(invoice["patient_id"])
        if not patient or str(patient.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=403, detail={"success": False, "message": "Access denied"}
            )
    try:
        pdf_buffer = generate_invoice_pdf(store, invoice_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail={"success": False, "message": str(e)})
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=invoice_{invoice_id}.pdf"},
    )


@router.get("/all", response_model=dict)
def list_all_invoices(
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    result = []
    for inv in sorted(store.invoices_all(), key=lambda x: x.get("created_at") or "", reverse=True):
        patient = store.patient_get(inv["patient_id"])
        pat_user = store.user_get(patient["user_id"]) if patient else None
        result.append(
            {
                "id": inv["id"],
                "invoice_number": inv.get("invoice_number"),
                "patient_name": pat_user.get("name") if pat_user else "",
                "amount": float(inv.get("amount") or 0),
                "gst_amount": float(inv.get("gst_amount") or 0),
                "total_amount": float(inv.get("total_amount") or 0),
                "status": inv.get("status"),
                "due_date": inv.get("due_date"),
                "paid_at": inv.get("paid_at"),
                "created_at": inv.get("created_at") or "",
            }
        )
    return {"success": True, "data": result, "message": "Invoices fetched"}
